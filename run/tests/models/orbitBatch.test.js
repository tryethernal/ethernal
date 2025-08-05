const { setupTests, teardownTests } = require('../setupJestMocks');
const { OrbitBatch, Workspace, User } = require('../../models');

beforeAll(async () => {
    await setupTests();
});

afterAll(async () => {
    await teardownTests();
});

describe('OrbitBatch Model', () => {
    let user, workspace;

    beforeEach(async () => {
        // Create test user and workspace
        user = await User.create({
            id: 1,
            firebaseUserId: 'test-uid',
            email: 'test@example.com'
        });

        workspace = await Workspace.create({
            id: 1,
            name: 'test-workspace',
            userId: user.id,
            chainId: 421614,
            rpcServer: 'http://localhost:8545'
        });
    });

    afterEach(async () => {
        // Clean up
        await OrbitBatch.destroy({ where: {} });
        await Workspace.destroy({ where: {} });
        await User.destroy({ where: {} });
    });

    describe('create', () => {
        it('should create a batch with required fields', async () => {
            const batchData = {
                workspaceId: workspace.id,
                batchSequenceNumber: 12345,
                parentChainBlockNumber: 18900000,
                parentChainTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                postedAt: new Date()
            };

            const batch = await OrbitBatch.create(batchData);

            expect(batch.id).toBeDefined();
            expect(batch.workspaceId).toBe(workspace.id);
            expect(batch.batchSequenceNumber).toBe(12345);
            expect(batch.confirmationStatus).toBe('pending');
            expect(batch.transactionCount).toBe(0);
        });

        it('should enforce unique constraint on workspace + batch sequence number', async () => {
            const batchData = {
                workspaceId: workspace.id,
                batchSequenceNumber: 12345,
                parentChainBlockNumber: 18900000,
                parentChainTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                postedAt: new Date()
            };

            // Create first batch
            await OrbitBatch.create(batchData);

            // Try to create duplicate batch
            await expect(OrbitBatch.create(batchData)).rejects.toThrow();
        });
    });

    describe('instance methods', () => {
        let batch;

        beforeEach(async () => {
            batch = await OrbitBatch.create({
                workspaceId: workspace.id,
                batchSequenceNumber: 12345,
                parentChainBlockNumber: 18900000,
                parentChainTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                postedAt: new Date(Date.now() - 60000), // 1 minute ago
                transactionCount: 5,
                l1GasUsed: 100000,
                l1GasPrice: '20000000000', // 20 gwei
                l1Cost: '2000000000000000', // 0.002 ETH
                confirmationStatus: 'pending'
            });
        });

        describe('getStatusInfo', () => {
            it('should return correct status info for pending batch', () => {
                const statusInfo = batch.getStatusInfo();
                
                expect(statusInfo.label).toBe('Pending');
                expect(statusInfo.color).toBe('warning');
                expect(statusInfo.description).toContain('awaiting confirmation');
            });

            it('should return correct status info for finalized batch', async () => {
                await batch.update({ confirmationStatus: 'finalized' });
                const statusInfo = batch.getStatusInfo();
                
                expect(statusInfo.label).toBe('Finalized');
                expect(statusInfo.color).toBe('success');
                expect(statusInfo.description).toContain('cannot be challenged');
            });
        });

        describe('getTimingInfo', () => {
            it('should calculate age correctly', () => {
                const timingInfo = batch.getTimingInfo();
                
                expect(timingInfo.ageMs).toBeGreaterThan(50000); // > 50 seconds
                expect(timingInfo.ageFormatted).toContain('m'); // Should show minutes
            });

            it('should include confirmation timing when confirmed', async () => {
                const confirmedAt = new Date();
                await batch.update({ 
                    confirmationStatus: 'confirmed',
                    confirmedAt: confirmedAt
                });

                const timingInfo = batch.getTimingInfo();
                
                expect(timingInfo.confirmedAt).toBeDefined();
                expect(timingInfo.timeToConfirmMs).toBeGreaterThan(0);
                expect(timingInfo.timeToConfirmFormatted).toBeDefined();
            });
        });

        describe('getEconomics', () => {
            it('should calculate economics correctly', () => {
                const economics = batch.getEconomics();
                
                expect(economics.l1GasUsed).toBe(100000);
                expect(economics.l1GasPriceGwei).toBe('20.00');
                expect(economics.l1CostEth).toBe('0.002000');
                expect(economics.costPerTransactionEth).toBeDefined();
            });
        });

        describe('updateConfirmationStatus', () => {
            it('should update status and set timestamps', async () => {
                await batch.updateConfirmationStatus('confirmed', { note: 'test confirmation' });

                await batch.reload();
                expect(batch.confirmationStatus).toBe('confirmed');
                expect(batch.confirmedAt).toBeDefined();
                expect(batch.metadata.note).toBe('test confirmation');
            });

            it('should set finalizedAt when finalizing', async () => {
                await batch.updateConfirmationStatus('finalized');

                await batch.reload();
                expect(batch.confirmationStatus).toBe('finalized');
                expect(batch.finalizedAt).toBeDefined();
            });
        });

        describe('getSummary', () => {
            it('should return summary with all key information', () => {
                const summary = batch.getSummary();
                
                expect(summary.batchSequenceNumber).toBe(12345);
                expect(summary.transactionCount).toBe(5);
                expect(summary.status).toBeDefined();
                expect(summary.timing).toBeDefined();
                expect(summary.economics).toBeDefined();
            });
        });
    });

    describe('static methods', () => {
        beforeEach(async () => {
            // Create test batches
            for (let i = 0; i < 5; i++) {
                await OrbitBatch.create({
                    workspaceId: workspace.id,
                    batchSequenceNumber: 1000 + i,
                    parentChainBlockNumber: 18900000 + i,
                    parentChainTxHash: `0x${i.toString().padStart(64, '0')}`,
                    postedAt: new Date(Date.now() - i * 60000), // i minutes ago
                    transactionCount: i * 2,
                    confirmationStatus: i % 2 === 0 ? 'pending' : 'confirmed'
                });
            }
        });

        describe('findBatchesWithPagination', () => {
            it('should return paginated batches', async () => {
                const result = await OrbitBatch.findBatchesWithPagination(workspace.id, {
                    page: 1,
                    limit: 3
                });

                expect(result.batches).toHaveLength(3);
                expect(result.pagination.total).toBe(5);
                expect(result.pagination.totalPages).toBe(2);
                expect(result.pagination.hasNext).toBe(true);
                expect(result.pagination.hasPrev).toBe(false);
            });

            it('should filter by status', async () => {
                const result = await OrbitBatch.findBatchesWithPagination(workspace.id, {
                    status: 'pending'
                });

                expect(result.batches).toHaveLength(3); // 0, 2, 4
                result.batches.forEach(batch => {
                    expect(batch.status.label).toBe('Pending');
                });
            });

            it('should sort by sequence number descending by default', async () => {
                const result = await OrbitBatch.findBatchesWithPagination(workspace.id);

                expect(result.batches[0].batchSequenceNumber).toBe(1004);
                expect(result.batches[1].batchSequenceNumber).toBe(1003);
                expect(result.batches[2].batchSequenceNumber).toBe(1002);
            });
        });

        describe('getBatchStatistics', () => {
            it('should return status distribution and daily stats', async () => {
                const stats = await OrbitBatch.getBatchStatistics(workspace.id, 1);

                expect(stats.statusDistribution).toBeDefined();
                expect(stats.statusDistribution.pending).toBe(3);
                expect(stats.statusDistribution.confirmed).toBe(2);
                expect(stats.dailyStats).toBeDefined();
                expect(Array.isArray(stats.dailyStats)).toBe(true);
            });
        });
    });

    describe('associations', () => {
        it('should belong to workspace', async () => {
            const batch = await OrbitBatch.create({
                workspaceId: workspace.id,
                batchSequenceNumber: 12345,
                parentChainBlockNumber: 18900000,
                parentChainTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                postedAt: new Date()
            });

            const batchWithWorkspace = await OrbitBatch.findByPk(batch.id, {
                include: ['workspace']
            });

            expect(batchWithWorkspace.workspace).toBeDefined();
            expect(batchWithWorkspace.workspace.name).toBe('test-workspace');
        });
    });
});