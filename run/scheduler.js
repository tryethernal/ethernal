const jobs = require('./jobs');
const { enqueue } = require('./lib/queue');

(async () => {
    await enqueue(
        'enforceDataRetentionForWorkspace',
        'enforceDataRetentionForWorkspace',
        {},
        10,
        { pattern: '0 0 * * *' }
    );
})();
