vi.mock('@/lib/metamask', () => ({
    sendTransaction: vi.fn().mockResolvedValue('0x1234')
}));
