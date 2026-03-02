const { ethers } = require('ethers');
const {
    isTransactionDepositedLog,
    getTransactionDepositedData,
    parseOpaqueData,
    deriveL2TransactionHash
} = require('../../lib/opDeposits');

const optimismPortalAbi = require('../../lib/abis/optimismPortal.json');
const iface = new ethers.utils.Interface(optimismPortalAbi);

describe('opDeposits', () => {
    describe('isTransactionDepositedLog', () => {
        it('should return true for valid TransactionDeposited log', () => {
            const depositTopic = iface.getEventTopic('TransactionDeposited');
            const log = {
                topics: [depositTopic, '0x000000000000000000000000' + 'a'.repeat(40), '0x000000000000000000000000' + 'b'.repeat(40)]
            };

            expect(isTransactionDepositedLog(log)).toBe(true);
        });

        it('should return false for non-TransactionDeposited log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isTransactionDepositedLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = {
                topics: []
            };

            expect(isTransactionDepositedLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isTransactionDepositedLog(null)).toBe(false);
        });
    });

    describe('parseOpaqueData', () => {
        it('should parse opaque data correctly', () => {
            // Create sample opaque data
            // mint: 1 ETH, value: 0.5 ETH, gasLimit: 100000, isCreation: false, data: empty
            const mint = ethers.utils.hexZeroPad(ethers.utils.parseEther('1').toHexString(), 32);
            const value = ethers.utils.hexZeroPad(ethers.utils.parseEther('0.5').toHexString(), 32);
            const gasLimit = ethers.utils.hexZeroPad(ethers.BigNumber.from(100000).toHexString(), 8);
            const isCreation = '00';
            const data = '';

            const opaqueData = mint + value.slice(2) + gasLimit.slice(2) + isCreation + data;

            const result = parseOpaqueData(opaqueData);

            expect(result.mint).toBe(ethers.utils.parseEther('1').toString());
            expect(result.value).toBe(ethers.utils.parseEther('0.5').toString());
            expect(result.gasLimit).toBe('100000');
            expect(result.isCreation).toBe(false);
        });

        it('should handle isCreation = true', () => {
            const mint = ethers.utils.hexZeroPad('0x0', 32);
            const value = ethers.utils.hexZeroPad('0x0', 32);
            const gasLimit = ethers.utils.hexZeroPad(ethers.BigNumber.from(50000).toHexString(), 8);
            const isCreation = '01';
            const data = 'abcdef';

            const opaqueData = mint + value.slice(2) + gasLimit.slice(2) + isCreation + data;

            const result = parseOpaqueData(opaqueData);

            expect(result.isCreation).toBe(true);
            expect(result.data).toBe('0xabcdef');
        });

        it('should handle data with 0x prefix', () => {
            const mint = ethers.utils.hexZeroPad('0x0', 32);
            const value = ethers.utils.hexZeroPad('0x0', 32);
            const gasLimit = ethers.utils.hexZeroPad('0x10', 8);
            const isCreation = '00';

            const opaqueData = '0x' + mint.slice(2) + value.slice(2) + gasLimit.slice(2) + isCreation;

            const result = parseOpaqueData(opaqueData);

            expect(result.data).toBe(null);
        });
    });

    describe('deriveL2TransactionHash', () => {
        it('should derive L2 transaction hash from L1 parameters', () => {
            const params = {
                l1BlockNumber: 12345,
                l1TransactionHash: '0x' + 'a'.repeat(64),
                logIndex: 5
            };

            const result = deriveL2TransactionHash(params);

            expect(result).toMatch(/^0x[a-f0-9]{64}$/);
        });

        it('should produce consistent hash for same parameters', () => {
            const params = {
                l1BlockNumber: 100,
                l1TransactionHash: '0x' + 'b'.repeat(64),
                logIndex: 0
            };

            const hash1 = deriveL2TransactionHash(params);
            const hash2 = deriveL2TransactionHash(params);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hash for different log indices', () => {
            const baseParams = {
                l1BlockNumber: 100,
                l1TransactionHash: '0x' + 'c'.repeat(64)
            };

            const hash1 = deriveL2TransactionHash({ ...baseParams, logIndex: 0 });
            const hash2 = deriveL2TransactionHash({ ...baseParams, logIndex: 1 });

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('getTransactionDepositedData', () => {
        it('should parse TransactionDeposited log data', () => {
            // Create a mock TransactionDeposited event log
            const from = '0x' + 'a'.repeat(40);
            const to = '0x' + 'b'.repeat(40);
            const version = 0;

            // Create opaque data
            const mint = ethers.utils.hexZeroPad('0x0', 32);
            const value = ethers.utils.hexZeroPad(ethers.utils.parseEther('1').toHexString(), 32);
            const gasLimit = ethers.utils.hexZeroPad(ethers.BigNumber.from(100000).toHexString(), 8);
            const isCreation = '00';
            const opaqueData = mint.slice(2) + value.slice(2) + gasLimit.slice(2) + isCreation;

            // Encode the event
            const encodedLog = iface.encodeEventLog(
                iface.getEvent('TransactionDeposited'),
                [from, to, version, '0x' + opaqueData]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getTransactionDepositedData(log);

            expect(result.from).toBe(from.toLowerCase());
            expect(result.to).toBe(to.toLowerCase());
            expect(result.version).toBe('0');
            expect(result.value).toBe(ethers.utils.parseEther('1').toString());
            expect(result.gasLimit).toBe('100000');
            expect(result.isCreation).toBe(false);
        });
    });
});
