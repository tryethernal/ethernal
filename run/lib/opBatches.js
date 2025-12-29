const { ethers } = require('ethers');
const fetch = require('node-fetch');

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
 */

// Channel frame header size: channel_id (16) + frame_number (2) + frame_data_length (4) + is_last (1)
const FRAME_HEADER_SIZE = 23;

// Derivation version byte
const DERIVATION_VERSION_0 = 0;

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
    // Remove 0x prefix if present, then prepend version byte 0x01
    const hashWithoutPrefix = hash.startsWith('0x') ? hash.slice(2) : hash;
    // Version 0x01 for KZG commitments, result is 0x01 + 31 bytes of hash = 66 chars total
    return '0x01' + hashWithoutPrefix.slice(0, 62);
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
 * Extract L2 block range from parsed batch frames
 * This requires decompressing the channel data and parsing span batches
 * @param {Array} frames - Parsed channel frames
 * @returns {Object|null} L2 block range { start, end } or null if unable to parse
 */
const extractL2BlockRange = async (frames) => {
    // Full implementation would:
    // 1. Reassemble channel from frames
    // 2. Decompress channel data (zlib for legacy, brotli for newer)
    // 3. Parse span batch or singular batch format
    // 4. Extract exact L2 block numbers

    // For now, return null to indicate parsing not complete
    // The background job will link batches to L2 blocks via timestamps
    return null;
};

/**
 * Get batch info from a transaction
 * @param {Object} tx - Transaction object
 * @param {Object} options - Options including batchInboxAddress and beaconUrl
 * @returns {Promise<Object>} Batch information
 */
const getBatchInfo = async (tx, options = {}) => {
    const { batchInboxAddress, beaconUrl } = options;

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
        txCount: null
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
                    const parsed = parseBatchData(blobs[0].data);
                    batchInfo.estimatedBlockCount = parsed.estimatedBlockCount;
                }
            }
        }
    } else {
        // Calldata transaction
        if (tx.input && tx.input !== '0x') {
            const frames = parseFramesFromCalldata(tx.input);
            batchInfo.frameCount = frames.length;

            // Try to extract L2 block range
            const blockRange = await extractL2BlockRange(frames);
            if (blockRange) {
                batchInfo.l2BlockStart = blockRange.start;
                batchInfo.l2BlockEnd = blockRange.end;
            }

            const parsed = parseBatchData(tx.input);
            batchInfo.estimatedBlockCount = parsed.estimatedBlockCount;
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
    extractL2BlockRange,
    getBatchInfo,
    getBatchInboxAddress,
    DERIVATION_VERSION_0
};
