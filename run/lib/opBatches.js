const { ethers } = require('ethers');
const fetch = require('node-fetch');
const zlib = require('zlib');
const { RLP } = require('@ethersproject/rlp');
const { Op } = require('sequelize');
const logger = require('./logger');

/**
 * OP Stack Batch Parsing Library
 *
 * Handles parsing of batch data submitted to the BatchInbox address.
 * Batches can be submitted as:
 * 1. Calldata (legacy) - batch data directly in transaction input
 * 2. EIP-4844 Blobs - batch data in blob sidecars
 *
 * Batch format follows the OP Stack derivation spec:
 * https://specs.optimism.io/protocol/derivation.html
 * https://specs.optimism.io/protocol/delta/span-batches.html
 */

// Channel frame header size: channel_id (16) + frame_number (2) + frame_data_length (4) + is_last (1)
const FRAME_HEADER_SIZE = 23;

// Derivation version byte
const DERIVATION_VERSION_0 = 0;

// Channel compression versions
const CHANNEL_VERSION_ZLIB = 0x00;
const CHANNEL_VERSION_BROTLI = 0x01;

// Batch type bytes
const BATCH_TYPE_SINGULAR = 0x00;
const BATCH_TYPE_SPAN = 0x01;

// Span batch header field sizes
const PARENT_CHECK_BYTES = 20;      // First 20 bytes of parent L2 block hash
const L1_ORIGIN_CHECK_BYTES = 20;   // First 20 bytes of L1 origin hash
const DEFAULT_L2_BLOCK_TIME = 2;    // Default L2 block time in seconds

// EIP-4844 Blob versioned hash constants
// See: https://eips.ethereum.org/EIPS/eip-4844#helpers
const VERSIONED_HASH_VERSION_KZG = 0x01;  // Version byte for KZG commitments
const SHA256_HASH_LENGTH_HEX = 64;         // SHA-256 produces 32 bytes = 64 hex chars
const VERSIONED_HASH_LENGTH_BYTES = 32;    // 1 version byte + 31 hash bytes
const VERSIONED_HASH_HASH_BYTES = 31;      // Bytes of hash to include (31 of 32)

/**
 * Check if a transaction is a batch submission to the BatchInbox
 * @param {Object} tx - Transaction object
 * @param {string} batchInboxAddress - The BatchInbox address for this chain
 * @returns {boolean}
 */
const isBatchTransaction = (tx, batchInboxAddress) => {
    if (!tx.to || !batchInboxAddress) return false;
    return tx.to.toLowerCase() === batchInboxAddress.toLowerCase();
};

/**
 * Check if a transaction uses EIP-4844 blob data
 * @param {Object} tx - Transaction object
 * @returns {boolean}
 */
const isBlobTransaction = (tx) => {
    // Type 3 transactions are EIP-4844 blob transactions
    return tx.type === 3 || tx.type === '0x3';
};

/**
 * Parse channel frames from batch calldata
 * @param {string} calldata - Hex-encoded calldata
 * @returns {Array} Array of parsed frames
 */
const parseFramesFromCalldata = (calldata) => {
    const frames = [];
    const data = calldata.startsWith('0x') ? calldata.slice(2) : calldata;

    // Check derivation version
    const version = parseInt(data.slice(0, 2), 16);
    if (version !== DERIVATION_VERSION_0) {
        // Unknown version, return empty
        return frames;
    }

    let offset = 2; // Skip version byte (1 byte = 2 hex chars)

    while (offset < data.length) {
        // Need at least frame header
        if (offset + FRAME_HEADER_SIZE * 2 > data.length) break;

        // Parse frame header
        const channelId = '0x' + data.slice(offset, offset + 32);
        offset += 32;

        const frameNumber = parseInt(data.slice(offset, offset + 4), 16);
        offset += 4;

        const frameDataLength = parseInt(data.slice(offset, offset + 8), 16);
        offset += 8;

        // Check if we have enough data
        if (offset + frameDataLength * 2 + 2 > data.length) break;

        const frameData = '0x' + data.slice(offset, offset + frameDataLength * 2);
        offset += frameDataLength * 2;

        const isLast = data.slice(offset, offset + 2) === '01';
        offset += 2;

        frames.push({
            channelId,
            frameNumber,
            frameDataLength,
            frameData,
            isLast
        });
    }

    return frames;
};

