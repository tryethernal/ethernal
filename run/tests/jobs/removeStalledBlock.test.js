require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

const removeStalledBlock = require('../../jobs/removeStalledBlock');
const { enqueue } = require('../../lib/queue');

beforeEach(() => jest.clearAllMocks());

describe('removeStalledBlock', () => {
    it('Should enqueue for quota increase if block is ready', (done) => {
        const revertIfPartial = jest.fn();
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            workspaceId: 1,
           transactions: [{ isSyncing: false }],
           revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).not.toHaveBeenCalled();
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs', (done) => {
        const revertIfPartial = jest.fn();
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            transactions: [{ isSyncing: true }],
            revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).toHaveBeenCalled();
                expect(res).toEqual(`Removed stalled block 1 - Workspace 1 - #1`);
                done();
            });
    });

    it('Should return if could not find block', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValue(null);

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Could not find block');
                done();
            });
    });

    describe('Database retry logic', () => {
        it('Should retry on connection terminated error and succeed', (done) => {
            const connectionError = new Error('Connection terminated unexpectedly');
            connectionError.name = 'SequelizeDatabaseError';

            const mockBlock = {
                workspaceId: 1,
                transactions: [{ isSyncing: false }]
            };

            jest.spyOn(Block, 'findByPk')
                .mockRejectedValueOnce(connectionError)
                .mockRejectedValueOnce(connectionError)
                .mockResolvedValueOnce(mockBlock);

            removeStalledBlock({ data: { blockId: 1 }})
                .then(res => {
                    expect(Block.findByPk).toHaveBeenCalledTimes(3);
                    expect(res).toEqual(true);
                    done();
                })
                .catch(done);
        });

        it('Should not retry on non-connection database errors', (done) => {
            const nonConnectionError = new Error('Some other database error');
            nonConnectionError.name = 'SequelizeDatabaseError';

            jest.spyOn(Block, 'findByPk').mockRejectedValue(nonConnectionError);

            removeStalledBlock({ data: { blockId: 1 }})
                .catch(error => {
                    expect(Block.findByPk).toHaveBeenCalledTimes(1);
                    expect(error).toBe(nonConnectionError);
                    done();
                });
        });

        it('Should not retry on non-Sequelize errors', (done) => {
            const nonSequelizeError = new Error('Some other error');

            jest.spyOn(Block, 'findByPk').mockRejectedValue(nonSequelizeError);

            removeStalledBlock({ data: { blockId: 1 }})
                .catch(error => {
                    expect(Block.findByPk).toHaveBeenCalledTimes(1);
                    expect(error).toBe(nonSequelizeError);
                    done();
                });
        });

        it('Should fail after max retries with connection error', (done) => {
            const connectionError = new Error('ECONNRESET');
            connectionError.name = 'SequelizeDatabaseError';

            jest.spyOn(Block, 'findByPk').mockRejectedValue(connectionError);

            removeStalledBlock({ data: { blockId: 1 }})
                .catch(error => {
                    expect(Block.findByPk).toHaveBeenCalledTimes(3);
                    expect(error).toBe(connectionError);
                    done();
                });
        });

        it('Should retry on ENOTFOUND error', (done) => {
            const enotfoundError = new Error('getaddrinfo ENOTFOUND');
            enotfoundError.name = 'SequelizeDatabaseError';

            const mockBlock = {
                workspaceId: 1,
                transactions: [{ isSyncing: false }]
            };

            jest.spyOn(Block, 'findByPk')
                .mockRejectedValueOnce(enotfoundError)
                .mockResolvedValueOnce(mockBlock);

            removeStalledBlock({ data: { blockId: 1 }})
                .then(res => {
                    expect(Block.findByPk).toHaveBeenCalledTimes(2);
                    expect(res).toEqual(true);
                    done();
                })
                .catch(done);
        });
    });
});
