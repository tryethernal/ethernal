require('../mocks/lib/firebase');
require('../mocks/lib/transactions');

const transactionProcessing = require('../../jobs/transactionProcessing');

afterAll(() => jest.clearAllMocks());

describe('transactionProcessing', () => {
    it('Should succeed', (done) => {
        transactionProcessing({
            data: {
                userId: '123',
                workspace: 'My Workspace',
                transaction: { hash: '0x123' }
            }
        }).then(done);
    });
});
