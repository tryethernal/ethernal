require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/middlewares/auth');
require('../mocks/lib/queue');
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('token')
}));
const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/marketing';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/productRoadToken`, () => {
    it('Should return token', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'antoine@tryethernal.com' });
        process.env.PRODUCT_ROAD_TOKEN = '123';
        request.get(`${BASE_URL}/productRoadToken?workspace=ethernal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ token: 'token' });
                delete process.env.PRODUCT_ROAD_TOKEN;
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return the marketing flags', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ slug: 'ethernal', isRemote: true });
        request.get(`${BASE_URL}/?workspace=ethernal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ isRemote: true });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/submitExplorerLead`, () => {
    it('Should enqueue task', (done) => {
        request.post(`${BASE_URL}/submitExplorerLead`)
            .send({ data: { workspace: 'ethernal', email: 'antoine@tryethernal.com' }})
            .expect(200)
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('submitExplorerLead', expect.anything(),
                    { workspace: 'ethernal', email: 'antoine@tryethernal.com' }
                );
                done();
            });
    });
});
