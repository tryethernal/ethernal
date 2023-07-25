jest.mock('../../../models/index.js', () => ({
    StripeSubscription: require('./StripeSubscription').StripeSubscription,
    User: require('./User').User,
    Workspace: require('./Workspace').Workspace,
    Explorer: require('./Explorer').Explorer,
}));

const { User, user } = require('./User');
const { Workspace, workspace } = require('./Workspace');
const { Explorer, explorer } = require('./Explorer');
const { StripeSubscription } = require('./StripeSubscription');

module.exports = {
    User,
    Workspace,
    Explorer,
    workspace,
    user,
    explorer,
    StripeSubscription
};
