const { Contract } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.contractId || !data.transactionId)
        return 'Missing parameter';

    return Contract.update({ transactionId: data.transactionId}, {
        where: { id: data.contractId }
    });
};
