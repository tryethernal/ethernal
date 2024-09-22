const mockCustomersRetrieve = jest.fn();
const mockSubscriptionCreate = jest.fn();
const mockSubscriptionRetrieve = jest.fn();
const mockSubscriptionUpdate = jest.fn();
const mockSubscriptionItemDelete = jest.fn();
const mockInvoiceListUpcomingLines = jest.fn();
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
            },
            subscriptionItems: {
                del: mockSubscriptionItemDelete
            },
            invoices: {
                listUpcomingLines: mockInvoiceListUpcomingLines
            }
        }
    });
});

require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/utils');
require('../mocks/lib/firebase');
require('../mocks/lib/pm2');
require('../mocks/lib/flags');
require('../mocks/lib/env');
require('../mocks/middlewares/auth');
const { Explorer } = require('../mocks/models');
const { enqueue, bulkEnqueue } = require('../../lib/queue');
const db = require('../../lib/firebase');
const PM2 = require('../../lib/pm2');
const { ProviderConnector, DexConnector } = require('../../lib/rpc');
const { withTimeout, validateBNString } = require('../../lib/utils');
const flags = require('../../lib/flags');
const authMiddleware = require('../../middlewares/auth');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/explorers';

const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

beforeEach(() => {
    jest.clearAllMocks();
    ProviderConnector.mockImplementation(() => ({
        fetchNetworkId: jest.fn().mockResolvedValue(1)
    }));
    jest.spyOn(db, 'getWorkspaceById').mockResolvedValue({ id: 1 });
});

describe(`POST ${BASE_URL}/:id/v2_dexes`, () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should throw an error if cannot get factory address', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' }
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockRejectedValueOnce('Error')
        }));

        request.post(`${BASE_URL}/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't get factory address for router. Check that the factory method is present and returns an address.`);
                done();
            });
    });

    it('Should throw an error if invalid factory address', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' }
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockResolvedValueOnce('0x123')
        }));

        request.post(`${BASE_URL}/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Invalid factory address.`);
                done();
            });
    });

    it('Should return the router address & the factory address', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({
            id: 1,
            workspace: { rpcServer: 'rpc' }
        });
        DexConnector.mockImplementation(() => ({
            getFactory: jest.fn().mockResolvedValueOnce('0x4150e51980114468aa8309bb72f027d8bff41353')
        }));
        jest.spyOn(db, 'createExplorerV2Dex').mockResolvedValueOnce({ id: 1, routerAddress: '0x123', factoryAddress: '0x456' });

        request.post(`${BASE_URL}/1/v2_dexes`)
            .send({ data: { routerAddress: '0x123', wrappedNativeTokenAddress: '0x456' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1, routerAddress: '0x123', factoryAddress: '0x456' });
                done();
            });
    });
})

