jest.mock('@/lib/metamask', () => ({
    sendTransaction: () => new Promise((resolve) => resolve('0x1234'))
}));
