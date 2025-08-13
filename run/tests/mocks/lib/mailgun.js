jest.mock('mailgun.js', () => {
    return jest.fn().mockImplementation(() => {
        return {
            client: jest.fn().mockReturnValue({
                messages: {
                    create: jest.fn().mockResolvedValue([{ statusCode: 202 }])
                }
            })
        }
    });
});