describe(`POST ${BASE_URL}/:id/faucets`, () => {
    it('Should return faucet info', (done) => {
        jest.spyOn(db, 'createFaucet').mockResolvedValueOnce({ id: 1, address: '0x123' });
        request.post(`${BASE_URL}/1/faucets`)
            .send({ data: { amount: String(1 ** 18), interval: 24 * 60 }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1, address: '0x123' });
                done();
            });
    })

    it('Should throw an error if invalid amount', (done) => {
        validateBNString.mockReturnValueOnce(false);
        request.post(`${BASE_URL}/1/faucets`)
            .send({ data: { amount: '-1', interval: 24 * 60 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid amount.');
                done();
            });
    });

    it('Should throw an error if invalid interval', (done) => {
        request.post(`${BASE_URL}/1/faucets`)
            .send({ data: { amount: String(1 ** 18), interval: -1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Interval must be greater than 0.');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/billing`, () => {
    it('Should only return active explorers', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        mockInvoiceListUpcomingLines.mockResolvedValueOnce({ data: [{ amount: 10000 }, { amount: 0 }, { amount: -10000 }]});
        jest.spyOn(db, 'getStripeSubscription')
            .mockResolvedValueOnce({
                stripePlan: { name: 'Team' },
                formattedStatus: 'Active',
                stripeId: 'test'
            })
            .mockResolvedValueOnce(null);
        jest.spyOn(db, 'getUserExplorers').mockResolvedValueOnce({
            items: [
                { id: 1, name: 'Test' },
                { id: 2 }
            ]
        });

        request.get(`${BASE_URL}/billing`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    activeExplorers: [
                        { id: 1, name: 'Test', planName: 'Team', planCost: 100, subscriptionStatus: 'Active' }
                    ],
                    totalCost: 100
                });
                done();
            });
    });

    it('Should handle subscription without stripeId', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripeSubscription')
            .mockResolvedValueOnce({
                stripePlan: { name: 'Team' },
                formattedStatus: 'Active'
            });
        jest.spyOn(db, 'getUserExplorers').mockResolvedValueOnce({
            items: [
                { id: 1, name: 'Test' },
            ]
        });

        request.get(`${BASE_URL}/billing`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    activeExplorers: [
                        { id: 1, name: 'Test', planName: 'Team', planCost: 0, subscriptionStatus: 'Active' }
                    ],
                    totalCost: 0
                });
                done();
            });
    });

    it('Should handle canceled trials', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1 });
        mockInvoiceListUpcomingLines.mockRejectedValueOnce({ code: 'invoice_upcoming_none' });
        jest.spyOn(db, 'getStripeSubscription')
            .mockResolvedValueOnce({
                stripePlan: { name: 'Team' },
                formattedStatus: 'Trial',
                stripeId: 'test'
            });
        jest.spyOn(db, 'getUserExplorers').mockResolvedValueOnce({
            items: [
                { id: 1, name: 'Test' },
            ]
        });

        request.get(`${BASE_URL}/billing`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({
                    activeExplorers: [
                        { id: 1, name: 'Test', planName: 'Team', planCost: 0, subscriptionStatus: 'Trial' }
                    ],
                    totalCost: 0
                });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:id/startTrial`, () => {
    it('Should return an error if cannot find user', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Could not find user.`);
                done();
            });
    });

    it('Should return an error if user cannot trial', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ canTrial: false });

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`You've already used your trial.`);
                done();
            });
    });

    it('Should return an error if cannot find explorer', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ canTrial: true });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find explorer.');
                done();
            });
    });

    it('Should return an error if cannot find plan', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ canTrial: true });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find plan.');
                done();
            });
    });

    it('Should return an error if cannot start subscription', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ canTrial: true });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ stripePriceId: 'id' });
        mockSubscriptionCreate.mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Error while starting trial. Please try again.');
                done();
            });
    });

    it('Should return a 200 if trial has been started', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, canTrial: true });
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, stripePriceId: 'id' });
        mockSubscriptionCreate.mockResolvedValueOnce({ id: 'subscription' });
        mockCustomersRetrieve.mockResolvedValueOnce({ id: 'customer' })

        request.post(`${BASE_URL}/1/startTrial`)
            .send({ data: { stripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(db.createExplorerSubscription).toHaveBeenCalledWith(1, 1, 1, { id: 'subscription', customer: { id: 'customer' }});
                expect(db.disableUserTrial).toHaveBeenCalledWith(1);
                done();
            });
    });
});

