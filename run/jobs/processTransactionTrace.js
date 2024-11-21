const db = require('../lib/firebase');
const { Transaction, Workspace, User, Explorer, RpcHealthCheck } = require('../models');
const { Tracer } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await Transaction.findByPk(data.transactionId, {
        attributes: ['id', 'hash', 'workspaceId'],
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['public', 'rpcHealthCheckEnabled', 'rpcServer', 'tracing', 'name'],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['firebaseUserId'],
                    },
                    {
                        model: Explorer,
                        as: 'explorer',
                        attributes: ['shouldSync'],
                        include: 'stripeSubscription'
                    },
                    {
                        model: RpcHealthCheck,
                        as: 'rpcHealthCheck',
                        attributes: ['isReachable'],
                    }
                ]
            }
        ]
    });

    if (!transaction)
        return 'Cannot find transaction';

    if (!transaction.workspace.public)
        return 'Not allowed on private workspaces';

    if (!transaction.workspace.explorer)
        return 'Inactive explorer';

    // if (!transaction.workspace.explorer.shouldSync)
    //     return 'Sync is disabled';

    if (transaction.workspace.rpcHealthCheckEnabled && transaction.workspace.rpcHealthCheck && !transaction.workspace.rpcHealthCheck.isReachable)
        return 'RPC is not reachable';

    if (!transaction.workspace.explorer.stripeSubscription)
        return 'No active subscription';

    const tracer = new Tracer(transaction.workspace.rpcServer, db, transaction.workspace.tracing);
    await tracer.process(transaction);

    if (tracer.error)
        return tracer.error;

    return transaction.safeCreateTransactionTrace(tracer.parsedTrace);
};

