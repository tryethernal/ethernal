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

// Ethereum mainnet Beacon Chain genesis timestamp and slot time
// Beacon Chain genesis: Dec 1, 2020, 12:00:23 PM UTC
const ETHEREUM_BEACON_GENESIS_TIMESTAMP = 1606824023;
const ETHEREUM_SLOT_TIME = 12;                 // 12 seconds per slot

/**
 * Calculate the Ethereum beacon slot from a block timestamp
 * Slots are calculated from Beacon Chain genesis (Dec 1, 2020)
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {number|null} Slot number or null if before genesis
 */
const calculateSlotFromTimestamp = (timestamp) => {
    if (timestamp < ETHEREUM_BEACON_GENESIS_TIMESTAMP) return null;
    return Math.floor((timestamp - ETHEREUM_BEACON_GENESIS_TIMESTAMP) / ETHEREUM_SLOT_TIME);
};

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
 * Per EIP-4844: kzg_to_versioned_hash(commitment) = VERSIONED_HASH_VERSION_KZG + sha256(commitment)[1:]
 * @param {string} kzgCommitment - The KZG commitment (hex string)
 * @returns {string} Versioned hash
 */
const computeBlobVersionedHash = (kzgCommitment) => {
    const commitment = kzgCommitment.startsWith('0x') ? kzgCommitment : '0x' + kzgCommitment;
    // EIP-4844 uses SHA-256 for versioned hashes
    const hash = ethers.utils.sha256(commitment);
    // Remove 0x prefix
    const hashWithoutPrefix = hash.startsWith('0x') ? hash.slice(2) : hash;
    // Versioned hash = version byte + bytes 1-31 of SHA-256 hash (skip first byte)
    // sha256 produces 32 bytes = 64 hex chars
    // We skip the first byte (2 hex chars) and take the rest (31 bytes = 62 hex chars)
    const versionHex = VERSIONED_HASH_VERSION_KZG.toString(16).padStart(2, '0');
    const truncatedHash = hashWithoutPrefix.slice(2); // Skip first byte (2 hex chars)
    return '0x' + versionHex + truncatedHash;
};

/**
 * Decode blob data to extract the actual data payload
 * OP Stack blobs use a special encoding to ensure each 32-byte field element
 * fits within the BLS12-381 scalar field modulus.
 *
 * Encoding format (from op-service/eth/blob.go):
 * - Element 0 is special:
 *   - Byte 0: 6-bit encoded chunk (high 2 bits must be 00)
 *   - Byte 1: version (must be 0)
 *   - Bytes 2-4: output length (24-bit big-endian)
 *   - Bytes 5-31: first 27 bytes of actual data
 * - Elements 1-4095:
 *   - Byte 0: 6-bit encoded chunk (high 2 bits must be 00)
 *   - Bytes 1-31: 31 bytes of data
 * - Every 4 elements (round), 6-bit chunks are reassembled into 3 output bytes
 *
 * @param {string} blobHex - Raw blob data as hex string
 * @returns {Buffer} Decoded data buffer
 */
