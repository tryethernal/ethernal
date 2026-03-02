jest.mock('node-mailjet', () => ({
    apiConnect: jest.fn().mockReturnValue({
        post: jest.fn().mockReturnValue({
            request: jest.fn().mockResolvedValue()
        })
    })
}));
