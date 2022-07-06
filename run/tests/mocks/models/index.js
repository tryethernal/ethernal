jest.mock('../../../models/index.js', () => ({
    User: require('./User').User,
    Workspace: require('./Workspace').Workspace,
    Explorer: require('./Explorer').Explorer
}));

const { User, user } = require('./User');
const { Workspace, workspace } = require('./Workspace');
const { Explorer, explorer } = require('./Explorer');

module.exports = {
    User: User,
    Workspace: Workspace,
    Explorer: Explorer,
    workspace: workspace,
    user: user,
    explorer: explorer
};
