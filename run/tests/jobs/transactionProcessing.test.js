require('../mocks/lib/firebase');
require('../mocks/lib/transactions');

const transactionProcessing = require('../../jobs/transactionProcessing');

afterAll(() => jest.clearAllMocks());

describe('transactionProcessing', () => {
    it('Should succeed', (done) => {
        transactionProcessing({ data: { transactionId: 1 }}).then(done);
    });
});
