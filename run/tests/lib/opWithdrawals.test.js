const { ethers } = require('ethers');
const {
    isMessagePassedLog,
    isWithdrawalProvenLog,
    isWithdrawalFinalizedLog,
    getMessagePassedData,
    getWithdrawalProvenData,
    getWithdrawalFinalizedData,
    L2_TO_L1_MESSAGE_PASSER_ADDRESS
} = require('../../lib/opWithdrawals');

const optimismPortalAbi = require('../../lib/abis/optimismPortal.json');
const l2ToL1MessagePasserAbi = require('../../lib/abis/l2ToL1MessagePasser.json');

const optimismPortalIface = new ethers.utils.Interface(optimismPortalAbi);
const l2ToL1MessagePasserIface = new ethers.utils.Interface(l2ToL1MessagePasserAbi);

describe('opWithdrawals', () => {
    describe('L2_TO_L1_MESSAGE_PASSER_ADDRESS', () => {
        it('should be the correct predeploy address', () => {
            expect(L2_TO_L1_MESSAGE_PASSER_ADDRESS).toBe('0x4200000000000000000000000000000000000016');
        });
    });

    describe('isMessagePassedLog', () => {
        it('should return true for valid MessagePassed log', () => {
            const messagePassedTopic = l2ToL1MessagePasserIface.getEventTopic('MessagePassed');
            const log = {
                topics: [messagePassedTopic, '0x' + '0'.repeat(64), '0x000000000000000000000000' + 'a'.repeat(40), '0x000000000000000000000000' + 'b'.repeat(40)]
            };

            expect(isMessagePassedLog(log)).toBe(true);
        });

        it('should return false for non-MessagePassed log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isMessagePassedLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = { topics: [] };
            expect(isMessagePassedLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isMessagePassedLog(null)).toBe(false);
        });
    });

    describe('isWithdrawalProvenLog', () => {
        it('should return true for valid WithdrawalProven log', () => {
            const withdrawalProvenTopic = optimismPortalIface.getEventTopic('WithdrawalProven');
            const log = {
                topics: [withdrawalProvenTopic, '0x' + 'a'.repeat(64), '0x000000000000000000000000' + 'b'.repeat(40), '0x000000000000000000000000' + 'c'.repeat(40)]
            };

            expect(isWithdrawalProvenLog(log)).toBe(true);
        });

        it('should return false for non-WithdrawalProven log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isWithdrawalProvenLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = { topics: [] };
            expect(isWithdrawalProvenLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isWithdrawalProvenLog(null)).toBe(false);
        });
    });

    describe('isWithdrawalFinalizedLog', () => {
        it('should return true for valid WithdrawalFinalized log', () => {
            const withdrawalFinalizedTopic = optimismPortalIface.getEventTopic('WithdrawalFinalized');
            const log = {
                topics: [withdrawalFinalizedTopic, '0x' + 'a'.repeat(64)]
            };

            expect(isWithdrawalFinalizedLog(log)).toBe(true);
        });

        it('should return false for non-WithdrawalFinalized log', () => {
            const log = {
                topics: ['0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef']
            };

            expect(isWithdrawalFinalizedLog(log)).toBe(false);
        });

        it('should return false for invalid log', () => {
            const log = { topics: [] };
            expect(isWithdrawalFinalizedLog(log)).toBe(false);
        });

        it('should return false when log is null', () => {
            expect(isWithdrawalFinalizedLog(null)).toBe(false);
        });
    });

    describe('getMessagePassedData', () => {
        it('should parse MessagePassed log data', () => {
            const nonce = ethers.BigNumber.from(123);
            const sender = '0x' + 'a'.repeat(40);
            const target = '0x' + 'b'.repeat(40);
            const value = ethers.utils.parseEther('1');
            const gasLimit = ethers.BigNumber.from(100000);
            const data = '0x1234';
            const withdrawalHash = '0x' + 'c'.repeat(64);

            // Encode the event
            const encodedLog = l2ToL1MessagePasserIface.encodeEventLog(
                l2ToL1MessagePasserIface.getEvent('MessagePassed'),
                [nonce, sender, target, value, gasLimit, data, withdrawalHash]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getMessagePassedData(log);

            expect(result.nonce).toBe('123');
            expect(result.sender).toBe(sender.toLowerCase());
            expect(result.target).toBe(target.toLowerCase());
            expect(result.value).toBe(ethers.utils.parseEther('1').toString());
            expect(result.gasLimit).toBe('100000');
            expect(result.data).toBe(data);
            expect(result.withdrawalHash).toBe(withdrawalHash);
        });
    });

    describe('getWithdrawalProvenData', () => {
        it('should parse WithdrawalProven log data', () => {
            const withdrawalHash = '0x' + 'a'.repeat(64);
            const from = '0x' + 'b'.repeat(40);
            const to = '0x' + 'c'.repeat(40);

            // Encode the event
            const encodedLog = optimismPortalIface.encodeEventLog(
                optimismPortalIface.getEvent('WithdrawalProven'),
                [withdrawalHash, from, to]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getWithdrawalProvenData(log);

            expect(result.withdrawalHash).toBe(withdrawalHash);
            expect(result.from).toBe(from.toLowerCase());
            expect(result.to).toBe(to.toLowerCase());
        });
    });

    describe('getWithdrawalFinalizedData', () => {
        it('should parse WithdrawalFinalized log data with success true', () => {
            const withdrawalHash = '0x' + 'a'.repeat(64);
            const success = true;

            // Encode the event
            const encodedLog = optimismPortalIface.encodeEventLog(
                optimismPortalIface.getEvent('WithdrawalFinalized'),
                [withdrawalHash, success]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getWithdrawalFinalizedData(log);

            expect(result.withdrawalHash).toBe(withdrawalHash);
            expect(result.success).toBe(true);
        });

        it('should parse WithdrawalFinalized log data with success false', () => {
            const withdrawalHash = '0x' + 'b'.repeat(64);
            const success = false;

            // Encode the event
            const encodedLog = optimismPortalIface.encodeEventLog(
                optimismPortalIface.getEvent('WithdrawalFinalized'),
                [withdrawalHash, success]
            );

            const log = {
                topics: encodedLog.topics,
                data: encodedLog.data
            };

            const result = getWithdrawalFinalizedData(log);

            expect(result.withdrawalHash).toBe(withdrawalHash);
            expect(result.success).toBe(false);
        });
    });
});