/**
 * Fetch blob data from a beacon node
 * Note: Blobs are only available for ~18 days before pruning
 * @param {string} beaconUrl - Beacon node API URL
 * @param {string} slot - Slot number or 'head'
 * @param {Array} blobHashes - Array of versioned blob hashes to fetch
 * @returns {Promise<Array>} Array of blob data
 */
const fetchBlobsFromBeacon = async (beaconUrl, slot, blobHashes) => {
    try {
        const response = await fetch(`${beaconUrl}/eth/v1/beacon/blob_sidecars/${slot}`);
        if (!response.ok) {
            throw new Error(`Beacon API error: ${response.status}`);
        }

        const result = await response.json();
        const blobs = [];

        for (const sidecar of result.data || []) {
            const blobHash = computeBlobVersionedHash(sidecar.kzg_commitment);
            if (blobHashes.includes(blobHash)) {
                blobs.push({
                    blobHash,
                    data: sidecar.blob,
                    kzgCommitment: sidecar.kzg_commitment,
                    kzgProof: sidecar.kzg_proof
                });
            }
        }

        return blobs;
    } catch (error) {
        console.error('Error fetching blobs:', error);
        return [];
    }
};

/**
 * Compute the versioned hash from a KZG commitment
 * @param {string} kzgCommitment - The KZG commitment (hex string)
 * @returns {string} Versioned hash
 */
const computeBlobVersionedHash = (kzgCommitment) => {
    const commitment = kzgCommitment.startsWith('0x') ? kzgCommitment : '0x' + kzgCommitment;
    // EIP-4844 uses SHA-256 for versioned hashes, not keccak256
    const hash = ethers.utils.sha256(commitment);
    // Remove 0x prefix if present
    const hashWithoutPrefix = hash.startsWith('0x') ? hash.slice(2) : hash;
    // Versioned hash = version byte + first 31 bytes of SHA-256 hash
    // Result: 0x + version (2 hex) + 31 bytes (62 hex) = 66 chars total
    const versionHex = VERSIONED_HASH_VERSION_KZG.toString(16).padStart(2, '0');
    const truncatedHash = hashWithoutPrefix.slice(0, VERSIONED_HASH_HASH_BYTES * 2);
    return '0x' + versionHex + truncatedHash;
};

/**
 * Parse batch data to extract L2 block information
 * This is a simplified parser - full parsing requires decompression
 * @param {string} batchData - Raw batch data (calldata or blob)
 * @returns {Object} Parsed batch info with L2 block range estimates
 */
const parseBatchData = (batchData) => {
    const data = batchData.startsWith('0x') ? batchData.slice(2) : batchData;

    // The batch data is typically compressed (zlib or brotli)
    // For now, we estimate based on data size
    // A more complete implementation would decompress and parse the channel data

    const dataSize = data.length / 2; // bytes

    // Rough estimate: each L2 block takes ~100-500 bytes depending on tx count
    // This is a placeholder - real implementation needs decompression
    const estimatedBlocks = Math.max(1, Math.floor(dataSize / 200));

    return {
        dataSize,
        compressed: true,
        estimatedBlockCount: estimatedBlocks
    };
};

/**
 * Reassemble channel data from frames
 * Frames must be from the same channel (same channelId)
 * @param {Array} frames - Array of parsed frames
 * @returns {Buffer|null} Complete channel data or null if incomplete
 */
const reassembleChannel = (frames) => {
    if (!frames || frames.length === 0) return null;

    // Check if we have a complete channel (must have isLast frame)
    const hasLastFrame = frames.some(f => f.isLast);
    if (!hasLastFrame) return null;

    // Sort frames by frame number
    const sortedFrames = [...frames].sort((a, b) => a.frameNumber - b.frameNumber);

    // Verify we have a contiguous sequence starting from 0
    for (let i = 0; i < sortedFrames.length; i++) {
        if (sortedFrames[i].frameNumber !== i) {
            // Missing frame in sequence
            return null;
        }
    }

    // Concatenate frame data
    const buffers = sortedFrames.map(f => {
        const data = f.frameData.startsWith('0x') ? f.frameData.slice(2) : f.frameData;
        return Buffer.from(data, 'hex');
    });

    return Buffer.concat(buffers);
};

