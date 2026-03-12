require('../mocks/lib/queue');
const { Block, Workspace } = require('../mocks/models');

const processBlock = require('../../jobs/processBlock');

beforeEach(() => jest.clearAllMocks());

describe('processBlock', () => {
    it('Should return an error if block is not found', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce(null);
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find block');
                done();
            });
    });

    it('Should return an error if workspace is not found', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should return an error if workspace is not public', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ public: false });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Not allowed on private workspaces');
                done();
            });
    });

    it('Should return an error if there is no explorer', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ public: true, explorer: null });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Inactive explorer');
                done();
            });
    });

    it('Should return an error if sync is disabled', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspaceId: 1 });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ public: true, explorer: { shouldSync: false } });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Sync is disabled');
                done();
            });
    });

    it('Should return the created block event with gas analytics', (done) => {
        const mockBlock = {
            workspaceId: 1,
            safeCreateEvent: jest.fn().mockResolvedValueOnce({ id: 1 })
        };
        const mockWorkspace = {
            public: true,
            explorer: {
                shouldSync: true,
                gasAnalyticsEnabled: true
            },
            getViemPublicClient: jest.fn().mockReturnValue({
                getFeeHistory: jest.fn().mockResolvedValue({
                    baseFeePerGas: [1000000000],
                    gasUsedRatio: [0.5],
                    reward: [[1000000000], [1000000000], [1000000000]]
                })
            })
        };

        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce(mockBlock);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(mockWorkspace);

        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            });
    });

    it('Should return the created block event without gas analytics when disabled', (done) => {
        const mockBlock = {
            workspaceId: 1,
            safeCreateEvent: jest.fn().mockResolvedValueOnce({ id: 1 })
        };
        const mockWorkspace = {
            public: true,
            explorer: {
                shouldSync: true,
                gasAnalyticsEnabled: false
            },
            getViemPublicClient: jest.fn()
        };

        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce(mockBlock);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(mockWorkspace);

        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                expect(mockWorkspace.getViemPublicClient).not.toHaveBeenCalled();
                done();
            });
    });
});