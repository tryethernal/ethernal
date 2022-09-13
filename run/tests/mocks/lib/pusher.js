jest.mock('pusher', () => {
    return function() {
        return {
            trigger: jest.fn().mockResolvedValue(true),
            authorizeChannel: jest.fn(() => '1234')
        }
    }
});
