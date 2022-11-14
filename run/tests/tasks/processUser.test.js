require('../mocks/lib/firebase');
require('../mocks/middlewares/taskAuth');
const mockMembersAdd = jest.fn().mockResolvedValue(true);
jest.mock('@tryghost/admin-api', () => {
    return function() {
        return {
            members: {
                add: mockMembersAdd
            }
        }
    }
});

const db = require('../../lib/firebase');
const GhostAdminAPI = require('@tryghost/admin-api');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/processUser';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should call the Ghost API', (done) => {
        process.env.GHOST_API_KEY = '123';
        process.env.GHOST_ENDPOINT = '123';
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });
        request.post(BASE_URL)
            .send({ data: { uid: '123' }})
            .expect(200)
            .then(() => {
                expect(mockMembersAdd).toHaveBeenCalledWith({ email: 'email' });
                done();
            });
    });

    it('Should not call the Ghost API if no env variables', (done) => {
        delete process.env.GHOST_API_KEY;
        delete process.env.GHOST_ENDPOINT;
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });
        request.post(BASE_URL)
            .send({ data: { uid: '123' }})
            .expect(200)
            .then(() => {
                expect(mockMembersAdd).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should return a 200 if the user already exists', (done) => {
        process.env.GHOST_API_KEY = '123';
        process.env.GHOST_ENDPOINT = '123';
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });
        mockMembersAdd.mockRejectedValue({ context: 'Member already exists. Attempting to add member with existing email address' });
        request.post(BASE_URL)
            .send({ data: { uid: '123' }})
            .expect(200, done);
    });
});
