require('../mocks/lib/firebase');
require('../mocks/middlewares/taskAuth');
jest.mock('axios');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/submitExplorerLead';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should return a 200 status code', (done) => {
        request.post(BASE_URL)
            .send({ data: { workspace: 'My Workspace', email: 'antoine@tryethernal.com' }})
            .expect(200, done);
    });
});
