const queues = require('../queues');

const enqueue = (queueName, jobName, data, priority = 10, repeat) => {
    return queues[queueName].add(jobName, data, { priority, repeat });
};

module.exports = {
    enqueue
};
