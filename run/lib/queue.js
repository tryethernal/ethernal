const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = ["blockSync", "batchBlockSync"];

const MAX_BATCH_SIZE = 2000;

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const jobId = uniqueQueues.indexOf(queueName) > -1 ? jobName : null;
    return queues[queueName].add(jobName || jobName, data, sanitize({ priority, repeat, jobId: jobId }));
};

const bulkEnqueue = (queueName, jobData) => {
    const promises = [];
    const batchedJobs = [];
    for (let i = 0; i < jobData.length; i += MAX_BATCH_SIZE)
        batchedJobs.push(jobData.slice(i, i + MAX_BATCH_SIZE));

    for (let i = 0; i < batchedJobs.length; i++) {
        const jobs = batchedJobs[i].map(job => {
            return sanitize({
                name: job.name,
                data: job.data,
                opts: sanitize({ jobId: uniqueQueues.indexOf(queueName) > -1 ? job.name : null })
            })
        });
        promises.push(queues[queueName].addBulk(jobs));
    }

    return Promise.all(promises);
};

module.exports = {
    enqueue, bulkEnqueue
};
