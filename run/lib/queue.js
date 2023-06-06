const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = ["blockSync", "transactionSync", "integrityCheck", "integrityCheckStarter", "rpcHealthCheck", "rpcHealthCheckStarter"];

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const timedJobName = uniqueQueues.indexOf(queueName) < 0 ? `${jobName}-${Date.now()}` : null;
    return queues[queueName].add(timedJobName || jobName, data, sanitize({ priority, repeat, jobId: timedJobName }));
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
