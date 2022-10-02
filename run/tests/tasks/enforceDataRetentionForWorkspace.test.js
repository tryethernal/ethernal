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
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ dataRetentionLimit: 7 });
        request.post(BASE_URL)
            .send({ data: { userId: '123', workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.resetWorkspace).toHaveBeenCalledWith('123', 'My Workspace', 7);
                done();
            });
    });

    it('Should not call the resetWorkspace function', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ dataRetentionLimit: 0 });
        request.post(BASE_URL)
            .send({ data: { userId: '123', workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.resetWorkspace).not.toHaveBeenCalled();
                done();
            });
    });
});
