const queues = require('../queues');

const uniqueQueues = ['blockSync', 'transactionSync']

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    const timedJobName = uniqueQueues.indexOf(queueName) < 0 ? `${jobName}-${Date.now()}` : jobName;
    return queues[queueName].add(timedJobName, data, { priority, repeat, jobId: timedJobName });
};

module.exports = {
    enqueue
};
