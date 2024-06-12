jest.mock('../../../lib/firebase', () => {
    const actual = jest.requireActual('../../../lib/firebase');
    const mocks = {};
    Object.keys(actual).forEach(k => mocks[k] = jest.fn());
    return mocks;
});
