const { Workspace } = require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/utils');
require('../mocks/lib/queue');

const db = require('../../lib/firebase');
const rpcHealthCheck = require('../../jobs/rpcHealthCheck');

beforeEach(() => jest.clearAllMocks());

const job = { data: { workspaceId: 1 }};

describe('rpcHealthCheck', () => {
    it('Should update healtcheck status if it is reachable', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            getProvider: jest.fn().mockReturnValue({ fetchNetworkId: jest.fn().mockResolvedValue(true) })
        });

        await rpcHealthCheck(job);

        expect(db.updateWorkspaceRpcHealthCheck).toHaveBeenCalledWith(1, true);
    });

    it('Should update healtcheck status if no response', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            getProvider: jest.fn().mockReturnValue({ fetchNetworkId: jest.fn().mockResolvedValue(null) })
        });

        await rpcHealthCheck(job);

        expect(db.updateWorkspaceRpcHealthCheck).toHaveBeenCalledWith(1, false);
    });

    it('Should update healtcheck status if request times out', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            id: 1,
            getProvider: jest.fn().mockReturnValue({ fetchNetworkId: jest.fn().mockRejectedValueOnce(new Error('Cant reach server')) })
        });

        await rpcHealthCheck(job);

        expect(db.updateWorkspaceRpcHealthCheck).toHaveBeenCalledWith(1, false);
    });

    it('Should throw an error if missing parameter', async () => {
        await expect(rpcHealthCheck({ data: {}}))
            .rejects.toThrow('Missing parameter');
    });

    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce(null);

        await expect(rpcHealthCheck(job))
            .rejects.toThrow('Could not find workspace');
    });
});
