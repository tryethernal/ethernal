const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = ["blockSync", "transactionSync", "integrityCheck", "integrityCheckStarter", "rpcHealthCheck", "rpcHealthCheckStarter", "batchBlockSync"];

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const jobId = uniqueQueues.indexOf(queueName) > -1 ? jobName : null;
    return queues[queueName].add(jobName || jobName, data, sanitize({ priority, repeat, jobId: jobId }));
};

const bulkEnqueue = (queueName, jobData) => {
    const jobs = jobData.map(job => {
        return {
            name: uniqueQueues.indexOf(queueName) < 0 ? `${job.name}-${Date.now()}` : job.name,
            data: job.data
        }  
    })
    return queues[queueName].addBulk(jobs);
};

module.exports = {
    enqueue, bulkEnqueue
};
