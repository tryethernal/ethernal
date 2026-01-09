require('../mocks/lib/queue');
require('../mocks/lib/firebase');

const { reportRpcFailure, SYNC_FAILURE_THRESHOLD } = require('../../lib/syncHelpers');

describe('syncHelpers', () => {
    describe('SYNC_FAILURE_THRESHOLD', () => {
        it('Should export the sync failure threshold constant', () => {
            expect(SYNC_FAILURE_THRESHOLD).toBe(3);
        });
    });

    describe('reportRpcFailure', () => {
        it('Should not count rate-limited errors as failures', async () => {
            const error = new Error('Rate limited');
            const explorer = {
                id: 1,
                shouldSync: true,
                incrementSyncFailures: jest.fn()
            };

            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
            expect(explorer.incrementSyncFailures).not.toHaveBeenCalled();
        });

        it('Should not count timeout errors as failures', async () => {
            const error = new Error('Timed out after 30000ms');
            const explorer = {
                id: 1,
                shouldSync: true,
                incrementSyncFailures: jest.fn()
            };

            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
            expect(explorer.incrementSyncFailures).not.toHaveBeenCalled();
        });

        it('Should count other RPC errors as failures', async () => {
            const error = new Error('Connection refused');
            const explorer = {
                id: 1,
                shouldSync: true,
                incrementSyncFailures: jest.fn().mockResolvedValue({ disabled: false, attempts: 1 })
            };

            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
            expect(explorer.incrementSyncFailures).toHaveBeenCalledWith('rpc_error');
        });

        it('Should return shouldStop=true when explorer is auto-disabled', async () => {
            const error = new Error('Connection refused');
            const explorer = {
                id: 1,
                shouldSync: true,
                incrementSyncFailures: jest.fn().mockResolvedValue({ disabled: true, attempts: 3 })
            };

            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(true);
            expect(result.message).toBe('Sync disabled due to repeated RPC failures');
        });

        it('Should not report if explorer is null', async () => {
            const error = new Error('Connection refused');

            const result = await reportRpcFailure(error, null, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
        });

        it('Should not report if explorer.shouldSync is false', async () => {
            const error = new Error('Connection refused');
            const explorer = {
                id: 1,
                shouldSync: false,
                incrementSyncFailures: jest.fn()
            };

            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
            expect(explorer.incrementSyncFailures).not.toHaveBeenCalled();
        });

        it('Should handle incrementSyncFailures errors gracefully', async () => {
            const error = new Error('Connection refused');
            const explorer = {
                id: 1,
                shouldSync: true,
                incrementSyncFailures: jest.fn().mockRejectedValue(new Error('DB error'))
            };

            // Should not throw
            const result = await reportRpcFailure(error, explorer, 'blockSync', 123);

            expect(result.shouldStop).toBe(false);
            expect(result.message).toBeNull();
        });
    });
});
