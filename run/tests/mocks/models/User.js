const { workspace } = require('./Workspace');

const user = {
    id: 1,
    workspaces: [workspace],
    isPremium: true,
    safeCreateWorkspace: jest.fn().mockResolvedValue({
        id: 1,
        name: 'My Workspace',
        toJSON: () => ({ id: 1, name: 'My Workspace' })
    }),
    getWorkspaceByName: jest.fn().mockResolvedValue({ id: 1, name: 'My Workspace' }),
    getWorkspaces: jest.fn().mockResolvedValue([workspace]),
    update: jest.fn(),
    toJSON: jest.fn().mockResolvedValue({ id: 1, workspaces: [workspace] })
};

const User = {
    findByAuthIdWithWorkspace: jest.fn().mockResolvedValue(user),
    findByPk: jest.fn().mockResolvedValue(user),
    findByAuthId: jest.fn().mockResolvedValue(user),
    findByStripeCustomerId: jest.fn().mockResolvedValue(user)
};

module.exports = {
    User: User,
    user: user
};
