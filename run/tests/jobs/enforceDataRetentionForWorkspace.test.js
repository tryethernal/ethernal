require('../mocks/lib/queue');

const { Workspace, StripeSubscription } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

const enforceDataRetentionForWorkspace = require('../../jobs/enforceDataRetentionForWorkspace');

beforeEach(() => jest.clearAllMocks());

describe('enforceDataRetentionForWorkspace', () => {
    it('Should enqueue resetWorkspace tasks with the data retention limit', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([{ dataRetentionLimit: 7, id: 1 }]);
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            { dataRetentionLimit: 7, id: 1 }
        ]);
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-15'));

            enforceDataRetentionForWorkspace()
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-1', {
                    workspaceId: 1,
                    from: new Date(0),
                    to: new Date('2023-12-08')
                });
                done();
            });
    });

    it('Should not call the resetWorkspace function', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([{ dataRetentionLimit: 0, userId: 1 }]);
        
        enforceDataRetentionForWorkspace({ data: { workspaceId: 123 }})
            .then(() => {
                expect(enqueue).not.toHaveBeenCalled();
                done();
            });
    });
});
