require('../mocks/lib/firebase');
require('../mocks/lib/queue');

const { enqueue } = require('../../lib/queue');
const batchBlockSync = require('../../jobs/batchBlockSync');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should not split & re-enqueue if less than 200 blocks', (done) => {
            batchBlockSync({
                data: {
                    userId: '123',
                    workspace: 'My Workspace',
                    from: 1,
                    to: 100
                }
            }).then(() => {
                expect(enqueue).toHaveBeenNthCalledWith(100, 'blockSync', expect.anything(), expect.anything());
                expect(enqueue).not.toHaveBeenCalledWith('blockSync');
                done();
            });
    });

    it('Should split & re-enqueue if more than 200 blocks', (done) => {
        batchBlockSync({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                from: 1,
                to: 9840
            }
        }).then(() => {
            expect(enqueue).toHaveBeenCalledTimes(201);
            expect(enqueue).toHaveBeenNthCalledWith(201, 'blockSync', expect.anything(), expect.anything());
            expect(enqueue).toHaveBeenNthCalledWith(1, 'batchBlockSync', expect.anything(), {
                userId: expect.anything(),
                workspace: expect.anything(),
                from: 201,
                to: 9840,
                source: 'batchSync'
            });
            done();
        });
    });
});
