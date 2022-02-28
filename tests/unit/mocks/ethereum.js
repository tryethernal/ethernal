const ethereum = {
    eth_requestAccounts: jest.fn(() => ['0x1234']),
    eth_chainId: jest.fn(() => '0x1'),
    accountsChanged: jest.fn(() => ['0x1235']),
    chainChanged: jest.fn(() => 2),
    request: jest.fn((function(data) {
        const res = data.method && ethereum[data.method] ? ethereum[data.method]() : '0x1234';
        return new Promise((resolve) => resolve(res));
    })),
    on: jest.fn()
};

export default ethereum;
