jest.mock('../../../models/index.js', () => ({
    StripePlan: require('./StripePlan').StripePlan,
    StripeSubscription: require('./StripeSubscription').StripeSubscription,
    ExplorerDomain: require('./ExplorerDomain').ExplorerDomain,
    User: require('./User').User,
    Workspace: require('./Workspace').Workspace,
    Explorer: require('./Explorer').Explorer,
    Transaction: require('./Transaction').Transaction,
    Block: require('./Block').Block,
    ExplorerFaucet: require('./ExplorerFaucet').ExplorerFaucet
}));

const { User, user } = require('./User');
const { Workspace, workspace } = require('./Workspace');
const { Explorer, explorer } = require('./Explorer');
const { StripeSubscription } = require('./StripeSubscription');
const { ExplorerDomain } = require('./ExplorerDomain');
const { StripePlan } = require('./StripePlan');
const { Transaction } = require('./Transaction');
const { Block } = require('./Block');
const { ExplorerFaucet } = require('./ExplorerFaucet');

module.exports = {
    Transaction,
    User,
    Workspace,
    Explorer,
    workspace,
    user,
    explorer,
    StripeSubscription,
    ExplorerDomain,
    StripePlan,
    Block,
    ExplorerFaucet
};
