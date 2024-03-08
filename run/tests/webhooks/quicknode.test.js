require('../mocks/lib/queue');
require('../mocks/lib/env');
require('../mocks/lib/flags');
require('../mocks/lib/crypto');
require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
require('../mocks/middlewares/quicknode');

const db = require('../../lib/firebase');
const crypto = require('../../lib/crypto');
const { enqueue } = require('../../lib/queue');
const { ProviderConnector } = require('../../lib/rpc');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/webhooks/quicknode';

describe(`DELETE ${BASE_URL}/deprovision`, () => {
    beforeEach(() => jest.clearAllMocks());

    const data = {
        'quicknode-id': '123',
        'endpoint-id': '123'
    };

    it('Should send success if no user', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce(null);
        request.delete(`${BASE_URL}/deprovision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should send success if no explorer', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce(null);
        request.delete(`${BASE_URL}/deprovision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should delete everything and send success', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce({ id: 1, workspaceId: 2 });
        request.delete(`${BASE_URL}/deprovision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1);
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                expect(db.markWorkspaceForDeletion).toHaveBeenCalledWith(2);
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-2', expect.anything());
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-2', { workspaceId: 2 });
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/deactivate`, () => {
    beforeEach(() => jest.clearAllMocks());

    const data = {
        'quicknode-id': '123',
        'endpoint-id': '123'
    };

    it('Should send success if no user', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce(null);
        request.delete(`${BASE_URL}/deactivate`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should send success if no explorer', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce(null);
        request.delete(`${BASE_URL}/deactivate`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should delete everything and send success', (done) => {
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce({ id: 1, workspaceId: 2 });
        request.delete(`${BASE_URL}/deactivate`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(db.deleteExplorerSubscription).toHaveBeenCalledWith(1, 1);
                expect(db.deleteExplorer).toHaveBeenCalledWith(1, 1);
                expect(db.markWorkspaceForDeletion).toHaveBeenCalledWith(2);
                expect(enqueue).toHaveBeenCalledWith('workspaceReset', 'workspaceReset-2', expect.anything());
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-2', { workspaceId: 2 });
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/sso`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should throw an error if no user', (done) => {
        jest.spyOn(crypto, 'decode').mockResolvedValueOnce({ quicknode_id: '123' });
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/sso?jwt=a`)
            .expect(401)
            .then(({ text }) => {
                expect(text).toEqual('Could not find user.');
                done();
            });
    });

    it('Should redirect to sso view', (done) => {
        jest.spyOn(crypto, 'decode').mockResolvedValueOnce({ quicknode_id: '123' });
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ apiToken: 'xxx', explorers: [{ id: 1 }]});
        request.get(`${BASE_URL}/sso?jwt=a`)
            .expect(302)
            .expect('Location', 'ethernal.com/sso?explorerId=1&apiToken=xxx')
            .end(done);
    });
});

describe(`UPDATE ${BASE_URL}/update`, () => {
    beforeEach(() => jest.clearAllMocks());

    const data = {
        'quicknode-id': '123',
        'endpoint-id': '123',
        plan: 'appchain'
    };

    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce(null);
        request.put(`${BASE_URL}/update`)
            .send(data)
            .expect(401)
            .then(({ text }) => {
                expect(text).toEqual('Cannot find explorer.');
                done();
            });
    });

    it('Should throw an error if invalid plan slug', (done) => {
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null)
        request.put(`${BASE_URL}/update`)
            .send(data)
            .expect(401)
            .then(({ text }) => {
                expect(text).toEqual('Cannot find plan.');
                done();
            });
    });

    it('Should return success if same plan', (done) => {
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'appchain' }}});
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ slug: 'appchain' });
        request.put(`${BASE_URL}/update`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should update the subscription and return success', (done) => {
        jest.spyOn(db, 'findQuicknodeExplorer').mockResolvedValueOnce({ id: 1, stripeSubscription: { stripePlan: { slug: 'team' }}});
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ id: 1, slug: 'appchain' });
        request.put(`${BASE_URL}/update`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(db.updateQuicknodeSubscription).toHaveBeenCalledWith('123', '123', 1);
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/provision`, () => {
    beforeEach(() => jest.clearAllMocks());

    const data = {
        'http-url': '123',
        'quicknode-id': '123',
        'endpoint-id': '123',
        plan: 'appchain'
    };

    it('Should throw an error if rpc is not reachable', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue()
        }));
        request.post(`${BASE_URL}/provision`)
            .send(data)
            .expect(401)
            .then(({ text }) => {
                expect(text).toEqual(`Our servers can't query this rpc, please use a rpc that is reachable from the internet.`);
                done();
            });
    });

    it('Should return a 401 if plan slug is invalid', (done) => {
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce(null);
        request.post(`${BASE_URL}/provision`)
            .send(data)
            .expect(401)
            .then(() => {
                done();
            });
    });

    it('Should return success if workspace already exists for this endpoint', (done) => {
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ slug: 'appchain' });
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'findQuicknodeWorkspace').mockResolvedValueOnce({ id: 1 });
        request.post(`${BASE_URL}/provision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should return success if already an explorer for this user', (done) => {
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ slug: 'appchain' });
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1, explorers: [{}]});
        jest.spyOn(db, 'findQuicknodeWorkspace').mockResolvedValueOnce(null);
        jest.spyOn(db, 'createQuicknodeWorkspace').mockResolvedValueOnce({ id: 1 });

        request.post(`${BASE_URL}/provision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success' });
                done();
            });
    });

    it('Should return success & links if explorer has been created', (done) => {
        jest.spyOn(db, 'getStripePlan').mockResolvedValueOnce({ slug: 'appchain' });
        jest.spyOn(db, 'findQuicknodeUser').mockResolvedValueOnce({ id: 1, explorers: []});
        jest.spyOn(db, 'findQuicknodeWorkspace').mockResolvedValueOnce(null);
        jest.spyOn(db, 'createQuicknodeWorkspace').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'createExplorerFromWorkspace').mockResolvedValueOnce({
            domain: 'explorer',
            'dashboard-url': 'dashboard'
        });
        request.post(`${BASE_URL}/provision`)
            .send(data)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ status: 'success', 'access-url': 'explorer', 'dashboard-url': 'a/webhooks/quicknode/sso' });
                done();
            });
    });
});