const decodeBlobData = (blobHex) => {
    const blob = blobHex.startsWith('0x') ? blobHex.slice(2) : blobHex;
    const blobBuffer = Buffer.from(blob, 'hex');

    const FIELD_ELEMENTS = 4096;
    const FIELD_SIZE = 32;
    const ROUNDS = 1024;
    const EXPECTED_BLOB_SIZE = FIELD_ELEMENTS * FIELD_SIZE;  // 131072 bytes

    // Validate blob size
    if (blobBuffer.length !== EXPECTED_BLOB_SIZE) {
        logger.warn('Invalid blob size', {
            location: 'lib.opBatches.decodeBlobData',
            expected: EXPECTED_BLOB_SIZE,
            actual: blobBuffer.length
        });
        return Buffer.alloc(0);
    }

    // Check version byte (blob[1] must be 0)
    const version = blobBuffer[1];
    if (version !== 0) {
        logger.warn('Invalid blob encoding version', { location: 'lib.opBatches.decodeBlobData', version });
        return Buffer.alloc(0);
    }

    // Check that high 2 bits of first byte are 0 (valid field element)
    if ((blobBuffer[0] & 0xC0) !== 0) {
        logger.warn('Invalid field element in blob', { location: 'lib.opBatches.decodeBlobData' });
        return Buffer.alloc(0);
    }

    // Read 24-bit big-endian output length from bytes 2-4
    const outputLen = (blobBuffer[2] << 16) | (blobBuffer[3] << 8) | blobBuffer[4];

    // MaxBlobDataSize = (4*31+3)*1024 - 4 = 130044 bytes
    const MAX_BLOB_DATA_SIZE = 130044;
    if (outputLen > MAX_BLOB_DATA_SIZE) {
        logger.warn('Blob output length exceeds max size', {
            location: 'lib.opBatches.decodeBlobData',
            outputLen,
            maxSize: MAX_BLOB_DATA_SIZE
        });
        return Buffer.alloc(0);
    }

    const outputBuffer = Buffer.alloc(MAX_BLOB_DATA_SIZE);
    let opos = 0;  // Output position
    let ipos = 0;  // Input position (element index)

    // Round 0 is special - element 0 bytes 5-31 go to output (27 bytes)
    // because bytes 0-4 contain version + length
    blobBuffer.copy(outputBuffer, opos, 5, 32);  // Element 0, bytes 5-31
    opos += 27;

    // Collect 6-bit chunks from elements 0-3 for round 0
    const encodedByte = [];
    encodedByte[0] = blobBuffer[0] & 0x3F;  // Element 0

    // Process elements 1, 2, 3 of round 0
    for (let j = 1; j < 4 && opos < outputLen; j++) {
        const elemStart = j * FIELD_SIZE;
        // Check high 2 bits are 0
        if ((blobBuffer[elemStart] & 0xC0) !== 0) {
            logger.warn('Invalid field element', { location: 'lib.opBatches.decodeBlobData', element: j });
            return Buffer.alloc(0);
        }
        encodedByte[j] = blobBuffer[elemStart] & 0x3F;
        // Copy 31 bytes from element j
        const copyLen = Math.min(31, outputLen - opos);
        blobBuffer.copy(outputBuffer, opos, elemStart + 1, elemStart + 1 + copyLen);
        opos += 31;
    }
    ipos = 4;

    // Reassemble bytes from round 0's 6-bit chunks
    if (opos >= 28) {
        reassembleBytes(outputBuffer, encodedByte, 27);
    }

    // Process remaining rounds (1 to 1023)
    for (let round = 1; round < ROUNDS && opos < outputLen; round++) {
        for (let j = 0; j < 4; j++) {
            const elemStart = ipos * FIELD_SIZE;
            if ((blobBuffer[elemStart] & 0xC0) !== 0) {
                logger.warn('Invalid field element', { location: 'lib.opBatches.decodeBlobData', element: ipos });
                return Buffer.alloc(0);
            }
            encodedByte[j] = blobBuffer[elemStart] & 0x3F;
            const copyLen = Math.min(31, outputLen - opos);
            if (copyLen > 0) {
                blobBuffer.copy(outputBuffer, opos, elemStart + 1, elemStart + 1 + copyLen);
            }
            opos += 31;
            ipos++;
        }

        // Reassemble bytes for this round
        const reassemblePos = round * 31 * 4 + 27;  // Position of first reassembled byte
        if (reassemblePos < outputLen) {
            reassembleBytes(outputBuffer, encodedByte, reassemblePos);
        }
    }

    return outputBuffer.slice(0, outputLen);
};

/**
 * Reassemble 3 bytes from 4 6-bit encoded values and write to output buffer
 * @param {Buffer} output - Output buffer
 * @param {number[]} encoded - Array of 4 6-bit values
 * @param {number} pos - Position to write first reassembled byte
 */
const reassembleBytes = (output, encoded, pos) => {
    // Combine 4 * 6 bits = 24 bits = 3 bytes
    // Layout: [enc[0]:6][enc[1]:6][enc[2]:6][enc[3]:6]
    // Reconstructs: byte0 = enc[0]<<2 | enc[1]>>4
    //               byte1 = (enc[1]&0xF)<<4 | enc[2]>>2
    //               byte2 = (enc[2]&0x3)<<6 | enc[3]
    output[pos] = ((encoded[0] << 2) | (encoded[1] >> 4)) & 0xFF;
    output[pos + 1] = (((encoded[1] & 0x0F) << 4) | (encoded[2] >> 2)) & 0xFF;
    output[pos + 2] = (((encoded[2] & 0x03) << 6) | encoded[3]) & 0xFF;
};

/**
 * Parse channel frames from blob data
 * First decodes the blob, then parses frames from the decoded data
 * @param {string} blobHex - Raw blob data as hex string
 * @returns {Array} Array of parsed frames
 */
const parseFramesFromBlob = (blobHex) => {
    try {
        const decodedData = decodeBlobData(blobHex);
        if (decodedData.length === 0) {
            return [];
        }

        // The decoded blob data has a derivation version prefix (byte 0 = 0x00)
        // Same format as calldata, so we can use parseFramesFromCalldata
        const hexData = '0x' + decodedData.toString('hex');
        return parseFramesFromCalldata(hexData);
    } catch (error) {
        logger.warn('Failed to parse frames from blob', { location: 'lib.opBatches.parseFramesFromBlob', error: error.message });
        return [];
    }
};

/**
 * Parse frames directly from a buffer (no version byte)
 * Used for blob data which doesn't have the derivation version prefix
 * @param {Buffer} data - Frame data buffer
 * @returns {Array} Array of parsed frames
 */
