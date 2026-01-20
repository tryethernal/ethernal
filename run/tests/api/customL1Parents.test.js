/**
 * @fileoverview Tests for custom L1 parent API endpoints.
 */
require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');
require('../mocks/models');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);
const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { withTimeout } = require('../../lib/utils');

const BASE_URL = '/api/explorers';

jest.mock('../../lib/utils', () => ({
    ...jest.requireActual('../../lib/utils'),
    withTimeout: jest.fn()
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/explorers/availableL1Parents', () => {
    it('should return public and custom L1 parents', async () => {
        const mockParents = {
            publicParents: [
                { id: 1, name: 'Ethereum Mainnet', networkId: '1', rpcServer: 'https://mainnet.infura.io' }
            ],
            customParents: [
                { id: 2, name: 'My Custom L1', networkId: '12345', rpcServer: 'https://my-custom-l1.com' }
            ]
        };

        jest.spyOn(db, 'getAvailableL1Parents').mockResolvedValueOnce(mockParents);

        const res = await request.get(`${BASE_URL}/availableL1Parents`)
            .send({ data: { user: { id: 1 } } });

        expect(res.status).toBe(200);
        expect(res.body.publicParents).toHaveLength(1);
        expect(res.body.publicParents[0].name).toBe('Ethereum Mainnet');
        expect(res.body.customParents).toHaveLength(1);
        expect(res.body.customParents[0].name).toBe('My Custom L1');
    });

    it('should return empty arrays when no parents available', async () => {
        jest.spyOn(db, 'getAvailableL1Parents').mockResolvedValueOnce({
            publicParents: [],
            customParents: []
        });

        const res = await request.get(`${BASE_URL}/availableL1Parents`)
            .send({ data: { user: { id: 1 } } });

        expect(res.status).toBe(200);
        expect(res.body.publicParents).toHaveLength(0);
        expect(res.body.customParents).toHaveLength(0);
    });
});

describe('POST /api/explorers/customL1Parent', () => {
    it('should create a custom L1 parent with valid RPC', async () => {
        const mockWorkspace = {
            id: 5,
            name: 'My Custom L1',
            networkId: '12345',
            rpcServer: 'https://my-custom-l1.com/rpc'
        };

        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue('12345')
        }));
        withTimeout.mockResolvedValue('12345');
        jest.spyOn(db, 'createCustomL1Parent').mockResolvedValueOnce(mockWorkspace);

        const res = await request.post(`${BASE_URL}/customL1Parent`)
            .send({
                data: {
                    user: { id: 1 },
                    name: 'My Custom L1',
                    backendRpcServer: 'https://my-custom-l1.com/rpc'
                }
            });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(5);
        expect(res.body.name).toBe('My Custom L1');
        expect(res.body.networkId).toBe('12345');
    });

    it('should fail when name is missing', async () => {
        const res = await request.post(`${BASE_URL}/customL1Parent`)
            .send({
                data: {
                    user: { id: 1 },
                    backendRpcServer: 'https://my-custom-l1.com/rpc'
                }
            });

        expect(res.status).toBe(400);
        expect(res.text).toContain('Missing parameters');
    });

    it('should fail when RPC is missing', async () => {
        const res = await request.post(`${BASE_URL}/customL1Parent`)
            .send({
                data: {
                    user: { id: 1 },
                    name: 'My Custom L1'
                }
            });

        expect(res.status).toBe(400);
        expect(res.text).toContain('Missing parameters');
    });

    it('should fail when RPC is unreachable', async () => {
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockResolvedValue(null)
        }));
        withTimeout.mockResolvedValue(null);

        const res = await request.post(`${BASE_URL}/customL1Parent`)
            .send({
                data: {
                    user: { id: 1 },
                    name: 'My Custom L1',
                    backendRpcServer: 'https://unreachable-rpc.com'
                }
            });

        expect(res.status).toBe(400);
        expect(res.text).toContain("can't query this RPC");
    });
});

describe('DELETE /api/explorers/customL1Parent/:id', () => {
    it('should delete a custom L1 parent with no children', async () => {
        jest.spyOn(db, 'deleteCustomL1Parent').mockResolvedValueOnce(true);

        const res = await request.delete(`${BASE_URL}/customL1Parent/5`)
            .send({ data: { user: { id: 1 } } });

        expect(res.status).toBe(200);
        expect(db.deleteCustomL1Parent).toHaveBeenCalledWith(1, 5);
    });

    it('should fail when custom L1 parent has children', async () => {
        jest.spyOn(db, 'deleteCustomL1Parent').mockRejectedValueOnce(
            new Error('Cannot delete custom L1 parent with L2 children.')
        );

        const res = await request.delete(`${BASE_URL}/customL1Parent/5`)
            .send({ data: { user: { id: 1 } } });

        expect(res.status).toBe(400);
        expect(res.text).toContain('Cannot delete');
    });

    it('should fail when custom L1 parent not found', async () => {
        jest.spyOn(db, 'deleteCustomL1Parent').mockRejectedValueOnce(
            new Error('Custom L1 parent workspace not found')
        );

        const res = await request.delete(`${BASE_URL}/customL1Parent/999`)
            .send({ data: { user: { id: 1 } } });

        expect(res.status).toBe(400);
        expect(res.text).toContain('not found');
    });
});
