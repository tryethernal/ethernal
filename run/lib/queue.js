const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = ["blockSync", "batchBlockSync"];

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const jobId = uniqueQueues.indexOf(queueName) > -1 ? jobName : null;
    return queues[queueName].add(jobName || jobName, data, sanitize({ priority, repeat, jobId: jobId }));
};

const bulkEnqueue = (queueName, jobData) => {
    const jobs = jobData.map(job => {
        return sanitize({
            name: job.name,
            data: job.data,
            opts: sanitize({ jobId: uniqueQueues.indexOf(queueName) > -1 ? job.name : null })
        })
    })
    return queues[queueName].addBulk(jobs);
};

module.exports = {
    enqueue, bulkEnqueue
};
