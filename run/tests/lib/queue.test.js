// We do this to cancel the global mock in setupJestMock
jest.mock('../../lib/queue', () => ({
    ...jest.requireActual('../../lib/queue')
}))
require('../mocks/queues');

const { bulkEnqueue } = require('../../lib/queue');
const queues = require('../../queues');

describe('bulkEnqueue', () => {
    it('Enqueue 5 batches', async () => {
        const jobData = [];
        for (let i = 0; i < 10000; i++)
            jobData.push({ name: `job${i}`, data: { i }});

        await bulkEnqueue('test', jobData);
        expect(queues['test'].addBulk).toHaveBeenCalledTimes(5);
    });
});
