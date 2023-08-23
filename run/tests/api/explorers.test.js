const mockCustomersRetrieve = jest.fn();
const mockSubscriptionCreate = jest.fn();
const mockSubscriptionRetrieve = jest.fn();
const mockSubscriptionUpdate = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            customers: {
                retrieve: mockCustomersRetrieve
            },
            subscriptions: {
                create: mockSubscriptionCreate,
                retrieve: mockSubscriptionRetrieve,
                update: mockSubscriptionUpdate
            }
        }
    });
});

require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/lib/env');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const flags = require('../../lib/flags');
const authMiddleware = require('../../middlewares/auth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/explorers';

beforeEach(() => {
    jest.clearAllMocks();
    ProviderConnector.mockImplementation(() => ({
        fetchNetworkId: jest.fn().mockResolvedValue(1)
    }));
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1 });
});

describe(`PUT ${BASE_URL}/:id/subscription`, () => {
    it('Should update the plan without calling stripe if no stripeId', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { id: 1, slug: 'slug' }}});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });

        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).not.toHaveBeenCalled();
                expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
                expect(db.updateExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });

    it('Should return an error if invalid explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { newStripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should return an error if plan is not public', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ explorerId: 1, stripeSubscription: { stripePlan: { slug: 'slug' }, stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: false })

        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { newStripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should return an error if trying to update a canceled plan', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ explorerId: 1, stripeSubscription: { isPendingCancelation: true, stripePlan: { slug: 'slug' }, stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: false })

        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { newStripePlanSlug: 'slug-2' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Revert plan cancelation before choosing a new plan.`);
                done();
            });
    });

    it('Should update the subscription and return a 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'slug' }, stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId', items: { data: [{ id: 'itemId' }]}});

        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).toHaveBeenCalledWith('subscriptionId', { expand: ['customer']});
                expect(mockSubscriptionUpdate).toBeCalledWith('subscriptionId', {
                    cancel_at_period_end: false,
                    proration_behavior: 'always_invoice',
                    items: [{
                        id: 'itemId',
                        price: 'priceId'
                    }]
                });
                expect(db.updateExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });

    it('Should revert subscription cancelation and return a 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { isPendingCancelation: true, stripePlan: { slug: 'slug' }, stripeId: 'subscriptionId' }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId', items: { data: [{ id: 'itemId' }]}});

        request.put(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).toHaveBeenCalledWith('subscriptionId', { expand: ['customer']});
                expect(mockSubscriptionUpdate).toBeCalledWith('subscriptionId', {
                    cancel_at_period_end: false,
                    proration_behavior: 'always_invoice',
                    items: [{
                        id: 'itemId',
                        price: 'priceId'
                    }]
                });
                expect(db.revertExplorerSubscriptionCancelation).toHaveBeenCalled();
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id/subscription`, () => {
    it('Should  cancel the subscription without calling stripe if no stripeId', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'slug' }}});

        request.delete(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).not.toHaveBeenCalled();
                expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
                expect(db.cancelExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        request.delete(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should cancel the subscription and return a 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 'subscriptionId' }});
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId' });

        request.delete(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1 }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).toHaveBeenCalledWith('subscriptionId');
                expect(mockSubscriptionUpdate).toBeCalledWith('subscriptionId', { cancel_at_period_end: true });
                expect(db.cancelExplorerSubscription).toHaveBeenCalled();
                done();
            });
    });
});

