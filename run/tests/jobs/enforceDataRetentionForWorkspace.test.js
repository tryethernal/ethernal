require('../mocks/lib/queue');

const { Workspace, StripeSubscription } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');

const enforceDataRetentionForWorkspace = require('../../jobs/enforceDataRetentionForWorkspace');

beforeEach(() => jest.clearAllMocks());

describe('enforceDataRetentionForWorkspace', () => {
    it('Should enqueue resetWorkspace tasks with the data retention limit', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([{ dataRetentionLimit: 7, id: 1, explorer: null }]);
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            {
                stripePlan: {
                    slug: 'explorer-150',
                    capabilities: { dataRetention: 7 }
                },
                explorer: { workspace: { id: 2 }}
            },
            {
                stripePlan: {
                    slug: 'explorer-150',
                    capabilities: { dataRetention: 0 },
                    explorer: { workspace: { id: 3 }}
                }
            }
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
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-2', {
                    workspaceId: 2,
                    from: new Date(0),
                    to: new Date('2023-12-08')
                });
                done();
            });
    });

    it('Should not call the resetWorkspace function', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([]);
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            {
                stripePlan: {
                    slug: 'explorer-150',
                    capabilities: { dataRetention: 0 }
                },
                explorer: { workspace: { id: 2 }}
            },
            {
                stripePlan: {
                    slug: 'explorer-150',
                    capabilities: { dataRetention: 0 },
                    explorer: { workspace: { id: 3 }}
                }
            }
        ]);

        enforceDataRetentionForWorkspace({ data: { workspaceId: 123 }})
            .then(() => {
                expect(enqueue).not.toHaveBeenCalled();
                done();
            });
    });

    it('Should enqueue a 7-day cap for free/demo plan explorers', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([]);
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            {
                stripePlan: { slug: 'free', capabilities: { dataRetention: 0 } },
                explorer: { workspace: { id: 10 } }
            },
            {
                stripePlan: { slug: 'demo', capabilities: { dataRetention: 0 } },
                explorer: { workspace: { id: 11 } }
            }
        ]);
        jest.useFakeTimers()
            .setSystemTime(new Date('2023-12-15'));

        enforceDataRetentionForWorkspace()
            .then(() => {
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-10', {
                    workspaceId: 10,
                    from: new Date(0),
                    to: new Date('2023-12-08')
                });
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-11', {
                    workspaceId: 11,
                    from: new Date(0),
                    to: new Date('2023-12-08')
                });
                done();
            });
    });

    it('Should NOT cap paid explorers on a dataRetention=0 plan', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([]);
        jest.spyOn(StripeSubscription, 'findAll').mockResolvedValueOnce([
            {
                stripePlan: { slug: 'explorer-150', capabilities: { dataRetention: 0 } },
                explorer: { workspace: { id: 99 } }
            }
        ]);

        enforceDataRetentionForWorkspace()
            .then(() => {
                expect(enqueue).not.toHaveBeenCalled();
                done();
            });
    });
});
