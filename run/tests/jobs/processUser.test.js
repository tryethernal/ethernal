require('../mocks/lib/queue');
require('../mocks/lib/firebase');
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

const processUser = require('../../jobs/processUser');

beforeEach(() => jest.clearAllMocks());

describe('processUser', () => {
    it('Should call the Ghost API', (done) => {
        process.env.GHOST_API_KEY = '123';
        process.env.GHOST_ENDPOINT = '123';
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });

        processUser({ data: { uid: '123' }}).then(() => {
            expect(mockMembersAdd).toHaveBeenCalledWith({ email: 'email' });
            done();
        });
    });

    it('Should not call the Ghost API if no env variables', (done) => {
        delete process.env.GHOST_API_KEY;
        delete process.env.GHOST_ENDPOINT;
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });
        
        processUser({ data: { uid: '123' }}).then(() => {
            expect(mockMembersAdd).not.toHaveBeenCalled();
            done();
        });
    });

    it('Should succeed if the user already exists', (done) => {
        process.env.GHOST_API_KEY = '123';
        process.env.GHOST_ENDPOINT = '123';
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'email' });
        mockMembersAdd.mockRejectedValue({ context: 'Member already exists. Attempting to add member with existing email address' });
        
        processUser({ data: { uid: '123' }}).then(done);
    });
});
