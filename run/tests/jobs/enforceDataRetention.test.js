require('../mocks/lib/firebase');
require('../mocks/lib/tasks');
require('../mocks/middlewares/taskAuth');
const { enqueueTask } = require('../../lib/tasks');
const { Workspace } = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/jobs/enforceDataRetention';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should enqueue data retention enforcement tasks', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([
            { id: 1, dataRetentionLimit: 7 },
        ]);
        request.post(BASE_URL)
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenNthCalledWith(1, 'enforceDataRetentionForWorkspace', {
                    workspaceId: 1, 
                    secret: expect.anything()
                });
                done();
            });
    });
});
