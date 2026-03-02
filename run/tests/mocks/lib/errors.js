jest.mock('../../../lib/errors', () => ({
    managedError: jest.fn(),
    unmanagedError: jest.fn(),
    managedWorkerError: jest.fn()
}));
