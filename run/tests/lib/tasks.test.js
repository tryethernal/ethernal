jest.mock('@google-cloud/tasks', () => ({
    CloudTasksClient: function() {
        return {
            queuePath: jest.fn(),
            createTask: jest.fn().mockResolvedValue([{ data: 'ok' }])
        }
    }
}));
const { enqueueTask } = require('../../lib/tasks');

describe('enqueueTask', () => {
    it('Should return a response if all valid', (done) => {
        enqueueTask('blockSync', {})
            .then(result => {
                expect(result).toEqual({ data: 'ok' });
                done();
            });
    });

    it('Should throw an error if task is not allowed', (done) => {
        enqueueTask('invalidTask', {})
            .catch(error => {
                expect(error).toEqual('[enqueueTask] Unknown task');
                done();
            });
    });    
});