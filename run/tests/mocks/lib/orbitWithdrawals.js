jest.mock('../../../lib/orbitWithdrawals', () => {
    const actual = jest.requireActual('../../../lib/orbitWithdrawals');
    const mocks = {};
    Object.keys(actual).forEach(k => mocks[k] = jest.fn());
    return mocks;
});
