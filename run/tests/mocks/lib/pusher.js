jest.mock('pusher', () => {
    return function() {
        return {
            trigger: jest.fn(),
            authorizeChannel: jest.fn(() => '1234')
        }
    }
});
