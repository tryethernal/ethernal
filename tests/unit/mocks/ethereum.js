const ethereum = {
    isConnected: jest.fn(function() {
        return true;
    }),
    request: jest.fn((function() {
        return new Promise((resolve) => resolve('0xabcd'))
    }))
};

export default ethereum;
