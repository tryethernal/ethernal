const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = [];

const MAX_BATCH_SIZE = 2000;

const enqueue = (queueName, jobName, data, priority = 1, repeat, delay, unique) => {
    const jobId = unique ? jobName : null;
    return queues[queueName].add(jobName, data, sanitize({ priority, repeat, jobId, delay }));
};

const bulkEnqueue = (queueName, jobData, priority = 10, maxBatchSize = MAX_BATCH_SIZE) => {
    if (!queueName || !jobData || !jobData.length) return;

    const promises = [];
    const batchedJobs = [];
    for (let i = 0; i < jobData.length; i += maxBatchSize)
        batchedJobs.push(jobData.slice(i, i + maxBatchSize));

    for (let i = 0; i < batchedJobs.length; i++) {
        const jobs = batchedJobs[i].map(job => {
            return sanitize({
                name: job.name,
                data: job.data,
                opts: sanitize({ priority, jobId: job.name })
            })
        });
        promises.push(queues[queueName].addBulk(jobs));
    }

    return Promise.all(promises);
};

module.exports = {
    enqueue, bulkEnqueue
};
