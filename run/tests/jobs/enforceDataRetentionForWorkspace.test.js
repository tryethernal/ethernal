require('../mocks/models');
require('../mocks/lib/firebase');
const db = require('../../lib/firebase');

const enforceDataRetentionForWorkspace = require('../../jobs/enforceDataRetentionForWorkspace');

beforeEach(() => jest.clearAllMocks());

describe('enforceDataRetentionForWorkspace', () => {
    it('Should call the resetWorkspace function with the data retention limit', (done) => {
        jest.spyOn(db.Workspace, 'findAll').mockResolvedValueOnce([{ dataRetentionLimit: 7, userId: 1, name: 'My Workspace' }]);
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ firebaseUserId: '123' });

        enforceDataRetentionForWorkspace({ data: { workspaceId: 123 }})
            .then(() => {
                expect(db.resetWorkspace).toHaveBeenCalledWith('123', 'My Workspace', 7);
                done();
            });
    });

    it('Should not call the resetWorkspace function', (done) => {
        jest.spyOn(db.Workspace, 'findAll').mockResolvedValueOnce([{ dataRetentionLimit: 0, userId: 1 }]);
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ firebaseUserId: '123' });
        
        enforceDataRetentionForWorkspace({ data: { workspaceId: 123 }})
            .then(() => {
                expect(db.resetWorkspace).not.toHaveBeenCalled();
                done();
            });
    });
});
