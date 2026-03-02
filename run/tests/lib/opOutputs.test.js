const { ethers } = require('ethers');
const {
    isOutputProposedLog,
    isDisputeGameCreatedLog,
    getOutputProposedData,
    getDisputeGameCreatedData,
    calculateChallengePeriodEnd
} = require('../../lib/opOutputs');

const l2OutputOracleAbi = require('../../lib/abis/l2OutputOracle.json');
const disputeGameFactoryAbi = require('../../lib/abis/disputeGameFactory.json');

const l2OutputOracleIface = new ethers.utils.Interface(l2OutputOracleAbi);
const disputeGameFactoryIface = new ethers.utils.Interface(disputeGameFactoryAbi);

describe('opOutputs', () => {
    describe('isOutputProposedLog', () => {
        it('should return true for valid OutputProposed log', () => {
            const outputProposedTopic = l2OutputOracleIface.getEventTopic('OutputProposed');
            const log = {
                topics: [outputProposedTopic, '0x' + 'a'.repeat(64), '0x' + '0'.repeat(63) + '1', '0x' + '0'.repeat(60) + '1000']
            };

            expect(isOutputProposedLog(log)).toBe(true);
        });

        it('should return false for non-OutputProposed log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isOutputProposedLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = {
                topics: []
            };

            expect(isOutputProposedLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isOutputProposedLog(null)).toBe(false);
        });
    });

    describe('isDisputeGameCreatedLog', () => {
        it('should return true for valid DisputeGameCreated log', () => {
            const disputeGameCreatedTopic = disputeGameFactoryIface.getEventTopic('DisputeGameCreated');
            const log = {
                topics: [disputeGameCreatedTopic, '0x000000000000000000000000' + 'a'.repeat(40)]
            };

            expect(isDisputeGameCreatedLog(log)).toBe(true);
        });

        it('should return false for non-DisputeGameCreated log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isDisputeGameCreatedLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = {
                topics: []
            };

            expect(isDisputeGameCreatedLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isDisputeGameCreatedLog(null)).toBe(false);
        });
    });

    describe('getOutputProposedData', () => {
        it('should parse OutputProposed log data', () => {
            const outputRoot = '0x' + 'a'.repeat(64);
            const l2OutputIndex = ethers.BigNumber.from(100);
            const l2BlockNumber = ethers.BigNumber.from(50000);
            const l1Timestamp = ethers.BigNumber.from(1700000000);

            // Encode the event
            const encodedLog = l2OutputOracleIface.encodeEventLog(
                l2OutputOracleIface.getEvent('OutputProposed'),
                [outputRoot, l2OutputIndex, l2BlockNumber, l1Timestamp]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getOutputProposedData(log);

            expect(result.outputRoot).toBe(outputRoot);
            expect(result.l2OutputIndex).toBe('100');
            expect(result.l2BlockNumber).toBe('50000');
            expect(result.l1Timestamp).toBe('1700000000');
        });
    });

    describe('getDisputeGameCreatedData', () => {
        it('should parse DisputeGameCreated log data', () => {
            const disputeProxy = '0x' + 'a'.repeat(40);
            const gameType = 0;
            const rootClaim = '0x' + 'b'.repeat(64);

            // Encode the event
            const encodedLog = disputeGameFactoryIface.encodeEventLog(
                disputeGameFactoryIface.getEvent('DisputeGameCreated'),
                [disputeProxy, gameType, rootClaim]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getDisputeGameCreatedData(log);

            expect(result.disputeProxy).toBe(disputeProxy.toLowerCase());
            expect(result.gameType).toBe(gameType);
            expect(result.rootClaim).toBe(rootClaim);
        });
    });

    describe('calculateChallengePeriodEnd', () => {
        it('should calculate challenge period end with default 7 days', () => {
            const proposalTimestamp = 1700000000;
            const result = calculateChallengePeriodEnd(proposalTimestamp);

            // Default challenge period is 7 days = 604800 seconds
            expect(result).toBe(1700000000 + 604800);
        });

        it('should calculate challenge period end with custom period', () => {
            const proposalTimestamp = 1700000000;
            const challengePeriodSeconds = 86400; // 1 day

            const result = calculateChallengePeriodEnd(proposalTimestamp, challengePeriodSeconds);

            expect(result).toBe(1700000000 + 86400);
        });

        it('should handle zero proposal timestamp', () => {
            const result = calculateChallengePeriodEnd(0);

            expect(result).toBe(604800);
        });

        it('should handle zero challenge period', () => {
            const proposalTimestamp = 1700000000;
            const result = calculateChallengePeriodEnd(proposalTimestamp, 0);

            expect(result).toBe(1700000000);
        });
    });
});
