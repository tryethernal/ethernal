require('../mocks/lib/firebase');
jest.mock('axios');

const submitExplorerLead = require('../../jobs/submitExplorerLead');

beforeEach(() => jest.clearAllMocks());

describe('submitExplorerLead', () => {
    it('Should succeed', (done) => {
        submitExplorerLead({
            data: { workspace: 'My Workspace', email: 'antoine@tryethernal.com' }
        }).then(done);
    });
});
