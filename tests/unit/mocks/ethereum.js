const ethereum = {
    eth_requestAccounts: jest.fn(() => ['0x1234']),
    eth_chainId: jest.fn(() => '0x1'),
    accountsChanged: jest.fn(() => ['0x1235']),
    chainChanged: jest.fn(() => 2),
    request: jest.fn(),
    on: jest.fn()
};

export default ethereum;
