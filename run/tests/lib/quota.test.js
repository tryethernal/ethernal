require('../mocks/lib/flags');
require('../mocks/lib/env');

const { isSelfHosted } = require('../../lib/flags');
const { getDefaultPlanSlug } = require('../../lib/env');
const { canCountAtStorage, getQuotaSubscriptionId } = require('../../lib/quota');

const explorer = (slug = 'demo') => ({ stripeSubscription: { id: 42, stripePlan: { slug } } });

beforeEach(() => {
    isSelfHosted.mockReturnValue(false);
    getDefaultPlanSlug.mockReturnValue('demo');
});

describe('canCountAtStorage', () => {
    it('Should be true on a hosted instance with a default plan', () => {
        expect(canCountAtStorage()).toEqual(true);
    });

    it('Should be false when self-hosted', () => {
        isSelfHosted.mockReturnValue(true);
        expect(canCountAtStorage()).toEqual(false);
    });

    it('Should be false without a default plan slug', () => {
        getDefaultPlanSlug.mockReturnValue(undefined);
        expect(canCountAtStorage()).toEqual(false);
    });
});

describe('getQuotaSubscriptionId', () => {
    it('Should return the subscription id for a public workspace on the default plan', () => {
        expect(getQuotaSubscriptionId({ public: true }, explorer())).toEqual(42);
    });

    it('Should return null for another plan', () => {
        expect(getQuotaSubscriptionId({ public: true }, explorer('explorer-150'))).toBeNull();
    });

    it('Should return null for a private workspace', () => {
        expect(getQuotaSubscriptionId({ public: false }, explorer())).toBeNull();
    });

    it('Should return null when self-hosted', () => {
        isSelfHosted.mockReturnValue(true);
        expect(getQuotaSubscriptionId({ public: true }, explorer())).toBeNull();
    });

    it('Should return null without default plan slug, explorer, subscription, plan or workspace', () => {
        getDefaultPlanSlug.mockReturnValue(undefined);
        expect(getQuotaSubscriptionId({ public: true }, explorer())).toBeNull();
        getDefaultPlanSlug.mockReturnValue('demo');
        expect(getQuotaSubscriptionId({ public: true }, null)).toBeNull();
        expect(getQuotaSubscriptionId({ public: true }, { stripeSubscription: null })).toBeNull();
        expect(getQuotaSubscriptionId({ public: true }, { stripeSubscription: { id: 1 } })).toBeNull();
        expect(getQuotaSubscriptionId(null, explorer())).toBeNull();
    });
});
