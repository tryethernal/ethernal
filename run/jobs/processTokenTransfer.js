const { TokenTransfer, Workspace, Transaction } = require('../models');
const { getBalanceChange, getNativeBalanceChange } = require('../lib/rpc');
const logger = require('../lib/logger');

module.exports = async job => {
    const data = job.data;

    if (!data.tokenTransferId)
        return 'Missing parameter.';

    const tokenTransfer = await TokenTransfer.findByPk(data.tokenTransferId, {
        attributes: ['id', 'src', 'dst', 'token', 'transactionId', 'workspaceId'],
        include: [
            {
                model: Workspace,
                as: 'workspace',
                attributes: ['id', 'name', 'public', 'rpcServer']
            },
            {
                model: Transaction,
                as: 'transaction',
                attributes: ['id', 'blockNumber', 'hash']
            }
        ]
    });

    if (!tokenTransfer)
        return 'Cannot find token transfer';

    if (!tokenTransfer.workspace.public)
        return 'Not processing private workspaces';

    if (!tokenTransfer.transaction)
        return 'Could not find transaction';

    const workspace = tokenTransfer.workspace;
    const transaction = tokenTransfer.transaction;

    const changes = [];

    if (tokenTransfer.src != '0x0000000000000000000000000000000000000000') {
        try {
            const balanceChange = tokenTransfer.token == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ?
                await getNativeBalanceChange(tokenTransfer.src, transaction.blockNumber, workspace.rpcServer) :
                await getBalanceChange(tokenTransfer.src, tokenTransfer.token, transaction.blockNumber, workspace.rpcServer);

            if (balanceChange && balanceChange.diff != '0') {
                changes.push(balanceChange);
            }
        } catch(error) {
            if (error.message && error.message.startsWith('missing revert data in call exception')) {
                logger.error(error.message, { location: 'jobs.processTokenTransfer', error: error, data });
                return error.message;
            }
        }
    }

    if (tokenTransfer.dst != '0x0000000000000000000000000000000000000000') {
        try {
            const balanceChange = tokenTransfer.token == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ?
                await getNativeBalanceChange(tokenTransfer.dst, transaction.blockNumber, workspace.rpcServer) :
                await getBalanceChange(tokenTransfer.dst, tokenTransfer.token, transaction.blockNumber, workspace.rpcServer);

            if (balanceChange && balanceChange.diff != '0') {
                changes.push(balanceChange);
            }
        } catch(error) {
            if (error.message && error.message.startsWith('missing revert data in call exception')) {
                logger.error(error.message, { location: 'jobs.processTokenTransfer', error: error, data });
                return error.message;
            }
        }
    }

    for (let i = 0; i < changes.length; i++)
        await tokenTransfer.safeCreateBalanceChange(changes[i]);

    return true;
};
