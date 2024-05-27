const { enqueue, bulkEnqueue } = require('../lib/queue');
const MAX_CONCURRENT_BATCHES = 500000;

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || data.from === null || data.from === undefined || data.to === null || data.to === undefined) {
        return 'Missing parameter.';
    }

    const start = parseInt(data.from);
    let end = parseInt(data.to);

    if (end - start >= MAX_CONCURRENT_BATCHES)
        end = start + MAX_CONCURRENT_BATCHES;

    if (end >= start) {
        const jobs = [];
        for (let i = start; i <= end; i++) {
            jobs.push({
                name: `blockSync-batch-${data.userId}-${data.workspace}-${i}`,
                data: {
                    userId: data.userId,
                    workspace: data.workspace,
                    blockNumber: i,
                    source: data.source || 'batchSync',
                    rateLimited: true
                }
            });
        }

        await bulkEnqueue('blockSync', jobs);

        if (parseInt(data.to) - start >= MAX_CONCURRENT_BATCHES)
            await enqueue('batchBlockSync', `batchBlockSync-${data.userId}-${data.workspace}-${end}-${parseInt(data.to)}`, {
                userId: data.userId,
                workspace: data.workspace,
                from: end,
                to: parseInt(data.to),
                source: data.source || 'batchSync'
            });
    }
};
