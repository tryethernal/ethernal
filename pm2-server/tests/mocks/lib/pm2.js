jest.mock('../../../lib/pm2', () => ({
    list: jest.fn(),
    show: jest.fn(),
    stop: jest.fn(),
    reload: jest.fn(),
    restart: jest.fn(),
    delete: jest.fn(),
    start: jest.fn()
}));
