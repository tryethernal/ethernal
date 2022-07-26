require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/middlewares/taskAuth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/transactionProcessing';

afterAll(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should return a 200 status code', (done) => {
        request.post(BASE_URL)
            .send({ data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123' }
            }})
            .expect(200, done);
    });
});
