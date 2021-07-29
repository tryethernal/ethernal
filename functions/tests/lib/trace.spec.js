const { parseTrace} = require('../../lib/trace');
const Trace = require('../fixtures/Trace.json');

describe('parseTrace', () => {
    let from, provider;

    beforeEach(async () => {
        from = '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f';
        provider = {
            getCode: () => {
                return new Promise((resolve) => resolve('0xabcd'));
            }
        };
    });

    it('Should return the processed trace', async () => {
        const result = await parseTrace(from, Trace, provider);
        expect(result).toMatchSnapshot();
    });
});
