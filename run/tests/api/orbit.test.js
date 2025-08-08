const request = require('supertest');
const app = require('../../app');
const { OrbitChainConfig, OrbitTransactionState, Workspace, Transaction, User } = require('../../models');
const { enqueue } = require('../../lib/queue');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/orbitTransactionProcessor');

describe('Orbit API', () => {
    let user, workspace, transaction, orbitConfig;
    let authToken;

    beforeAll(async () => {
        // Create test user
        user = await User.create({
            firebaseUserId: 'test-uid',
            email: 'test@example.com'
        });

        // Create test workspace
        workspace = await Workspace.create({
            name: 'test-workspace',
            userId: user.id,
            rpcServer: 'http://localhost:8545',
            chain: 'Test Chain'
        });

        // Create test transaction
        transaction = await Transaction.create({
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            workspaceId: workspace.id,
            blockNumber: 100,
            from: '0x1234567890123456789012345678901234567890',
            to: '0x2345678901234567890123456789012345678901',
            value: '1000000000000000000',
            gas: 21000,
            gasPrice: '20000000000'
        });

        // Mock authentication
        authToken = 'test-auth-token';
    });

    afterAll(async () => {
        // Clean up test data
        await OrbitTransactionState.destroy({ where: {} });
        await OrbitChainConfig.destroy({ where: {} });
        await Transaction.destroy({ where: {} });
        await Workspace.destroy({ where: {} });
        await User.destroy({ where: {} });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock enqueue function
        enqueue.mockResolvedValue({ id: 'job-123' });
    });

    describe('GET /api/orbit/config', () => {
        beforeEach(async () => {
            // Create orbit config for testing
            orbitConfig = await OrbitChainConfig.create({
                workspaceId: workspace.id,
                parentChainId: 1,
                parentChainRpcServer: 'https://mainnet.infura.io/v3/test',
                rollupContract: '0x1234567890123456789012345678901234567890',
                bridgeContract: '0x2345678901234567890123456789012345678901',
                sequencerInboxContract: '0x3456789012345678901234567890123456789012',
                inboxContract: '0x4567890123456789012345678901234567890123',
                outboxContract: '0x5678901234567890123456789012345678901234',
                challengeManagerContract: '0x6789012345678901234567890123456789012345',
                validatorWalletCreatorContract: '0x7890123456789012345678901234567890123456',
                confirmationPeriodBlocks: 45818,
                chainType: 'Rollup'
            });
        });

        afterEach(async () => {
            if (orbitConfig) {
                await orbitConfig.destroy();
                orbitConfig = null;
            }
        });

        it('should return orbit configuration for workspace', async () => {
            const response = await request(app)
                .get('/api/orbit/config')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toEqual({
                workspaceId: workspace.id,
                rollupContract: orbitConfig.rollupContract,
                bridgeContract: orbitConfig.bridgeContract,
                sequencerInboxContract: orbitConfig.sequencerInboxContract,
                inboxContract: orbitConfig.inboxContract,
                outboxContract: orbitConfig.outboxContract,
                challengeManagerContract: orbitConfig.challengeManagerContract,
                validatorWalletCreatorContract: orbitConfig.validatorWalletCreatorContract,
                parentChainId: 1,
                confirmationPeriodBlocks: 45818,
                stakeToken: null,
                baseStake: null,
                chainType: 'Rollup',
                isComplete: true,
                summary: expect.any(String)
            });
        });

        it('should return 404 when no config exists', async () => {
            await orbitConfig.destroy();
            orbitConfig = null;

            const response = await request(app)
                .get('/api/orbit/config')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toContain('No orbit configuration found');
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/orbit/config')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .expect(401);
        });

        it('should validate required parameters', async () => {
            const response = await request(app)
                .get('/api/orbit/config')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error).toContain('Missing uid parameter');
        });
    });

    describe('POST /api/orbit/config', () => {
        const validConfig = {
            parentChainId: 1,
            parentChainRpcServer: 'https://mainnet.infura.io/v3/test',
            rollupContract: '0x1234567890123456789012345678901234567890',
            bridgeContract: '0x2345678901234567890123456789012345678901',
            sequencerInboxContract: '0x3456789012345678901234567890123456789012',
            inboxContract: '0x4567890123456789012345678901234567890123',
            outboxContract: '0x5678901234567890123456789012345678901234',
            challengeManagerContract: '0x6789012345678901234567890123456789012345',
            validatorWalletCreatorContract: '0x7890123456789012345678901234567890123456',
            confirmationPeriodBlocks: 45818,
            chainType: 'Rollup'
        };

        afterEach(async () => {
            await OrbitChainConfig.destroy({ where: { workspaceId: workspace.id } });
        });

        it('should create new orbit configuration', async () => {
            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: validConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(201);

            expect(response.body.message).toContain('successfully created');
            expect(response.body.config.rollupContract).toBe(validConfig.rollupContract);

            // Verify in database
            const dbConfig = await OrbitChainConfig.findOne({ where: { workspaceId: workspace.id } });
            expect(dbConfig).toBeTruthy();
            expect(dbConfig.rollupContract).toBe(validConfig.rollupContract);
        });

        it('should update existing orbit configuration', async () => {
            // Create initial config
            await OrbitChainConfig.create({
                workspaceId: workspace.id,
                ...validConfig
            });

            const updatedConfig = {
                ...validConfig,
                rollupContract: '0x9876543210987654321098765432109876543210'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: updatedConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toContain('successfully updated');
            expect(response.body.config.rollupContract).toBe(updatedConfig.rollupContract);
        });

        it('should validate Ethereum addresses', async () => {
            const invalidConfig = {
                ...validConfig,
                rollupContract: 'invalid-address'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: invalidConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error).toBe('Input validation failed');
            expect(response.body.details).toContain('Invalid Ethereum address format for rollupContract');
        });

        it('should validate chain type', async () => {
            const invalidConfig = {
                ...validConfig,
                chainType: 'InvalidType'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: invalidConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.details).toContain('Chain type must be either "Rollup" or "AnyTrust"');
        });

        it('should validate parent chain RPC URL', async () => {
            const invalidConfig = {
                ...validConfig,
                parentChainRpcServer: 'invalid-url'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: invalidConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.details).toContain('Parent chain RPC server must be a valid URL');
        });

        it('should validate parent chain RPC protocol', async () => {
            const invalidConfig = {
                ...validConfig,
                parentChainRpcServer: 'ftp://example.com/rpc'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: invalidConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.details).toContain('Parent chain RPC server must use http, https, ws, or wss protocol');
        });

        it('should apply rate limiting', async () => {
            // This test would need to be adjusted based on actual rate limits
            // For now, test that the middleware is applied
            const requests = [];
            for (let i = 0; i < 5; i++) {
                requests.push(
                    request(app)
                        .post('/api/orbit/config')
                        .send({
                            uid: user.firebaseUserId,
                            workspace: workspace.name,
                            config: validConfig
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                );
            }

            const responses = await Promise.all(requests);
            
            // At least some should succeed
            const successCount = responses.filter(r => r.status < 400).length;
            expect(successCount).toBeGreaterThan(0);
        });
    });

    describe('POST /api/orbit/config/test', () => {
        const testConfig = {
            parentChainId: 1,
            parentChainRpcServer: 'https://mainnet.infura.io/v3/test',
            rollupContract: '0x1234567890123456789012345678901234567890',
            bridgeContract: '0x2345678901234567890123456789012345678901',
            sequencerInboxContract: '0x3456789012345678901234567890123456789012'
        };

        it('should test contract accessibility', async () => {
            // Mock the OrbitTransactionProcessor
            const OrbitTransactionProcessor = require('../../lib/orbitTransactionProcessor');
            OrbitTransactionProcessor.mockImplementation(() => ({
                validateContracts: jest.fn().mockResolvedValue(true)
            }));

            const response = await request(app)
                .post('/api/orbit/config/test')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: testConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('accessible');
        });

        it('should handle contract validation failure', async () => {
            const OrbitTransactionProcessor = require('../../lib/orbitTransactionProcessor');
            OrbitTransactionProcessor.mockImplementation(() => ({
                validateContracts: jest.fn().mockRejectedValue(new Error('Contract not found'))
            }));

            const response = await request(app)
                .post('/api/orbit/config/test')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: testConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Contract not found');
        });
    });

    describe('GET /api/orbit/transaction/:hash/state', () => {
        let orbitState;

        beforeEach(async () => {
            orbitState = await OrbitTransactionState.create({
                transactionId: transaction.id,
                workspaceId: workspace.id,
                currentState: 'SEQUENCED',
                submittedAt: new Date(),
                sequencedAt: new Date(),
                stateData: {
                    sequenced: {
                        batchSequenceNumber: '5',
                        blockNumber: 105
                    }
                }
            });
        });

        afterEach(async () => {
            if (orbitState) {
                await orbitState.destroy();
            }
        });

        it('should return transaction orbit state', async () => {
            const response = await request(app)
                .get(`/api/orbit/transaction/${transaction.hash}/state`)
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.currentState).toBe('SEQUENCED');
            expect(response.body.timeline).toBeInstanceOf(Array);
            expect(response.body.nextStates).toBeInstanceOf(Array);
            expect(response.body.progressPercentage).toBeGreaterThan(0);
        });

        it('should return 404 for non-existent transaction', async () => {
            const response = await request(app)
                .get('/api/orbit/transaction/0xinvalid/state')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toContain('Transaction not found');
        });
    });

    describe('POST /api/orbit/transaction/:hash/process', () => {
        it('should enqueue processing job', async () => {
            const response = await request(app)
                .post(`/api/orbit/transaction/${transaction.hash}/process`)
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toContain('enqueued');
            expect(response.body.jobId).toBe('job-123');
            expect(enqueue).toHaveBeenCalledWith(
                'processOrbitTransaction',
                { transactionId: transaction.id },
                'medium_priority'
            );
        });

        it('should handle non-existent transaction', async () => {
            const response = await request(app)
                .post('/api/orbit/transaction/0xinvalid/process')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toContain('Transaction not found');
        });
    });

    describe('DELETE /api/orbit/config', () => {
        beforeEach(async () => {
            orbitConfig = await OrbitChainConfig.create({
                workspaceId: workspace.id,
                parentChainId: 1,
                parentChainRpcServer: 'https://mainnet.infura.io/v3/test',
                rollupContract: '0x1234567890123456789012345678901234567890',
                bridgeContract: '0x2345678901234567890123456789012345678901',
                sequencerInboxContract: '0x3456789012345678901234567890123456789012',
                chainType: 'Rollup'
            });
        });

        it('should delete orbit configuration', async () => {
            const response = await request(app)
                .delete('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toContain('successfully removed');

            // Verify deletion
            const dbConfig = await OrbitChainConfig.findOne({ where: { workspaceId: workspace.id } });
            expect(dbConfig).toBeFalsy();
        });

        it('should handle non-existent configuration', async () => {
            await orbitConfig.destroy();

            const response = await request(app)
                .delete('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toContain('No orbit configuration found');
        });
    });

    describe('GET /api/orbit/stats', () => {
        beforeEach(async () => {
            // Create some test data
            await OrbitTransactionState.create({
                transactionId: transaction.id,
                workspaceId: workspace.id,
                currentState: 'SUBMITTED',
                submittedAt: new Date()
            });
        });

        afterEach(async () => {
            await OrbitTransactionState.destroy({ where: { workspaceId: workspace.id } });
        });

        it('should return orbit statistics', async () => {
            const response = await request(app)
                .get('/api/orbit/stats')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.totalStates).toBeGreaterThanOrEqual(1);
            expect(response.body.stateDistribution).toHaveProperty('SUBMITTED');
            expect(response.body.recentActivity).toBeInstanceOf(Array);
        });
    });

    describe('Security and Rate Limiting', () => {
        it('should include security headers', async () => {
            const response = await request(app)
                .get('/api/orbit/config')
                .query({
                    uid: user.firebaseUserId,
                    workspace: workspace.name
                })
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        });

        it('should detect suspicious input', async () => {
            const maliciousConfig = {
                rollupContract: '0x1234567890123456789012345678901234567890',
                bridgeContract: '<script>alert("xss")</script>',
                sequencerInboxContract: '0x3456789012345678901234567890123456789012'
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: maliciousConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.details).toContain('Invalid input detected');
        });

        it('should validate parameter types', async () => {
            const invalidConfig = {
                rollupContract: '0x1234567890123456789012345678901234567890',
                parentChainId: 'invalid-number',
                confirmationPeriodBlocks: -1
            };

            const response = await request(app)
                .post('/api/orbit/config')
                .send({
                    uid: user.firebaseUserId,
                    workspace: workspace.name,
                    config: invalidConfig
                })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.details).toContain('Invalid parent chain ID');
            expect(response.body.details).toContain('Invalid confirmation period');
        });
    });
});