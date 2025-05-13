require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/env');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
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
const env = require('../../lib/env')
const flags = require('../../lib/flags');

const processUser = require('../../jobs/processUser');

beforeEach(() => jest.clearAllMocks());

describe('processUser', () => {
    it('Should call the Ghost API', (done) => {
        jest.spyOn(env, 'getGhostApiKey').mockReturnValueOnce('123');
        jest.spyOn(env, 'getGhostEndpoint').mockReturnValueOnce('http://ghost');
        jest.spyOn(flags, 'isSelfHosted').mockReturnValueOnce(false);
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ email: 'email' });

        processUser({ data: { id: 1 }}).then(() => {
            expect(mockMembersAdd).toHaveBeenCalledWith({ email: 'email' });
            done();
        });
    });

    it('Should not call the Ghost API if no env variables', (done) => {
        jest.spyOn(env, 'getGhostApiKey').mockReturnValueOnce(null);
        jest.spyOn(env, 'getGhostEndpoint').mockReturnValueOnce(null);
        jest.spyOn(flags, 'isSelfHosted').mockReturnValueOnce(false);
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ email: 'email' });

        processUser({ data: { id: 1 }}).then(() => {
            expect(mockMembersAdd).not.toHaveBeenCalled();
            done();
        });
    });

    it('Should succeed if the user already exists', (done) => {
        jest.spyOn(env, 'getGhostApiKey').mockReturnValueOnce('123');
        jest.spyOn(env, 'getGhostEndpoint').mockReturnValueOnce('http://ghost');
        jest.spyOn(flags, 'isSelfHosted').mockReturnValueOnce(false);
        jest.spyOn(db, 'getUserById').mockResolvedValueOnce({ email: 'email' });
        mockMembersAdd.mockRejectedValue({ context: 'Member already exists. Attempting to add member with existing email address' });
        
        processUser({ data: { id: 1 }}).then(done);
    });
});
