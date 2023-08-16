const mockPm2Start = jest.fn();
const mockPm2Find = jest.fn();
const mockPm2Delete = jest.fn();

jest.mock('../../lib/pm2', () => {
    return jest.fn().mockImplementation(() => ({
        start: mockPm2Start,
        find: mockPm2Find,
        delete: mockPm2Delete
    }))
});
const { Explorer, StripeSubscription } = require('../mocks/models');
require('../mocks/lib/queue');

const processStripeSubscription = require('../../jobs/processStripeSubscription');

beforeEach(() => jest.clearAllMocks());

describe('processStripeSubscription', () => {
    it('Should says explorer does not exist', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockReturnValueOnce(null);

        processStripeSubscription({ data: { stripeSubscriptionId: 1, explorerId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find explorer.');
                done();
            })
    });

    it('Should delete the process', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockReturnValueOnce(null);
        jest.spyOn(Explorer, 'findByPk').mockReturnValueOnce({ slug: 'slug', workspaceId: 1 });

        processStripeSubscription({ data: { stripeSubscriptionId: 1, explorerId: 1 }})
            .then(res => {
                expect(mockPm2Delete).toHaveBeenCalledWith('slug');
                expect(res).toEqual('Process deleted.');
                done();
            })
    });

    it('Should start the process', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockReturnValueOnce({ id: 'subscriptionId' });
        jest.spyOn(Explorer, 'findByPk').mockReturnValueOnce({ slug: 'slug', workspaceId: 1 });
        mockPm2Find.mockResolvedValue({ data: null });

        processStripeSubscription({ data: { stripeSubscriptionId: 1, explorerId: 1 }})
            .then(res => {
                expect(mockPm2Start).toHaveBeenCalledWith('slug', 1);
                expect(res).toEqual('Process created.');
                done();
            })
    });

    it('Should not do anything', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockReturnValueOnce({ id: 'subscriptionId' });
        jest.spyOn(Explorer, 'findByPk').mockReturnValueOnce({ slug: 'slug', workspaceId: 1 });
        mockPm2Find.mockResolvedValue({ data: { id: 1 }});

        processStripeSubscription({ data: { stripeSubscriptionId: 1, explorerId: 1 }})
            .then(res => {
                expect(mockPm2Start).not.toHaveBeenCalled();
                expect(mockPm2Delete).not.toHaveBeenCalled();
                expect(res).toEqual('No process change.');
                done();
            })
    });
});
