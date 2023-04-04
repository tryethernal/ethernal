const queues = require('../queues');

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    return queues[queueName].add(`${jobName}-${Date.now()}`, data, { priority, repeat, jobId: jobName });
};

module.exports = {
    enqueue
};
