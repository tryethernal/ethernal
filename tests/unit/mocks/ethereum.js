const ethereum = {
    eth_requestAccounts: jest.fn().mockResolvedValue(['0x1234']),
    eth_chainId: jest.fn().mockResolvedValue('0x1'),
    accountsChanged: jest.fn().mockResolvedValue(['0x1235']),
    chainChanged: jest.fn().mockResolvedValue(2),
    request: jest.fn().mockResolvedValue(['ok']),
    on: jest.fn()
};

export default ethereum;
