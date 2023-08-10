require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/middlewares/secret');

const { enqueue } = require('../../lib/queue');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/subscriptions';

beforeEach(() => jest.clearAllMocks());

describe(`POST ${BASE_URL}/processAll`, () => {
     it('Should return a 200', (done) => {
        request.post(`${BASE_URL}/processAll`)
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('subscriptionCheck', 'subscriptionCheck', {});
                done();
            });
    });
});
