const { enqueue } = require('../lib/queue');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.from === null || data.from === undefined || data.to === null || data.to === undefined) {
        throw new Error('Missing parameter.');
    }

    const MAX_CONCURRENT_BATCHES = 200;
    const start = parseInt(data.from);
    let end = parseInt(data.to);

    if (end - start >= MAX_CONCURRENT_BATCHES) {
        end = start + MAX_CONCURRENT_BATCHES;
        await enqueue('batchBlockSync', `batchBlockSync-${data.userId}-${data.workspace}-${end}-${parseInt(data.to)}`, {
            userId: data.userId,
            workspace: data.workspace,
            from: end,
            to: parseInt(data.to),
            source: data.source || 'batchSync'
        });
    }
    else
        end += 1;

    for (let i = start; i < end; i++) {
        await enqueue('blockSync', `blockSync-batch-${data.userId}-${data.workspace}-${i}`, {
            userId: data.userId,
            workspace: data.workspace,
            blockNumber: i,
            source: data.source || 'batchSync'
        });
    }

    return;
};
