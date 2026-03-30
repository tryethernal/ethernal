/**
 * @fileoverview Transaction trace processing job.
 * Fetches and stores debug traces (internal transactions) for transactions.
 * @module jobs/processTransactionTrace
 */

const db = require('../lib/firebase');
const { Transaction, Workspace, Explorer, RpcHealthCheck, StripeSubscription, sequelize } = require('../models');
const { Tracer } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    // Use a transaction to ensure database queries reuse the same connection
    // This reduces connection pool pressure under high load
    const result = await sequelize.transaction(async (t) => {
        // Fetch transaction with minimal workspace data to avoid expensive multi-table joins
        const transaction = await Transaction.findByPk(data.transactionId, {
            include: [
                {
                    model: Workspace,
                    as: 'workspace',
                    attributes: ['id', 'public', 'rpcHealthCheckEnabled', 'rpcServer', 'tracing', 'name']
                }
            ],
            transaction: t
        });

        if (!transaction)
            return { error: 'Cannot find transaction' };

        if (!transaction.workspace.public)
            return { error: 'Not allowed on private workspaces' };

        // Load explorer data with targeted query (much faster than complex nested joins)
        const explorer = await Explorer.findOne({
            where: { workspaceId: transaction.workspace.id },
            attributes: ['id', 'shouldSync'],
            include: {
                model: StripeSubscription,
                as: 'stripeSubscription',
                attributes: ['id'],
                required: false
            },
            transaction: t
        });

        if (!explorer)
            return { error: 'Inactive explorer' };

        if (!explorer.shouldSync)
            return { error: 'Sync is disabled' };

        // Load RPC health check separately if enabled (only when needed)
        if (transaction.workspace.rpcHealthCheckEnabled) {
            const healthCheck = await RpcHealthCheck.findOne({
                where: { workspaceId: transaction.workspace.id },
                attributes: ['isReachable'],
                transaction: t
            });

            if (healthCheck && !healthCheck.isReachable)
                return { error: 'RPC is not reachable' };
        }

        return { transaction, explorer };
    });

    // Handle early returns from transaction block
    if (result.error)
        return result.error;

    const { transaction, explorer } = result;

    if (!explorer.stripeSubscription)
        return 'No active subscription';

    if (!transaction.workspace.tracing)
        return 'Tracing is not enabled';

    const tracer = new Tracer(transaction.workspace.rpcServer, db, transaction.workspace.tracing);
    await tracer.process(transaction);

    if (tracer.error) {
        // Disable tracing if RPC doesn't support debug_traceTransaction
        if (tracer.error.message &&
            tracer.error.message.includes('RPC endpoint does not support debug_traceTransaction')) {
            await transaction.workspace.update({ tracing: null });
        }
        return tracer.error;
    }

    if (!tracer.parsedTrace)
        return 'No trace';

    try {
        const trace = await transaction.safeCreateTransactionTrace(tracer.parsedTrace);
        if (trace.error && trace.error.message.includes('debug_traceTransaction does not exist'))
            await transaction.workspace.update({ tracing: null });
        return trace;
    } catch(error) {
        if (error.error && error.error.message &&
            error.error.message.includes('not enabled'))
            await transaction.workspace.update({ tracing: null });
        return error;
    }
};

