jest.mock('../../../lib/crypto', () => ({
    encode: jest.fn().mockReturnValue('1234'),
    decode: jest.fn().mockReturnValue('1234'),
    decrypt: jest.fn().mockReturnValue('1234'),
    encrypt: jest.fn().mockReturnValue('1234'),
    firebaseHash: jest.fn().mockReturnValue('1234'),
    firebaseVerify: jest.fn().mockReturnValue(true)
}));
