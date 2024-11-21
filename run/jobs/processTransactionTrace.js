const db = require('../lib/firebase');
let { Tracer } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await db.getTransactionForProcessing(data.transactionId);

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

    return tracer.saveTrace(transaction.workspace.user.firebaseUserId, transaction.workspace.name);
};