const parseFramesDirectly = (data) => {
    const frames = [];
    let offset = 0;

    while (offset < data.length) {
        // Need at least frame header (23 bytes)
        if (offset + FRAME_HEADER_SIZE > data.length) break;

        // Parse frame header
        const channelId = '0x' + data.slice(offset, offset + 16).toString('hex');
        offset += 16;

        const frameNumber = data.readUInt16BE(offset);
        offset += 2;

        const frameDataLength = data.readUInt32BE(offset);
        offset += 4;

        // Check if we have enough data for frame content + is_last byte
        if (offset + frameDataLength + 1 > data.length) break;

        const frameData = '0x' + data.slice(offset, offset + frameDataLength).toString('hex');
        offset += frameDataLength;

        const isLast = data[offset] === 1;
        offset += 1;

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
 * Channel data can have two formats:
 * 1. Version prefix format: first byte is 0x00 (zlib) or 0x01 (brotli)
 * 2. Raw zlib: first byte is 0x78 (zlib magic) - no version prefix
 * @param {Buffer} channelData - Raw channel data
 * @returns {Buffer|null} Decompressed batch data or null on failure
 */
const decompressChannelData = (channelData) => {
    if (!channelData || channelData.length === 0) return null;

    const firstByte = channelData[0];

    try {
        // Check if first byte is zlib magic (0x78) - raw zlib without version prefix
        // 0x78 0x01, 0x78 0x9C, 0x78 0xDA are common zlib headers
        if (firstByte === 0x78) {
            return zlib.inflateSync(channelData);
        }

        // Version prefix format
        const compressedData = channelData.slice(1);

        if (firstByte === CHANNEL_VERSION_ZLIB) {
            // zlib decompression (legacy with version prefix)
            return zlib.inflateSync(compressedData);
        } else if (firstByte === CHANNEL_VERSION_BROTLI) {
            // brotli decompression (Fjord+)
            return zlib.brotliDecompressSync(compressedData);
        } else {
            // Unknown format - try raw brotli as fallback
            try {
                return zlib.brotliDecompressSync(channelData);
            } catch {
                logger.warn('Unknown channel compression format', {
                    location: 'lib.opBatches.decompressChannelData',
                    firstByte: '0x' + firstByte.toString(16)
                });
                return null;
            }
        }
    } catch (error) {
        // Decompression failed
        logger.debug('Channel decompression failed', {
            location: 'lib.opBatches.decompressChannelData',
            firstByte: '0x' + firstByte.toString(16),
            error: error.message
        });
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

    if (!frames || frames.length === 0) {
        logger.debug('No frames to extract block range from', { location: 'lib.opBatches.extractL2BlockRange' });
        return null;
    }

    // Check if channel is complete
    const hasLastFrame = frames.some(f => f.isLast);
    if (!hasLastFrame) {
        // This is expected for large batches that span multiple transactions
        logger.debug('Incomplete channel - no isLast frame', {
            location: 'lib.opBatches.extractL2BlockRange',
            frameCount: frames.length,
            frameNumbers: frames.map(f => f.frameNumber)
        });
    }

    // 1. Reassemble channel from frames
    const channelData = reassembleChannel(frames);
    if (!channelData) {
        // Channel is incomplete - this is expected for multi-blob batches
        return null;
    }

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
 * @param {number} options.l2GenesisTimestamp - L2 genesis timestamp for block calculation
 * @returns {Promise<Object>} Batch information
 */
const getBatchInfo = async (tx, options = {}) => {
    const { batchInboxAddress, beaconUrl, workspaceId, l1Timestamp, l2BlockTime, l2GenesisTimestamp } = options;

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

    // Calculate L1 timestamp
    const effectiveL1Timestamp = l1Timestamp || tx.timestamp;

    // Options to pass to extractL2BlockRange
    const extractOptions = {
        workspaceId,
        l1Timestamp: effectiveL1Timestamp,
        l2BlockTime: l2BlockTime || DEFAULT_L2_BLOCK_TIME,
        l2GenesisTimestamp
    };

    if (batchInfo.isBlob) {
        // EIP-4844 blob transaction
        if (tx.blobVersionedHashes && tx.blobVersionedHashes.length > 0) {
            batchInfo.blobHash = tx.blobVersionedHashes[0];

            // Attempt to fetch blob data if beacon URL is available
            if (beaconUrl) {
                // Calculate slot from L1 timestamp if not provided
                const slot = tx.slot || calculateSlotFromTimestamp(effectiveL1Timestamp);
                if (slot) {
                    const blobs = await fetchBlobsFromBeacon(beaconUrl, slot, tx.blobVersionedHashes);
                    if (blobs.length > 0) {
                        batchInfo.blobData = blobs[0].data;
                        // Parse blob data as frames and extract block range
                        const frames = parseFramesFromBlob(blobs[0].data);
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
    parseFramesFromBlob,
    parseFramesDirectly,
    decodeBlobData,
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
    calculateSlotFromTimestamp,
    DERIVATION_VERSION_0,
    CHANNEL_VERSION_ZLIB,
    CHANNEL_VERSION_BROTLI,
    BATCH_TYPE_SINGULAR,
    BATCH_TYPE_SPAN,
    ETHEREUM_BEACON_GENESIS_TIMESTAMP,
    ETHEREUM_SLOT_TIME
};
