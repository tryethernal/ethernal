jest.mock('../../../models/index.js', () => ({
    User: require('./User').User,
    Workspace: require('./Workspace').Workspace
}));

const { User, user } = require('./User')
const { Workspace, workspace } = require('./Workspace')

module.exports = {
    User: User,
    Workspace: Workspace,
    workspace: workspace,
    user: user
};
