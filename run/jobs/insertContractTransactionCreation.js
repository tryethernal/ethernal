const { Contract } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId || !data.contractAddress || !data.transactionHash)
        return 'Missing parameter';

    const contract = await Contract.findOne({
        where: {
            workspaceId: data.workspaceId,
            address: data.contractAddress
        }
    })
    if (contract)
        return await contract.update({ creationTransactionHash: data.transactionHash });
};
