require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/utils');
require('../mocks/lib/logger');
require('../mocks/lib/opsgenie');
const { Explorer } = require('../mocks/models');

const { createIncident } = require('../../lib/opsgenie');
const logger = require('../../lib/logger');

const blockSyncMonitoring = require('../../jobs/blockSyncMonitoring');

beforeEach(() => jest.clearAllMocks());

describe('blockSyncMonitoring', () => {
    it('Should skip if rpc healthchecks are failing', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            workspace: {
                rpcHealthCheck: {
                    isReachable: false
                }
            }
        }]);
        await blockSyncMonitoring();
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should skip if transaction quota is reached', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            hasReachedTransactionQuota: jest.fn().mockResolvedValue(true),
            workspace: {}
        }]);
        await blockSyncMonitoring();
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should skip if there is no block', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            hasReachedTransactionQuota: jest.fn().mockResolvedValue(false),
            workspace: {
                getBlocks: jest.fn().mockResolvedValue([])
            }
        }]);
        await blockSyncMonitoring();
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should skip if rpc is not reachable', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            hasReachedTransactionQuota: jest.fn().mockResolvedValue(false),
            workspace: {
                getBlocks: jest.fn().mockResolvedValue([{ number: 1 }]),
                getProvider: () => ({ fetchLatestBlock: jest.fn().mockRejectedValue(new Error('Network error')) })
            }
        }]);
        await blockSyncMonitoring();
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should log a message if block sync is OK', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            id: 1,
            name: 'Explorer',
            hasReachedTransactionQuota: jest.fn().mockResolvedValue(false),
            workspace: {
                getBlocks: jest.fn().mockResolvedValue([{ number: 1 }]),
                getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValue({ number: 2 }) })
            }
        }]);
        await blockSyncMonitoring();
        expect(logger.info).toHaveBeenCalledWith('Block sync is OK', { id: 1, name: 'Explorer', diff: 1 });
        expect(createIncident).not.toHaveBeenCalled();
    });

    it('Should create an incident if block sync is too much behind', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValueOnce([{
            id: 1,
            name: 'Explorer',
            hasReachedTransactionQuota: jest.fn().mockResolvedValue(false),
            workspace: {
                getBlocks: jest.fn().mockResolvedValue([{ number: 1 }]),
                getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValue({ number: 100 }) })
            }
        }]);
        await blockSyncMonitoring();
        expect(createIncident).toHaveBeenCalledWith('Block sync is behind', 'Explorer: Explorer (#1) - Diff: 99 - Remote: 100 - Local: 1');
    });
}); 
