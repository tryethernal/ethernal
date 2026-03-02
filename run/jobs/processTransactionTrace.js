/**
 * @fileoverview Transaction trace processing job.
 * Fetches and stores debug traces (internal transactions) for transactions.
 * @module jobs/processTransactionTrace
 */

const db = require('../lib/firebase');
const { Transaction, Workspace, User, Explorer, RpcHealthCheck } = require('../models');
const { Tracer } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const transaction = await Transaction.findByPk(data.transactionId, {
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

    if (!transaction.workspace.explorer.shouldSync)
        return 'Sync is disabled';

    if (transaction.workspace.rpcHealthCheckEnabled && transaction.workspace.rpcHealthCheck && !transaction.workspace.rpcHealthCheck.isReachable)
        return 'RPC is not reachable';

    if (!transaction.workspace.explorer.stripeSubscription)
        return 'No active subscription';

    if (!transaction.workspace.tracing)
        return 'Tracing is not enabled';

    const tracer = new Tracer(transaction.workspace.rpcServer, db, transaction.workspace.tracing);
    await tracer.process(transaction);

    if (tracer.error)
        return tracer.error;

    if (!tracer.parsedTrace)
        return 'No trace';

    try {
        const trace = await transaction.safeCreateTransactionTrace(tracer.parsedTrace);
        if (trace.error && trace.error.message.includes('debug_traceTransaction does not exist'))
            await transaction.workspace.update({ tracing: null });
        return trace;
    } catch(error) {
        if (error.error.message.includes('not enabled'))
            await transaction.workspace.update({ tracing: null });
        return error;
    }
};

