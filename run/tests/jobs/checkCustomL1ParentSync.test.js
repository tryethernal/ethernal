require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { Workspace, OrbitChainConfig, OpChainConfig } = require('../mocks/models');
const checkCustomL1ParentSync = require('../../jobs/checkCustomL1ParentSync');

jest.mock('../../lib/queue');
jest.mock('../../lib/logger');
jest.mock('../../lib/pm2');
jest.mock('../../lib/env');

const PM2 = require('../../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../../lib/env');

beforeEach(() => jest.clearAllMocks());

describe('checkCustomL1ParentSync', () => {
    let mockPm2Instance;

    beforeEach(() => {
        getPm2Host.mockReturnValue('http://localhost:3000');
        getPm2Secret.mockReturnValue('test-secret');

        mockPm2Instance = {
            find: jest.fn(),
            start: jest.fn()
        };

        PM2.mockImplementation(() => mockPm2Instance);
    });

    it('should start sync for custom L1 parents with L2 children', async () => {
        Workspace.findAll.mockResolvedValue([
            { id: 201 },
            { id: 202 }
        ]);
        OrbitChainConfig.count.mockResolvedValue(0);
        OpChainConfig.count
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(1);
        mockPm2Instance.find.mockResolvedValue({ data: null });

        const result = await checkCustomL1ParentSync();

        expect(mockPm2Instance.start).toHaveBeenCalledWith('custom-l1-201', 201);
        expect(mockPm2Instance.start).toHaveBeenCalledWith('custom-l1-202', 202);
        expect(result.newProcesses).toEqual([201, 202]);
    });

    it('should skip workspaces with existing PM2 processes', async () => {
        Workspace.findAll.mockResolvedValue([{ id: 201 }]);
        OrbitChainConfig.count.mockResolvedValue(1);
        OpChainConfig.count.mockResolvedValue(0);
        mockPm2Instance.find.mockResolvedValue({ data: { id: 'existing' } });

        const result = await checkCustomL1ParentSync();

        expect(mockPm2Instance.start).not.toHaveBeenCalled();
        expect(result.existingProcesses).toEqual([201]);
    });

    it('should skip workspaces with no L2 children', async () => {
        Workspace.findAll.mockResolvedValue([{ id: 201 }]);
        OrbitChainConfig.count.mockResolvedValue(0);
        OpChainConfig.count.mockResolvedValue(0);

        const result = await checkCustomL1ParentSync();

        expect(PM2).not.toHaveBeenCalled();
        expect(result.skipped).toEqual([201]);
    });

    it('should return early when PM2 is not configured', async () => {
        getPm2Host.mockReturnValue(null);
        getPm2Secret.mockReturnValue(null);

        const result = await checkCustomL1ParentSync();

        expect(result).toBe('PM2 not configured');
        expect(Workspace.findAll).not.toHaveBeenCalled();
    });

    it('should handle no custom L1 parent workspaces', async () => {
        Workspace.findAll.mockResolvedValue([]);

        const result = await checkCustomL1ParentSync();

        expect(result).toEqual({ newProcesses: [], existingProcesses: [], skipped: [] });
        expect(PM2).not.toHaveBeenCalled();
    });

    it('should count Orbit children too', async () => {
        Workspace.findAll.mockResolvedValue([{ id: 201 }]);
        OrbitChainConfig.count.mockResolvedValue(2);
        OpChainConfig.count.mockResolvedValue(0);
        mockPm2Instance.find.mockResolvedValue({ data: null });

        const result = await checkCustomL1ParentSync();

        expect(mockPm2Instance.start).toHaveBeenCalledWith('custom-l1-201', 201);
        expect(result.newProcesses).toEqual([201]);
    });

    it('should continue processing other workspaces when one fails to start', async () => {
        Workspace.findAll.mockResolvedValue([{ id: 201 }, { id: 202 }]);
        OrbitChainConfig.count.mockResolvedValue(1);
        OpChainConfig.count.mockResolvedValue(0);
        mockPm2Instance.find.mockResolvedValue({ data: null });
        mockPm2Instance.start
            .mockRejectedValueOnce(new Error('PM2 error'))
            .mockResolvedValueOnce({});

        const result = await checkCustomL1ParentSync();

        expect(mockPm2Instance.start).toHaveBeenCalledTimes(2);
        expect(result.newProcesses).toEqual([202]);
    });
});
