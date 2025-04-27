require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/middlewares/workspaceAuth');

const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/transactionTraceSteps';

describe(`GET ${BASE_URL}`, () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

     it('Should return a 200 with a response', (done) => {
        jest.spyOn(db, 'getWorkspaceTransactionTraceSteps').mockResolvedValueOnce([{ hash: '0x1234' }]);
        request.get(`${BASE_URL}`)
            .send({ workspace: 'My Workspace', page: 1, itemsPerPage: 10 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ items: [{ hash: '0x1234' }] });
                done();
            });
    });
});
