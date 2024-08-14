const { Contract } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId || !data.contractAddress || !data.transactionId)
        return 'Missing parameter';

    return Contract.update({ transactionId: data.transactionId }, {
        where: {
            workspaceId: data.workspaceId,
            address: data.contractAddress
        }
    });
};
