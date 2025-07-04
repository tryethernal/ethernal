jest.mock('../../../lib/chains', () => ({
    isChainAllowed: jest.fn().mockReturnValue(true)
}));
