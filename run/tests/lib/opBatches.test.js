const { ethers } = require('ethers');
const {
    isBatchTransaction,
    isBlobTransaction,
    parseFramesFromCalldata,
    computeBlobVersionedHash,
    parseBatchData,
    getBatchInfo,
    getBatchInboxAddress,
    DERIVATION_VERSION_0
} = require('../../lib/opBatches');

describe('opBatches', () => {
    describe('isBatchTransaction', () => {
        it('should return true when tx.to matches batchInboxAddress', () => {
            const tx = {
                to: '0xff00000000000000000000000000000000000001'
            };
            const batchInboxAddress = '0xff00000000000000000000000000000000000001';

            expect(isBatchTransaction(tx, batchInboxAddress)).toBe(true);
        });

        it('should return true with case-insensitive comparison', () => {
            const tx = {
                to: '0xFF00000000000000000000000000000000000001'
            };
            const batchInboxAddress = '0xff00000000000000000000000000000000000001';

            expect(isBatchTransaction(tx, batchInboxAddress)).toBe(true);
        });

        it('should return false when tx.to does not match', () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890'
            };
            const batchInboxAddress = '0xff00000000000000000000000000000000000001';

            expect(isBatchTransaction(tx, batchInboxAddress)).toBe(false);
        });

        it('should return false when tx.to is null', () => {
            const tx = {
                to: null
            };
            const batchInboxAddress = '0xff00000000000000000000000000000000000001';

            expect(isBatchTransaction(tx, batchInboxAddress)).toBe(false);
        });

        it('should return false when batchInboxAddress is null', () => {
            const tx = {
                to: '0xff00000000000000000000000000000000000001'
            };

            expect(isBatchTransaction(tx, null)).toBe(false);
        });
    });

    describe('isBlobTransaction', () => {
        it('should return true for type 3 transaction (number)', () => {
            const tx = { type: 3 };
            expect(isBlobTransaction(tx)).toBe(true);
        });

        it('should return true for type 3 transaction (hex string)', () => {
            const tx = { type: '0x3' };
            expect(isBlobTransaction(tx)).toBe(true);
        });

        it('should return false for type 2 transaction', () => {
            const tx = { type: 2 };
            expect(isBlobTransaction(tx)).toBe(false);
        });

        it('should return false for type 0 transaction', () => {
            const tx = { type: 0 };
            expect(isBlobTransaction(tx)).toBe(false);
        });

        it('should return false when type is undefined', () => {
            const tx = {};
            expect(isBlobTransaction(tx)).toBe(false);
        });
    });

    describe('parseFramesFromCalldata', () => {
        it('should return empty array for unsupported version', () => {
            // Version 1 (unsupported)
            const calldata = '0x01' + '00'.repeat(50);

            const frames = parseFramesFromCalldata(calldata);

            expect(frames).toEqual([]);
        });

        it('should handle empty calldata', () => {
            const calldata = '0x';

            const frames = parseFramesFromCalldata(calldata);

            expect(frames).toEqual([]);
        });

        it('should handle version 0 with incomplete frame header', () => {
            // Version 0 but not enough data for frame header
            const calldata = '0x00' + '12'.repeat(10);

            const frames = parseFramesFromCalldata(calldata);

            expect(frames).toEqual([]);
        });

        it('should return empty array when calldata is just version byte', () => {
            const calldata = '0x00';

            const frames = parseFramesFromCalldata(calldata);

            expect(frames).toEqual([]);
        });
    });

    describe('computeBlobVersionedHash', () => {
        it('should compute versioned hash from KZG commitment', () => {
            const kzgCommitment = '0x' + 'a'.repeat(96);

            const result = computeBlobVersionedHash(kzgCommitment);

            // Should start with version byte 0x01
            expect(result.startsWith('0x01')).toBe(true);
            expect(result.length).toBe(66); // 0x + 64 hex chars
        });

        it('should handle KZG commitment without 0x prefix', () => {
            const kzgCommitment = 'a'.repeat(96);

            const result = computeBlobVersionedHash(kzgCommitment);

            expect(result.startsWith('0x01')).toBe(true);
            expect(result.length).toBe(66);
        });

        it('should produce consistent hash for same commitment', () => {
            const kzgCommitment = '0x' + 'b'.repeat(96);

            const hash1 = computeBlobVersionedHash(kzgCommitment);
            const hash2 = computeBlobVersionedHash(kzgCommitment);

            expect(hash1).toBe(hash2);
        });
    });

    describe('parseBatchData', () => {
        it('should return data size and estimated block count', () => {
            const batchData = '0x' + 'ab'.repeat(500);

            const result = parseBatchData(batchData);

            expect(result.dataSize).toBe(500);
            expect(result.compressed).toBe(true);
            expect(result.estimatedBlockCount).toBeGreaterThan(0);
        });

        it('should handle batch data without 0x prefix', () => {
            const batchData = 'cd'.repeat(200);

            const result = parseBatchData(batchData);

            expect(result.dataSize).toBe(200);
        });

        it('should return minimum 1 block for small data', () => {
            const batchData = '0x1234';

            const result = parseBatchData(batchData);

            expect(result.estimatedBlockCount).toBe(1);
        });
    });

    describe('getBatchInfo', () => {
        it('should return null when tx is not a batch transaction', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                hash: '0x' + 'a'.repeat(64)
            };
            const options = {
                batchInboxAddress: '0xff00000000000000000000000000000000000001'
            };

            const result = await getBatchInfo(tx, options);

            expect(result).toBeNull();
        });

        it('should return batch info for calldata transaction', async () => {
            const tx = {
                to: '0xff00000000000000000000000000000000000001',
                hash: '0x' + 'a'.repeat(64),
                blockNumber: 12345,
                transactionIndex: 5,
                timestamp: 1700000000,
                type: 2,
                input: '0x00' + 'ab'.repeat(100)
            };
            const options = {
                batchInboxAddress: '0xff00000000000000000000000000000000000001'
            };

            const result = await getBatchInfo(tx, options);

            expect(result).not.toBeNull();
            expect(result.l1TransactionHash).toBe(tx.hash);
            expect(result.l1BlockNumber).toBe(12345);
            expect(result.l1TransactionIndex).toBe(5);
            expect(result.isBlob).toBe(false);
        });

        it('should identify blob transaction', async () => {
            const tx = {
                to: '0xff00000000000000000000000000000000000001',
                hash: '0x' + 'b'.repeat(64),
                blockNumber: 12346,
                transactionIndex: 0,
                timestamp: 1700000001,
                type: 3,
                blobVersionedHashes: ['0x01' + 'c'.repeat(62)]
            };
            const options = {
                batchInboxAddress: '0xff00000000000000000000000000000000000001'
            };

            const result = await getBatchInfo(tx, options);

            expect(result).not.toBeNull();
            expect(result.isBlob).toBe(true);
            expect(result.blobHash).toBe('0x01' + 'c'.repeat(62));
        });
    });

    describe('getBatchInboxAddress', () => {
        it('should generate correct batch inbox address for chain ID 10', () => {
            const result = getBatchInboxAddress(10);

            expect(result).toBe('0xff0000000000000000000000000000000000000a');
        });

        it('should generate correct batch inbox address for chain ID 420', () => {
            const result = getBatchInboxAddress(420);

            expect(result).toBe('0xff000000000000000000000000000000000001a4');
        });

        it('should generate correct batch inbox address for chain ID 1', () => {
            const result = getBatchInboxAddress(1);

            expect(result).toBe('0xff00000000000000000000000000000000000001');
        });

        it('should handle large chain IDs', () => {
            const result = getBatchInboxAddress(65535);

            expect(result).toBe('0xff0000000000000000000000000000000000ffff');
        });
    });

    describe('DERIVATION_VERSION_0', () => {
        it('should be 0', () => {
            expect(DERIVATION_VERSION_0).toBe(0);
        });
    });
});
