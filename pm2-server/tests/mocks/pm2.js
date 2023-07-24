jest.mock('pm2', () => ({
    connect: jest.fn(cb => cb()),
    list: jest.fn(),
    describe: jest.fn(),
    restart: jest.fn((_, cb) => cb()),
    delete: jest.fn((_, cb) => cb()),
    start: jest.fn((_, cb) => cb())
}));
