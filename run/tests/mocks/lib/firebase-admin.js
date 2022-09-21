jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => {
        return {
            verifyIdToken: jest.fn().mockResolvedValue({ user_id: '123' }),
            getUser: jest.fn().mockResolvedValue({ email: 'antoine@tryethernal.com' })
        };
    })
}));
