jest.mock('../../../lib/utils', () => {
    const actual = jest.requireActual('../../../lib/utils');
    return {
        getFunctionSignatureForTransaction: jest.fn(),
        sanitize: actual.sanitize
    }
});
