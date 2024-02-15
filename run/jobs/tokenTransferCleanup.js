const { TokenTransfer } = require('../models');

module.exports = async job => {
    const data = job.data;

    const tokenTransfers = await TokenTransfer.findAll({
        where: { id: data.ids }
    });

    for (let i = 0; i < tokenTransfers.length; i++) {
        await tokenTransfers[i].safeDestroy();
    }

    return true;
};
