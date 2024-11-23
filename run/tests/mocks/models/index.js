jest.mock('../../../models/index.js', () => ({
    StripePlan: require('./StripePlan').StripePlan,
    StripeSubscription: require('./StripeSubscription').StripeSubscription,
    ExplorerDomain: require('./ExplorerDomain').ExplorerDomain,
    User: require('./User').User,
    Workspace: require('./Workspace').Workspace,
    Explorer: require('./Explorer').Explorer,
    Transaction: require('./Transaction').Transaction,
    Block: require('./Block').Block,
    ExplorerFaucet: require('./ExplorerFaucet').ExplorerFaucet,
    ExplorerV2Dex: require('./ExplorerV2Dex').ExplorerV2Dex,
    V2DexPair: require('./V2DexPair').V2DexPair,
    TransactionLog: require('./TransactionLog').TransactionLog,
    TransactionReceipt: require('./TransactionReceipt').TransactionReceipt,
    V2DexPoolReserve: require('./V2DexPoolReserve').V2DexPoolReserve,
    Contract: require('./Contract').Contract,
    TokenTransfer: require('./TokenTransfer').TokenTransfer
}));

const { User, user } = require('./User');
const { Workspace, workspace } = require('./Workspace');
const { Explorer, explorer } = require('./Explorer');
const { ExplorerV2Dex } = require('./ExplorerV2Dex');
const { StripeSubscription } = require('./StripeSubscription');
const { ExplorerDomain } = require('./ExplorerDomain');
const { StripePlan } = require('./StripePlan');
const { Transaction } = require('./Transaction');
const { Block } = require('./Block');
const { ExplorerFaucet } = require('./ExplorerFaucet');
const { V2DexPair } = require('./V2DexPair');
const { TransactionLog } = require('./TransactionLog');
const { TransactionReceipt } = require('./TransactionReceipt');
const { V2DexPoolReserve } = require('./V2DexPoolReserve');
const { Contract } = require('./Contract');
const { TokenTransfer } = require('./TokenTransfer');

module.exports = {
    Transaction,
    User,
    Workspace,
    Explorer,
    workspace,
    user,
    explorer,
    ExplorerV2Dex,
    StripeSubscription,
    ExplorerDomain,
    StripePlan,
    Block,
    ExplorerFaucet,
    V2DexPair,
    TransactionLog,
    V2DexPoolReserve,
    TransactionReceipt,
    Contract,
    TokenTransfer
};
