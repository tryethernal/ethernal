jest.mock('../../../lib/utils', () => {
    const actual = jest.requireActual('../../../lib/utils');
    return {
        getEnv: jest.fn().mockReturnValue('test'),
        getFunctionSignatureForTransaction: jest.fn(),
        sanitize: actual.sanitize,
        withTimeout: jest.fn(cb => cb)
    }
});
