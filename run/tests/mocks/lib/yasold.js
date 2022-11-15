jest.mock('../../../lib/yasold', () => ({
    decompileToText: jest.fn().mockReturnValue('asm')
}));
