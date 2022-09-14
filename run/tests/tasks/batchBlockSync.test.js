require('../mocks/lib/firebase');
require('../mocks/lib/tasks');
require('../mocks/middlewares/taskAuth');

const { enqueueTask } = require('../../lib/tasks');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/batchBlockSync';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should not split & re-enqueue if less than 1000 blocks', (done) => {
        request.post(BASE_URL)
            .send({ data : {
                userId: '123',
                workspace: 'My Workspace',
                from: 1,
                to: 100

            }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenNthCalledWith(100, 'secondaryBlockSync', expect.anything(), expect.anything());
                expect(enqueueTask).not.toHaveBeenCalledWith('batchBlockSync');
                done();
            });
    });

    it('Should split & re-enqueue if more than 1000 blocks', (done) => {
        request.post(BASE_URL)
            .send({ data : {
                userId: '123',
                workspace: 'My Workspace',
                from: 1,
                to: 9840

            }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenCalledTimes(1001);
                expect(enqueueTask).toHaveBeenNthCalledWith(1000, 'secondaryBlockSync', expect.anything(), expect.anything());
                expect(enqueueTask).toHaveBeenNthCalledWith(1, 'batchBlockSync', {
                    userId: expect.anything(),
                    workspace: expect.anything(),
                    from: 1001,
                    to: 9840,
                    secret: expect.anything()
                }, expect.anything());
                done();
            });
    });
});
