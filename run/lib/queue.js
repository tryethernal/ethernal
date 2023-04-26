const queues = require("../queues");
const { sanitize } = require("./utils");

const uniqueQueues = ["blockSync", "transactionSync", "integrityCheck", "integrityCheckStarter", "rpcHealthCheck", "rpcHealthCheckStarter"];

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const timedJobName = uniqueQueues.indexOf(queueName) < 0 ? `${jobName}-${Date.now()}` : null;
    return queues[queueName].add(timedJobName || jobName, data, sanitize({ priority, repeat, jobId: timedJobName }));
};

module.exports = {
    enqueue
};
