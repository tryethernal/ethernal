const mockCustomersRetrieve = jest.fn();
const mockSubscriptionCreate = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => {
        return {
            customers: {
                retrieve: mockCustomersRetrieve
            },
            subscriptions: {
                create: mockSubscriptionCreate
            }
        }
    });
});

require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const flags = require('../../lib/flags');


const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/explorers';

beforeEach(() => jest.clearAllMocks());

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

    it('Should create a self hosted subscription if stripe is not enabled', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, workspaces: [{ id: 1 }] });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ public: true, id: 1 });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(flags, 'isStripeEnabled').mockReturnValueOnce(false);

        request.post(BASE_URL)
            .send({ data: { domain: 'test', slug: 'test', workspaceId: 1, chainId: 1, rpcServer: 'test', theme: 'test' }})
            .expect(200)
            .then(({ body }) => {
                expect(db.getStripePlan).toHaveBeenCalledWith('self-hosted');
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
        request.get(`${BASE_URL}/search?domain=app.${process.env.APP_DOMAIN}`)
            .expect(200)
            .then(() => done());
    });

    it('Should return the correct explorer if this is a base subdomain', (done) => {
        jest.spyOn(db, 'getPublicExplorerParamsBySlug').mockResolvedValueOnce({
            stripeSubscription: { stripePlan: { capabilities: { nativeToken: true }}},
            slug: 'ethernal', name: 'Ethernal Explorer'
        });
        request.get(`${BASE_URL}/search?domain=ethernal.${process.env.APP_DOMAIN}`)
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
            slug: 'ethernal', name: 'Ethernal Explorer'
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
