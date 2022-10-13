require('../mocks/lib/firebase');
require('../mocks/middlewares/taskAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/enforceDataRetentionForWorkspace';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should call the resetWorkspace function with the data retention limit', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ dataRetentionLimit: 7, userId: 1, name: 'My Workspace' });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ firebaseUserId: '123' });
        request.post(BASE_URL)
            .send({ data: { workspaceId: 123 }})
            .expect(200)
            .then(() => {
                expect(db.resetWorkspace).toHaveBeenCalledWith('123', 'My Workspace', 7);
                done();
            });
    });

    it('Should not call the resetWorkspace function', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ dataRetentionLimit: 0, userId: 1 });
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ firebaseUserId: '123' });
        request.post(BASE_URL)
            .send({ data: { workspaceId: 123 }})
            .expect(200)
            .then(() => {
                expect(db.resetWorkspace).not.toHaveBeenCalled();
                done();
            });
    });
});