describe(`POST ${BASE_URL}/1/cryptoSubscription`, () => {
    it('Should return an error if crypto payment is not enabled', (done) => {
        request.post(`${BASE_URL}/1/cryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Crypto payment is not available for your account. Please reach out to contact@tryethernal.com if you'd like to enable it.`);
                done();
            });
    });

    it('Should return an error if plan is not public', (done) => {
        authMiddleware.mockImplementation((req, res, next) => {
            req.body.data = { 
                ...(req.body.data || {}),
                uid: '123',
                user: { id: 1, cryptoPaymentEnabled: true }
            };
            next();
        });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: false })

        request.post(`${BASE_URL}/1/cryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should create the subscription and return a 200', (done) => {
        authMiddleware.mockImplementation((req, res, next) => {
            req.body.data = { 
                ...(req.body.data || {}),
                uid: '123',
                user: { id: 1, cryptoPaymentEnabled: true, stripeCustomerId: 'customerId' }
            };
            next();
        });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValue({ public: true, stripePriceId: 'priceId' });

        request.post(`${BASE_URL}/1/cryptoSubscription`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionCreate).toBeCalledWith({
                    customer: 'customerId',
                    collection_method: 'send_invoice',
                    days_until_due: 7,
                    items: [
                        { price: 'priceId' }
                    ],
                    metadata: { explorerId: 1 }
                });
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id`, () => {
    it('Should return 200', (done) => {
        jest.spyOn(db, 'deleteExplorer').mockResolvedValueOnce();

        request.delete(`${BASE_URL}/123`)
            .expect(200)
            .then(() => done());
    });
});

describe(`GET ${BASE_URL}/plans`, () => {
    it('Should return plans', (done) => {
        jest.spyOn(db, 'getExplorerPlans').mockResolvedValueOnce([{ slug: 'my-plan' }]);

        request.get(`${BASE_URL}/plans`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ slug: 'my-plan' }]);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:id/domains`, () => {
    it('Should return an error if trying to add an app domain domain', (done) => {
        request.post(`${BASE_URL}/123/domains`)
            .send({ data: { domain: 'test.ethernal.com' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`You can only have one ethernal.com domain. If you'd like a different one, update the "Ethernal Domain" field, in the "Settings" panel.`);
                done();
            });
    });

    it('Should return an error if the explorer does not exist', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/123/domains`)
            .send({ data: { domain: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should return 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerDomain').mockResolvedValueOnce();

        request.post(`${BASE_URL}/123/domains`)
            .send({ data: { domain: 'test' }})
            .expect(200)
            .then(() => done());
    });
});

describe(`POST ${BASE_URL}/:id/branding`, () => {
    it('Should return an error if the explorer does not exist', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/:id/branding`)
            .send({ data: { domain: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should return 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'updateExplorerBranding').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/:id/branding`)
            .send({ data: { themes: {} }})
            .expect(200)
            .then(() => done());
    });
});

describe(`POST ${BASE_URL}/:id/settings`, () => {
    it('Should return an error if the explorer does not exist', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/123/settings`)
            .send({ data: { name: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should update workspace & return 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, workspace: { name: 'hardhat' }});
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/123/settings`)
            .send({ data: { workspace: 'New Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.updateExplorerWorkspace).toHaveBeenCalled();
                done();
            });
    });

    it('Should return an error if trying to update to an invalid workspace', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, workspace: { name: 'hardhat' }});
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/123/settings`)
            .send({ data: { workspace: 'New Workspace' }})
            .expect(400)
            .then(({ text }) => {
                expect(db.updateExplorerWorkspace).not.toHaveBeenCalled();
                expect(text).toEqual('Invalid workspace.');
                done();
            });
    });

    it('Should update settings & return 200', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, workspace: { name: 'hardhat' }});
        jest.spyOn(db, 'updateExplorerSettings').mockResolvedValueOnce();

        request.post(`${BASE_URL}/:id/settings`)
            .send({ data: { name: 'New name' }})
            .expect(200)
            .then(() => done());
    });
});

