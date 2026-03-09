require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

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

    it('Should return an error if workspace is not public', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspace: { public: false } });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Not allowed on private workspaces');
                done();
            });
    });

    it('Should return an error if there is no explorer', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspace: { public: true, explorer: null } });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Inactive explorer');
                done();
            });
    });

    it('Should return an error if sync is disabled', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({ workspace: { public: true, explorer: { shouldSync: false } } });
        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Sync is disabled');
                done();
            });
    });

    it('Should return the created block event', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValueOnce({
            safeCreateEvent: jest.fn().mockResolvedValueOnce({ id: 1 }),
            workspace: {
                public: true,
                explorer: {
                    shouldSync: true
                },
                getViemPublicClient: jest.fn().mockReturnValue({
                    getFeeHistory: jest.fn().mockResolvedValue({
                        baseFeePerGas: [1000000000],
                        gasUsedRatio: [0.5],
                        reward: [[1000000000], [1000000000], [1000000000]]
                    })
                })
            }
        });

        processBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            });
    });
});