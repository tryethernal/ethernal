/**
 * @fileoverview Tests for startCustomL1ParentSync job.
 */
require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { Workspace, OrbitChainConfig, OpChainConfig } = require('../mocks/models');
const startCustomL1ParentSync = require('../../jobs/startCustomL1ParentSync');

jest.mock('../../lib/queue');
jest.mock('../../lib/logger');
jest.mock('../../lib/pm2');
jest.mock('../../lib/env');

const PM2 = require('../../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../../lib/env');

beforeEach(() => jest.clearAllMocks());

describe('startCustomL1ParentSync', () => {
    let mockWorkspace;
    let mockPm2Instance;

    beforeEach(() => {
        jest.clearAllMocks();

        getPm2Host.mockReturnValue('http://localhost:3000');
        getPm2Secret.mockReturnValue('test-secret');

        mockWorkspace = {
            id: 113,
            name: 'My Custom L1',
            rpcServer: 'https://my-custom-l1.com/rpc',
            isCustomL1Parent: true
        };

        mockPm2Instance = {
            find: jest.fn(),
            start: jest.fn()
        };

        PM2.mockImplementation(() => mockPm2Instance);
    });

    describe('when workspace is a valid custom L1 parent', () => {
        it('should start sync when workspace has OP children', async () => {
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(0);
            OpChainConfig.count.mockResolvedValue(1);
            mockPm2Instance.find.mockResolvedValue({ data: null });
            mockPm2Instance.start.mockResolvedValue({});

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(Workspace.findByPk).toHaveBeenCalledWith(113);
            expect(OpChainConfig.count).toHaveBeenCalledWith({ where: { parentWorkspaceId: 113 } });
            expect(mockPm2Instance.start).toHaveBeenCalledWith('custom-l1-113', 113);
            expect(result).toBe('Started sync for workspace 113');
        });

        it('should start sync when workspace has Orbit children', async () => {
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(2);
            OpChainConfig.count.mockResolvedValue(0);
            mockPm2Instance.find.mockResolvedValue({ data: null });
            mockPm2Instance.start.mockResolvedValue({});

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(OrbitChainConfig.count).toHaveBeenCalledWith({ where: { parentWorkspaceId: 113 } });
            expect(mockPm2Instance.start).toHaveBeenCalledWith('custom-l1-113', 113);
            expect(result).toBe('Started sync for workspace 113');
        });

        it('should skip if sync is already running', async () => {
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(1);
            OpChainConfig.count.mockResolvedValue(0);
            mockPm2Instance.find.mockResolvedValue({ data: { pm2_env: { status: 'online' } } });

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(mockPm2Instance.start).not.toHaveBeenCalled();
            expect(result).toBe('Sync already running for workspace 113');
        });
    });

    describe('when workspace should not be synced', () => {
        it('should skip if workspace not found', async () => {
            Workspace.findByPk.mockResolvedValue(null);

            const result = await startCustomL1ParentSync({ data: { workspaceId: 999 } });

            expect(result).toBe('Workspace 999 not found');
            expect(mockPm2Instance.start).not.toHaveBeenCalled();
        });

        it('should skip if workspace is not a custom L1 parent', async () => {
            Workspace.findByPk.mockResolvedValue({ ...mockWorkspace, isCustomL1Parent: false });

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(result).toBe('Workspace 113 is not a custom L1 parent');
            expect(mockPm2Instance.start).not.toHaveBeenCalled();
        });

        it('should skip if workspace has no L2 children', async () => {
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(0);
            OpChainConfig.count.mockResolvedValue(0);

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(result).toBe('No L2 children for workspace 113');
            expect(mockPm2Instance.start).not.toHaveBeenCalled();
        });
    });

    describe('when PM2 is not configured', () => {
        it('should skip if PM2 host is not set', async () => {
            getPm2Host.mockReturnValue(null);
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(1);
            OpChainConfig.count.mockResolvedValue(0);

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(result).toBe('PM2 not configured');
            expect(mockPm2Instance.start).not.toHaveBeenCalled();
        });

        it('should skip if PM2 secret is not set', async () => {
            getPm2Secret.mockReturnValue(null);
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(1);
            OpChainConfig.count.mockResolvedValue(0);

            const result = await startCustomL1ParentSync({ data: { workspaceId: 113 } });

            expect(result).toBe('PM2 not configured');
            expect(mockPm2Instance.start).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should throw if workspaceId is missing', async () => {
            await expect(startCustomL1ParentSync({ data: {} }))
                .rejects.toThrow('Missing workspaceId parameter');
        });

        it('should throw if PM2 start fails', async () => {
            Workspace.findByPk.mockResolvedValue(mockWorkspace);
            OrbitChainConfig.count.mockResolvedValue(1);
            OpChainConfig.count.mockResolvedValue(0);
            mockPm2Instance.find.mockResolvedValue({ data: null });
            mockPm2Instance.start.mockRejectedValue(new Error('PM2 connection failed'));

            await expect(startCustomL1ParentSync({ data: { workspaceId: 113 } }))
                .rejects.toThrow('PM2 connection failed');
        });
    });
});
