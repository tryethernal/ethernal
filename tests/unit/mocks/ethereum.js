const ethereum = {
    eth_requestAccounts: vi.fn(() => ['0x1234']),
    eth_chainId: vi.fn(() => '0x1'),
    accountsChanged: vi.fn(() => ['0x1235']),
    chainChanged: vi.fn(() => 2),
    request: vi.fn(),
    on: vi.fn()
};

export default ethereum;