describe(`POST ${BASE_URL}/syncExplorers`, () => {
    it('Should enqueue all explorers for processing', (done) => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            { id: 1, slug: 'explorer-1' },
            { id: 2, slug: 'explorer-2' }
        ]);
        request.post(`${BASE_URL}/syncExplorers`)
            .expect(200)
            .then(() => {
                expect(bulkEnqueue).toHaveBeenCalledWith('updateExplorerSyncingProcess', [
                    { name: 'updateExplorerSyncingProcess-1', data: { explorerSlug: 'explorer-1' }},
                    { name: 'updateExplorerSyncingProcess-2', data: { explorerSlug: 'explorer-2' }}
                ]);
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/stopSync`, () => {
    it('Should return an error if cannot find explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.put(`${BASE_URL}/1/stopSync`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't find explorer.`);
                done();
            });
    });

    it('Should stop sync', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, workspace: { rpcServer: 'rpc' }, stripeSubscription: {}});
        request.put(`${BASE_URL}/1/stopSync`)
            .expect(200)
            .then(() => {
                expect(db.stopExplorerSync).toHaveBeenCalledWith(1);
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/startSync`, () => {
    it('Should return an error if cannot find explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.put(`${BASE_URL}/1/startSync`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Couldn't find explorer.`);
                done();
            });
    });

    it('Should return an error if no subscription', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        request.put(`${BASE_URL}/1/startSync`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`No active subscription for this explorer.`);
                done();
            });
    });

    it('Should return an error if rpc not reachable', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota, workspace: { rpcServer: 'rpc' }, stripeSubscription: {}});
        withTimeout.mockRejectedValueOnce('Timeout');
        request.put(`${BASE_URL}/1/startSync`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`This explorer's RPC is not reachable. Please update it in order to start syncing.`);
                done();
            });
    });

    it('Should return an error if transaction quota has been reached', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota: jest.fn().mockResolvedValueOnce(true), workspace: { rpcServer: 'rpc' }, stripeSubscription: {}});
        request.put(`${BASE_URL}/1/startSync`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Transaction quota reached. Upgrade your plan to resume sync.`);
                done();
            });
    });

    it('Should start sync', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota, workspace: { rpcServer: 'rpc' }, stripeSubscription: {}});
        request.put(`${BASE_URL}/1/startSync`)
            .expect(200)
            .then(() => {
                expect(db.startExplorerSync).toHaveBeenCalledWith(1);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/syncStatus`, () => {
    it('Should return unreachable status if rpchealthcheck fails', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota, workspace: { rpcHealthCheck: { isReachable: false }}});
        request.get(`${BASE_URL}/1/syncStatus`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'unreachable' });
                done();
            });
    });

    it('Should return quota exceeded status', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota: jest.fn().mockResolvedValueOnce(true), workspace: { rpcHealthCheck: { isReachable: true }}});
        PM2.mockImplementation(() => ({
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        request.get(`${BASE_URL}/1/syncStatus`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'transactionQuotaReached' });
                done();
            });
    });

    it('Should return pm2 process status', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota, workspace: { rpcHealthCheck: { isReachable: true }}});
        PM2.mockImplementation(() => ({
            find: jest.fn().mockResolvedValue({ data: { pm2_env: { status: 'online' }}})
        }));
        request.get(`${BASE_URL}/1/syncStatus`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'online' });
                done();
            });
    });

    it('Should return stopped status if cannot find process', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, hasReachedTransactionQuota, workspace: { rpcHealthCheck: { isReachable: true }}});
        PM2.mockImplementation(() => ({
            find: jest.fn().mockResolvedValue({ data: { pm2_env: null }})
        }));
        request.get(`${BASE_URL}/1/syncStatus`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'stopped' });
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id/quotaExtension`, () => {
    it('Should throw an error if no explorer', done => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);
        request.delete(`${BASE_URL}/1/quotaExtension`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should return a 200 if no quota extension', done => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ stripeSubscription: {} });
        request.delete(`${BASE_URL}/1/quotaExtension`)
            .expect(200)
            .then(() => {
                done();
            });
    });

    it('Should destroy quota extension on stripe & in the db', done => {
        const reload = jest.fn();
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ stripeSubscription: { id: 1, reload, stripeQuotaExtension: { stripeId: 'id' }}});
        request.delete(`${BASE_URL}/1/quotaExtension`)
            .expect(200)
            .then(() => {
                expect(mockSubscriptionItemDelete).toHaveBeenCalledWith('id');
                expect(db.destroyStripeQuotaExtension).toHaveBeenCalledWith(1);
                expect(reload).toHaveBeenCalled();
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/quotaExtension`, () => {
    it('Should throw an error if quota < 10000', done => {
        request.put(`${BASE_URL}/1/quotaExtension`)
            .send({ data: { quota: 5, stripePlanSlug: 'quota-extension' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Quota extension needs to be at least 10,000.');
                done();
            });
    });

    it('Should throw an error if no subscription', done => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({});
        request.put(`${BASE_URL}/1/quotaExtension`)
            .send({ data: { quota: 20000, stripePlanSlug: 'quota-extension' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should throw an error if invalid plan', done => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ stripeSubscription: {} });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ capabilities: {} });
        request.put(`${BASE_URL}/1/quotaExtension`)
            .send({ data: { quota: 20000, stripePlanSlug: 'quota-extension' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should create the subscription locally & on stripe by updating the existing invoice ', done => {
        const reload = jest.fn();
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ stripeSubscription: { id: 1, stripeId: 'monthly', reload }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, capabilities: { quotaExtension: true }, stripePriceId: 'quota-extension' });
        mockSubscriptionUpdate.mockResolvedValueOnce({
            items: {
                data: [
                    { id: 'stripe-quota-id', price: { id: 'quota-extension' }}
                ]
            }
        });
        request.put(`${BASE_URL}/1/quotaExtension`)
            .send({ data: { quota: 20000, stripePlanSlug: 'quota-extension' }})
            .expect(200)
            .then(({ body }) => {
                expect(mockSubscriptionUpdate).toHaveBeenCalledWith('monthly', { cancel_at_period_end: false, proration_behavior: 'always_invoice', items: [{ price: 'quota-extension', quantity: 20000 }]});
                expect(db.createStripeQuotaExtension).toHaveBeenCalledWith(1, 'stripe-quota-id', 1, 20000);
                expect(reload).toHaveBeenCalled();
                expect(body).toEqual({ stripeSubscription: { id: 1, stripeId: 'monthly' }});
                done();
            });
    });

    it('Should update the subscription locally & on stripe by updating the existing invoice ', done => {
        const reload = jest.fn();
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ stripeSubscription: { id: 1, stripeId: 'monthly', stripeQuotaExtension: { stripeId: 'stripe-quota-id' }, reload }});
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, capabilities: { quotaExtension: true }, stripePriceId: 'quota-extension' });
        mockSubscriptionUpdate.mockResolvedValueOnce({
            items: {
                data: [
                    { price: { id: 'quota-extension' }}
                ]
            }
        });
        request.put(`${BASE_URL}/1/quotaExtension`)
            .send({ data: { quota: 20000, stripePlanSlug: 'quota-extension' }})
            .expect(200)
            .then(({ body }) => {
                expect(mockSubscriptionUpdate).toHaveBeenCalledWith('monthly', { cancel_at_period_end: false, proration_behavior: 'always_invoice', items: [{ id: 'stripe-quota-id', quantity: 20000 }]});
                expect(db.updateStripeQuotaExtension).toHaveBeenCalledWith(1, 20000);
                expect(reload).toHaveBeenCalled();
                expect(body).toEqual({ stripeSubscription: { id: 1, stripeId: 'monthly', stripeQuotaExtension: { stripeId: 'stripe-quota-id' }}});
                done();
            });
    });
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

describe(`POST ${BASE_URL}/:id/subscription`, () => {
    it('Should return a 200 if the subscription is created', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true, stripePriceId: 'priceId', capabilities: { skipBilling: true }});

        request.post(`${BASE_URL}/1/subscription`)
            .send({ data: { planSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(db.createExplorerSubscription).toHaveBeenCalledWith(1, 1, 1);
               done();
            });
    });

    it('Should return an error if no explorer found', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/subscription`)
            .send({ data: { planSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find explorer.`);
                done();
            });
    });

    it('Should return an error if there is already a subscription', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'slug' }}});

        request.post(`${BASE_URL}/1/subscription`)
            .send({ data: { planSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Explorer already has a subscription.`);
                done();
            });
    });

    it('Should return an error if cannot find plan', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}/1/subscription`)
            .send({ data: { planSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't find plan.`);
                done();
            });
    });

    it('Should return an error if plan does not have skipBilling capability', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, public: true, stripePriceId: 'priceId', capabilities: {}});

        request.post(`${BASE_URL}/1/subscription`)
            .send({ data: { planSlug: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`This plan cannot be used via the API at the moment. Start the subscription using the dashboard, or reach out to contact@tryethernal.com.`);
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id/subscription`, () => {
    it('Should  delete the subscription without calling stripe if no stripeId', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'slug' }}});

        request.delete(`${BASE_URL}/1/subscription`)
            .send({ data: { explorerId: 1, newStripePlanSlug: 'slug' }})
            .expect(200)
            .then(() => {
                expect(mockSubscriptionRetrieve).not.toHaveBeenCalled();
                expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1);
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
    it('Should return 200 if it only needs to delete the explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: null });

        request.delete(`${BASE_URL}/1`)
            .expect(200)
            .then(() => {
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should cancel the subscription with stripe and delete the explorer', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 'subscriptionId' }});
        mockSubscriptionRetrieve.mockResolvedValueOnce({ id: 'subscriptionId' });

        request.delete(`${BASE_URL}/1?cancelSubscription=true`)
            .expect(200)
            .then(() => {
                expect(db.cancelExplorerSubscription).toHaveBeenCalledWith(1, 1);
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should delete the subscription if no stripe id', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: {} });

        request.delete(`${BASE_URL}/1?cancelSubscription=true`)
            .expect(200)
            .then(() => {
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1);
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                done();
            });
    });

    it('Should return an error if trying to delete an explorer with a subscription without the cancelSubscription param', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripeId: 'subscriptionId' }});

        request.delete(`${BASE_URL}/1`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Can't delete an explorer with an active subscription.`);
                done();
            });
    });

    it('Should delete the workspace if the flag is passed', (done) => {
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, workspaceId: 1, stripeSubscription: {}});

        request.delete(`${BASE_URL}/1?cancelSubscription=true&deleteWorkspace=true`)
            .expect(200)
            .then(() => {
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1);
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                expect(db.markWorkspaceForDeletion).toHaveBeenCalledWith(1);
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-1', {
                    workspaceId: 1,
                    from: expect.any(Date),
                    to: expect.any(Date)
                });
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-1', {
                    workspaceId: 1
                });
                done();
            });
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
        jest.spyOn(db, 'createExplorerDomain').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/123/domains`)
            .send({ data: { domain: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1 });
                done()
            });
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
    it('Should create the explorer with a starting block', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: { customStartingBlock: true }});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test.rpc', name: 'explorer', plan: 'slug', startingBlock: 1 }})
            .expect(200)
            .then(({ body }) => {
                expect(db.createExplorerFromOptions).toHaveBeenCalledWith(1, {
                    rpcServer: 'test.rpc',
                    name: 'explorer',
                    networkId: 1,
                    integrityCheckStartBlockNumber: 1
                });
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should ignore the starting block param', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: {}});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test.rpc', name: 'explorer', plan: 'slug', startingBlock: 1 }})
            .expect(200)
            .then(({ body }) => {
                expect(db.createExplorerFromOptions).toHaveBeenCalledWith(1, {
                    rpcServer: 'test.rpc',
                    name: 'explorer',
                    networkId: 1
                });
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should create both the explorer and workspace', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: {}});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test.rpc', name: 'explorer', plan: 'slug' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should fail if there is already an explorer for this workspace', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1, explorer: {} }] });

        request.post(BASE_URL)
            .send({ data: { workspaceId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('This workspace already has an explorer.');
                done();
            });
    });

    it('Should not accept a rpc without a name', (done) => {
        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test.rpc' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Missing parameters.');
                done();
            });
    });

    it('Should return an error if explorer cannot be created', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 2 }], canUseDemoPlan: true });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: {}});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce(null);

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test', name: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not create explorer.');
                done();
            });
    });

    it('Should return an error if workspace id is invalid', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ workspaces: [{ id:2 }]});

        request.post(BASE_URL)
            .send({ data: { workspaceId: 1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find workspace');
                done();
            });
    });

    it('Should create a demo subscription if stripe user has demo flag', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, canUseDemoPlan: true, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: {}});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(flags, 'isStripeEnabled').mockReturnValueOnce(true);

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test', name: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.getStripePlan).toHaveBeenCalledWith('selfhosted');
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should create a self hosted subscription if stripe is not enabled', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1, capabilities: {}});
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(flags, 'isStripeEnabled').mockReturnValueOnce(false);

        request.post(BASE_URL)
            .send({ data: { rpcServer: 'test', name: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.getStripePlan).toHaveBeenCalledWith('selfhosted');
                expect(body).toEqual({ id: 1 });
                done();
            });
    });

    it('Should not start a subscription if stripe plan does not exist', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { plan: 'slug', rpcServer: 'test', name: 'test' }})
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
            .send({ data: { rpcServer: 'test', name: 'test' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
                done();
            });
    });

    it('Should not start a subscription if crypto payment not enabled & no payment method', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: 'customerId', workspaces: [{ id: 1, rpcServer: 'test' }] });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId', capabilities: {} });
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: null })

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { rpcServer: 'test', name: 'test', plan: 'slug' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual(`There doesn't seem to be a payment method associated to your account. If you never subscribed to an explorer plan, please start your first one using the dashboard. You can also reach out to support on Discord or at contact@tryethernal.com.`);
                done();
            });
    });

    it('Should start a subscription if crypto payment not enabled & payment method available', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, stripeCustomerId: 'customerId', workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId', id: 1, capabilities: {}});
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: 'card' })

        request.post(`${BASE_URL}?startSubscription=true`)
            .send({ data: { rpcServer: 'test', name: 'test', plan: 'slug' }})
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
        jest.spyOn(db, 'createExplorerFromOptions').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, stripePriceId: 'priceId', capabilities: {}});
        mockCustomersRetrieve.mockResolvedValueOnce({ default_source: 'card' })

        request.post(`${BASE_URL}?startSubscription=true`)
        .send({ data: { rpcServer: 'test', name: 'test', plan: 'slug' }})
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
        jest.spyOn(db, 'getExplorerById').mockResolvedValueOnce({ id: 1, toJSON: jest.fn().mockReturnValue({ id: 1 }) });
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
