const { TokenBalanceChange } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.transactionId)
        return 'Missing parameter';

    const tokenBalanceChanges = await TokenBalanceChange.findAll({ where: { transactionId: data.transactionId }});
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
};