/**
 * Decompress channel data based on version byte
 * @param {Buffer} channelData - Raw channel data (first byte is version)
 * @returns {Buffer|null} Decompressed batch data or null on failure
 */
const decompressChannelData = (channelData) => {
    if (!channelData || channelData.length === 0) return null;

    const versionByte = channelData[0];
    const compressedData = channelData.slice(1);

    try {
        if (versionByte === CHANNEL_VERSION_ZLIB) {
            // zlib decompression (legacy)
            return zlib.inflateSync(compressedData);
        } else if (versionByte === CHANNEL_VERSION_BROTLI) {
            // brotli decompression (Fjord+)
            return zlib.brotliDecompressSync(compressedData);
        } else {
            // Unknown version
            return null;
        }
    } catch (error) {
        // Decompression failed
        return null;
    }
};

/**
 * Read an unsigned varint (Base128) from a buffer
 * Used for parsing span batch fields
 * @param {Buffer} buffer - Data buffer
 * @param {number} offset - Starting offset
 * @returns {Object} { value: number, bytesRead: number }
 */
const readVarint = (buffer, offset) => {
    let value = 0;
    let bytesRead = 0;
    let shift = 0;

    while (offset + bytesRead < buffer.length) {
        const byte = buffer[offset + bytesRead];
        bytesRead++;

        value |= (byte & 0x7F) << shift;
        shift += 7;

        if ((byte & 0x80) === 0) {
            break;
        }

        // Prevent overflow for very large varints
        if (bytesRead > 10) {
            throw new Error('Varint too long');
        }
    }

    return { value, bytesRead };
};

/**
 * Parse span batch header to extract block count and timestamps
 * Span batch format (after type byte):
 * - rel_timestamp (varint)
 * - l1_origin_num (varint)
 * - parent_check (20 bytes)
 * - l1_origin_check (20 bytes)
 * - block_count (varint)
 * @param {Buffer} batchData - Decompressed batch data (after type byte)
 * @returns {Object|null} Parsed header or null on failure
 */
const parseSpanBatchHeader = (batchData) => {
    try {
        let offset = 0;

        // rel_timestamp (varint)
        const relTimestamp = readVarint(batchData, offset);
        offset += relTimestamp.bytesRead;

        // l1_origin_num (varint)
        const l1OriginNum = readVarint(batchData, offset);
        offset += l1OriginNum.bytesRead;

        // parent_check (PARENT_CHECK_BYTES bytes)
        if (offset + PARENT_CHECK_BYTES > batchData.length) return null;
        const parentCheck = '0x' + batchData.slice(offset, offset + PARENT_CHECK_BYTES).toString('hex');
        offset += PARENT_CHECK_BYTES;

        // l1_origin_check (L1_ORIGIN_CHECK_BYTES bytes)
        if (offset + L1_ORIGIN_CHECK_BYTES > batchData.length) return null;
        const l1OriginCheck = '0x' + batchData.slice(offset, offset + L1_ORIGIN_CHECK_BYTES).toString('hex');
        offset += L1_ORIGIN_CHECK_BYTES;

        // block_count (varint)
        const blockCount = readVarint(batchData, offset);
        offset += blockCount.bytesRead;

        return {
            relTimestamp: relTimestamp.value,
            l1OriginNum: l1OriginNum.value,
            parentCheck,
            l1OriginCheck,
            blockCount: blockCount.value
        };
    } catch (error) {
        logger.warn('Failed to parse span batch header', { location: 'lib.opBatches.parseSpanBatchHeader', error: error.message });
        return null;
    }
};

/**
 * Parse singular batch (v0) header
 * Singular batch format (RLP encoded):
 * [parent_hash, epoch_number, epoch_hash, timestamp, transaction_list]
 * @param {Buffer} batchData - Decompressed batch data (after type byte)
 * @returns {Object|null} Parsed header or null on failure
 */
