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
const { Explorer } = require('../mocks/models');
require('../mocks/lib/queue');

const processStripeSubscription = require('../../jobs/processStripeSubscription');

beforeEach(() => jest.clearAllMocks());

describe('processStripeSubscription', () => {
    it('Should send the delete command & return with message if no explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockReturnValueOnce(null);

        processStripeSubscription({ data: { explorerSlug: 'slug' }})
            .then(res => {
                expect(mockPm2Delete).toBeCalledWith('slug')
                expect(res).toEqual('Process deleted (no explorer).');
                done();
            });
    });

    it('Should send the delete command & return with message if no subscription', (done) => {
        jest.spyOn(Explorer, 'findOne').mockReturnValueOnce({
            slug: 'slug',
            getStripeSubscription: jest.fn().mockResolvedValue(null)
        });

        processStripeSubscription({ data: { explorerSlug: 'slug' }})
            .then(res => {
                expect(mockPm2Delete).toHaveBeenCalledWith('slug');
                expect(res).toEqual('Process deleted (no subscription).');
                done();
            });
    });

    it('Should start the process', (done) => {
        jest.spyOn(Explorer, 'findOne').mockReturnValueOnce({
            slug: 'slug',
            workspaceId: 1,
            getStripeSubscription: jest.fn().mockResolvedValue({ id: 'sub' })
        });

        mockPm2Find.mockResolvedValue({ data: null });

        processStripeSubscription({ data: { explorerSlug: 'slug' }})
            .then(res => {
                expect(mockPm2Start).toHaveBeenCalledWith('slug', 1);
                expect(res).toEqual('Process created.');
                done();
            })
    });

    it('Should not do anything', (done) => {
        jest.spyOn(Explorer, 'findOne').mockReturnValueOnce({
            slug: 'slug',
            getStripeSubscription: jest.fn().mockResolvedValue({ id: 'sub' })
        });

        mockPm2Find.mockResolvedValue({ data: { id: 1 }});

        processStripeSubscription({ data: { explorerSlug: 'slug' }})
            .then(res => {
                expect(mockPm2Start).not.toHaveBeenCalled();
                expect(mockPm2Delete).not.toHaveBeenCalled();
                expect(res).toEqual('No process change.');
                done();
            })
    });
});
