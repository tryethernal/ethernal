const { Workspace, TokenBalanceChange } = require('../models');

module.exports = async job => {
    const data = job.data;
    
    if (!data.workspaceId)
        return 'Missing parameter';

    const workspace = await Workspace.findByPk(data.workspaceId);
    if (!workspace)
        return 'Workspace not found';

    const [transactions] = await workspace.getTransactionsWithDuplicateTokenBalanceChanges();

    for (const transaction of transactions) {
        const tokenBalanceChanges = await TokenBalanceChange.findAll({ where: { transactionId: transaction.transactionId }});
        const groupedBalanceChanges = {};
        for (const tokenBalanceChange of tokenBalanceChanges) {
            if (!groupedBalanceChanges[`${tokenBalanceChange.address}-${tokenBalanceChange.token}`])
                groupedBalanceChanges[`${tokenBalanceChange.address}-${tokenBalanceChange.token}`] = [];

            groupedBalanceChanges[`${tokenBalanceChange.address}-${tokenBalanceChange.token}`].push(tokenBalanceChange);
        }

        for (const balanceChanges of Object.values(groupedBalanceChanges)) {
            const duplicates = balanceChanges.slice(1);
            for (const duplicate of duplicates)
                await duplicate.safeDestroy();
        }
    }
};