const parseSingularBatchHeader = (batchData) => {
    try {
        // Singular batches are RLP encoded
        const decoded = RLP.decode('0x' + batchData.toString('hex'));

        if (!Array.isArray(decoded) || decoded.length < 4) {
            logger.warn('Invalid singular batch format', { location: 'lib.opBatches.parseSingularBatchHeader', decodedLength: decoded?.length });
            return null;
        }

        const [parentHash, epochNumber, epochHash, timestamp] = decoded;

        return {
            parentHash,
            epochNumber: parseInt(epochNumber, 16),
            epochHash,
            timestamp: parseInt(timestamp, 16),
            blockCount: 1 // Singular batch = 1 block
        };
    } catch (error) {
        logger.warn('Failed to parse singular batch header', { location: 'lib.opBatches.parseSingularBatchHeader', error: error.message });
        return null;
    }
};

/**
 * Find L2 block by timestamp from database
 * @param {number} workspaceId - L2 workspace ID
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {Promise<number|null>} Block number or null
 */
const findL2BlockByTimestamp = async (workspaceId, timestamp) => {
    try {
        // Lazy load to avoid circular dependency
        const { Block } = require('../models');

        const block = await Block.findOne({
            where: {
                workspaceId,
                timestamp: { [Op.lte]: new Date(timestamp * 1000) }
            },
            order: [['timestamp', 'DESC']],
            attributes: ['number', 'timestamp'],
            limit: 1
        });

        return block ? block.number : null;
    } catch (error) {
        logger.warn('Failed to find L2 block by timestamp', { location: 'lib.opBatches.findL2BlockByTimestamp', workspaceId, timestamp, error: error.message });
        return null;
    }
};

/**
 * Extract L2 block range from parsed batch frames
 * Parses channel data, decompresses, and extracts block count
 * @param {Array} frames - Parsed channel frames
 * @param {Object} options - Options for block calculation
 * @param {number} options.workspaceId - L2 workspace ID for DB lookup
 * @param {number} options.l1Timestamp - L1 block timestamp (Unix seconds)
 * @param {number} options.l2BlockTime - L2 block time in seconds (default: 2)
 * @param {number} options.l2GenesisTimestamp - Optional L2 genesis timestamp
 * @returns {Promise<Object|null>} { start, end, blockCount } or null if unable to parse
 */
const extractL2BlockRange = async (frames, options = {}) => {
    const { workspaceId, l1Timestamp, l2BlockTime = DEFAULT_L2_BLOCK_TIME, l2GenesisTimestamp } = options;

    // 1. Reassemble channel from frames
    const channelData = reassembleChannel(frames);
    if (!channelData) return null;

    // 2. Decompress channel data
    const batchData = decompressChannelData(channelData);
    if (!batchData || batchData.length === 0) return null;

    // 3. Parse batch type and header
    const batchType = batchData[0];
    let blockCount = 1;
    let batchTimestamp = l1Timestamp;

    if (batchType === BATCH_TYPE_SPAN) {
        const header = parseSpanBatchHeader(batchData.slice(1));
        if (!header) return null;

        blockCount = header.blockCount;
        // For span batches, rel_timestamp is relative to genesis
        // We use l1Timestamp as approximation since we may not have genesis
        if (l2GenesisTimestamp) {
            batchTimestamp = l2GenesisTimestamp + header.relTimestamp;
        }
    } else if (batchType === BATCH_TYPE_SINGULAR) {
        const header = parseSingularBatchHeader(batchData.slice(1));
        if (!header) return null;

        blockCount = 1;
        batchTimestamp = header.timestamp || l1Timestamp;
    } else {
        // Unknown batch type
        return null;
    }

    // 4. Calculate L2 block range
    let l2BlockStart = null;

    // Try database lookup first
    if (workspaceId && batchTimestamp) {
        l2BlockStart = await findL2BlockByTimestamp(workspaceId, batchTimestamp);
    }

    // If we have a starting block, calculate the range
    if (l2BlockStart !== null) {
        return {
            start: l2BlockStart,
            end: l2BlockStart + blockCount - 1,
            blockCount
        };
    }

    // Return blockCount even if we can't determine exact blocks
    // This allows backfilling later
    return {
        start: null,
        end: null,
        blockCount
    };
};

