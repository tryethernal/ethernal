require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/analytics');
require('../mocks/lib/flags');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/lib/pusher');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/pusher';

describe(`GET ${BASE_URL}/authorization`, () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

     it('Should return a 200 with a response', (done) => {
        request.post(`${BASE_URL}/authorization`)
            .send({ socket_id: 1, channel_name: 'hello' })
            .expect(200)
            .then(({ text }) => {
                expect(text).toEqual('1234');
                done();
            });
    });
});
