require('../mocks/lib/queue');
const { Block, Workspace, Explorer } = require('../mocks/models');

const processBlock = require('../../jobs/processBlock');

beforeEach(() => jest.clearAllMocks());

describe('processBlock', () => {
    it('Should return an error if block is not found', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce(null);
        processBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find block');
                done();
            });
    });

    it('Should fall back to findByPk when workspaceId is not in job data', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce(null);
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(Block.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
                expect(res).toEqual('Cannot find block');
                done();
            });
    });

    it('Should use findOne with workspaceId when available', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce(null);
        processBlock({ data: { blockId: 1, workspaceId: 5 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({
                    where: { id: 1, workspaceId: 5 },
                    attributes: expect.any(Array)
                });
                expect(res).toEqual('Cannot find block');
                done();
            });
    });

    it('Should return an error if workspace is not found', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({
            workspaceId: 1
        });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should return an error if workspace is not public', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({
            workspaceId: 1
        });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            public: false
        });

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('Not allowed on private workspaces');
                done();
            });
    });

    it('Should return an error if there is no explorer', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({
            workspaceId: 1
        });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            public: true
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('Inactive explorer');
                done();
            });
    });

    it('Should return an error if sync is disabled', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({
            workspaceId: 1
        });
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            public: true
        });
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            shouldSync: false
        });

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
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
            id: 1,
            public: true,
            getViemPublicClient: jest.fn().mockReturnValue({
                getFeeHistory: jest.fn().mockResolvedValue({
                    baseFeePerGas: [1000000000],
                    gasUsedRatio: [0.5],
                    reward: [[1000000000], [1000000000], [1000000000]]
                })
            })
        };

        const mockExplorer = {
            id: 1,
            shouldSync: true,
            gasAnalyticsEnabled: true
        };

        jest.spyOn(Block, 'findOne').mockResolvedValueOnce(mockBlock);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(mockWorkspace);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(mockExplorer);

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
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
            id: 1,
            public: true,
            getViemPublicClient: jest.fn()
        };

        const mockExplorer = {
            id: 1,
            shouldSync: true,
            gasAnalyticsEnabled: false
        };

        jest.spyOn(Block, 'findOne').mockResolvedValueOnce(mockBlock);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(mockWorkspace);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(mockExplorer);

        processBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                expect(mockWorkspace.getViemPublicClient).not.toHaveBeenCalled();
                done();
            });
    });
});