/**
 * Get batch info from a transaction
 * @param {Object} tx - Transaction object
 * @param {Object} options - Options for batch parsing
 * @param {string} options.batchInboxAddress - BatchInbox contract address
 * @param {string} options.beaconUrl - Beacon node URL for blob fetching
 * @param {number} options.workspaceId - L2 workspace ID for block lookup
 * @param {number} options.l1Timestamp - L1 block timestamp (Unix seconds)
 * @param {number} options.l2BlockTime - L2 block time in seconds
 * @returns {Promise<Object>} Batch information
 */
const getBatchInfo = async (tx, options = {}) => {
    const { batchInboxAddress, beaconUrl, workspaceId, l1Timestamp, l2BlockTime } = options;

    if (!isBatchTransaction(tx, batchInboxAddress)) {
        return null;
    }

    const batchInfo = {
        l1TransactionHash: tx.hash,
        l1BlockNumber: tx.blockNumber,
        l1TransactionIndex: tx.transactionIndex,
        timestamp: tx.timestamp,
        isBlob: isBlobTransaction(tx),
        blobHash: null,
        blobData: null,
        l2BlockStart: null,
        l2BlockEnd: null,
        blockCount: null
    };

    // Options to pass to extractL2BlockRange
    const extractOptions = {
        workspaceId,
        l1Timestamp: l1Timestamp || tx.timestamp,
        l2BlockTime: l2BlockTime || 2
    };

    if (batchInfo.isBlob) {
        // EIP-4844 blob transaction
        if (tx.blobVersionedHashes && tx.blobVersionedHashes.length > 0) {
            batchInfo.blobHash = tx.blobVersionedHashes[0];

            // Attempt to fetch blob data if beacon URL is available
            if (beaconUrl && tx.slot) {
                const blobs = await fetchBlobsFromBeacon(beaconUrl, tx.slot, tx.blobVersionedHashes);
                if (blobs.length > 0) {
                    batchInfo.blobData = blobs[0].data;
                    // Parse blob data as frames and extract block range
                    const frames = parseFramesFromCalldata(blobs[0].data);
                    if (frames.length > 0) {
                        const blockRange = await extractL2BlockRange(frames, extractOptions);
                        if (blockRange) {
                            batchInfo.l2BlockStart = blockRange.start;
                            batchInfo.l2BlockEnd = blockRange.end;
                            batchInfo.blockCount = blockRange.blockCount;
                        }
                    }
                }
            }
        }
    } else {
        // Calldata transaction
        if (tx.input && tx.input !== '0x') {
            const frames = parseFramesFromCalldata(tx.input);
            batchInfo.frameCount = frames.length;

            // Try to extract L2 block range
            const blockRange = await extractL2BlockRange(frames, extractOptions);
            if (blockRange) {
                batchInfo.l2BlockStart = blockRange.start;
                batchInfo.l2BlockEnd = blockRange.end;
                batchInfo.blockCount = blockRange.blockCount;
            }
        }
    }

    return batchInfo;
};

/**
 * Generate the standard BatchInbox address for a chain
 * Format: 0xff00000000000000000000000000000000{chainId}
 * @param {number} chainId - The L2 chain ID
 * @returns {string} BatchInbox address
 */
const getBatchInboxAddress = (chainId) => {
    const chainIdHex = chainId.toString(16).padStart(4, '0');
    return `0xff0000000000000000000000000000000000${chainIdHex}`.toLowerCase();
};

module.exports = {
    isBatchTransaction,
    isBlobTransaction,
    parseFramesFromCalldata,
    fetchBlobsFromBeacon,
    computeBlobVersionedHash,
    parseBatchData,
    reassembleChannel,
    decompressChannelData,
    readVarint,
    parseSpanBatchHeader,
    parseSingularBatchHeader,
    findL2BlockByTimestamp,
    extractL2BlockRange,
    getBatchInfo,
    getBatchInboxAddress,
    DERIVATION_VERSION_0,
    CHANNEL_VERSION_ZLIB,
    CHANNEL_VERSION_BROTLI,
    BATCH_TYPE_SINGULAR,
    BATCH_TYPE_SPAN
};
