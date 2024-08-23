require('./rateLimiter')
jest.mock('../../../lib/utils', () => {
    const actual = jest.requireActual('../../../lib/utils');
    return {
        getEnv: jest.fn().mockReturnValue('test'),
        getFunctionSignatureForTransaction: jest.fn(),
        sanitize: actual.sanitize,
        withTimeout: jest.fn(cb => new Promise(resolve => resolve(cb))),
        processRawRpcObject: jest.fn(data => data),
        validateBNString: jest.fn().mockReturnValue(true),
        sleep: jest.fn().mockResolvedValue()
    }
});