describe(`POST ${BASE_URL}`, () => {
    it('Should return an error if explorer cannot be created', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }] });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce(null);

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not create explorer.');
                done();
            });
    });

    it('Should create a demo subscription if stripe user has demo flag', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, canUseDemoPlan: true, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1 });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(flags, 'isStripeEnabled').mockReturnValueOnce(true);

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.getStripePlan).toHaveBeenCalledWith('selfhosted');
                expect(db.createExplorerSubscription).toHaveBeenCalled();
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should create a self hosted subscription if stripe is not enabled', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1 });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(flags, 'isStripeEnabled').mockReturnValueOnce(false);

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.getStripePlan).toHaveBeenCalledWith('selfhosted');
                expect(db.createExplorerSubscription).toHaveBeenCalled();
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should not start a subscription if stripe plan does not exist', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { plan: 'slug', domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should throw an error if the rpc is not reachable', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ id: 1, rpcServer: 'rpc' });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue()
        }));

        request.post(BASE_URL)
            .send({ data: { plan: 'slug', domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
                done();
            });
    });

    it('Should not start a subscription if crypto payment not enabled & no payment method', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: 'customerId', workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId' });
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: null })

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { plan: 'slug', domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`There doesn't seem to be a payment method associated to your account. If you never subscribed to an explorer plan, please start your first one using the dashboard. You can also reach out to support on Discord or at contact@tryethernal.com.`);
                done();
            });
    });

    it('Should start a subscription if crypto payment not enabled & payment method available', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: 'customerId', workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId' });
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: 'card' })

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { plan: 'slug', domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(mockSubscriptionCreate).toHaveBeenCalledWith({
                    customer: 'customerId',
                    items: [{ price: 'priceId' }],
                    metadata: { explorerId: 1 }
                });
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should start a subscription if crypto payment enabled', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, cryptoPaymentEnabled: true, stripeCustomerId: 'customerId', workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId' });
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: 'card' })

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { plan: 'slug', domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(mockSubscriptionCreate).toHaveBeenCalledWith({
                    customer: 'customerId',
                    items: [{ price: 'priceId' }],
                    metadata: { explorerId: 1 },
                    collection_method: 'send_invoice',
                    days_until_due: 7
                });
                expect(body).toEqual({ id: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/search`, () => {
    it('Should return a 200 if this is admin domain', (done) => {
        request.get(`${BASE_URL}/search?domain=app.ethernal.com`)
            .expect(200)
            .then(() => done());
    });

    it('Should return the correct explorer if this is a base subdomain', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({
            stripeSubscription: { stripePlan: { capabilities: { nativeToken: true }}},
            slug: 'ethernal', name: 'Ethernal Explorer', themes: { default: {}}
        });
        request.get(`${BASE_URL}/search?domain=ethernal.ethernal.com`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    explorer: {
                        stripeSubscription: { stripePlan: { capabilities: { nativeToken: true }}},
                        slug: 'ethernal', name: 'Ethernal Explorer', themes: { default: {}}
                    }
                });
                done();
            });
    });

    it('Should return the corresponding explorer when passed a domain', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsByDomain').mockResolvedValueOnce({
            stripeSubscription: { stripePlan: { capabilities: { nativeToken: true, totalSupply: '1' }}},
            slug: 'ethernal', name: 'Ethernal Explorer', themes: { default: {}}
        });
        request.get(`${BASE_URL}/search?domain=explorer.domain.com`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    explorer: {
                        stripeSubscription: { stripePlan: { capabilities: { nativeToken: true, totalSupply: '1' }}},
                        slug: 'ethernal', name: 'Ethernal Explorer', themes: { default: {}}
                    }
                });
                done();
            });
    });

    it('Should return an error if explorer does not exist', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsByDomain').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/search?domain=ethernal.domain.com`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't find explorer.`);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id`, () => {
    it('Should return the explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        request.get(`${BASE_URL}/123`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should return an error if explorer does not exist', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/123`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Could not find explorer.`);
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return user explorers', (done) => {
        jest.spyOn(db, 'getUserExplorers').mockResolvedValueOnce([{ id: 1 }]);
        request.get(BASE_URL)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ id: 1 }]);
                done();
            });
    });
});
