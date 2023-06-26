require('../mocks/lib/firebase');
require('../mocks/lib/queue');

const { enqueue, bulkEnqueue } = require('../../lib/queue');
const batchBlockSync = require('../../jobs/batchBlockSync');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should not split & re-enqueue if less than 500000 blocks', (done) => {
            batchBlockSync({
                data: {
                    userId: '123',
                    workspace: 'My Workspace',
                    from: 1,
                    to: 100
                }
            }).then(() => {
                expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.anything());
                expect(enqueue).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should split & re-enqueue if more than 500000 blocks', (done) => {
        batchBlockSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                from: 1,
                to: 1000000
            }
        }).then(() => {
            expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.anything());
            expect(enqueue).toHaveBeenNthCalledWith(1, 'batchBlockSync', expect.anything(), {
                userId: expect.anything(),
                workspace: expect.anything(),
                from: 500001,
                to: 1000000,
                source: 'batchSync'
            });
            done();
        });
    });
});
