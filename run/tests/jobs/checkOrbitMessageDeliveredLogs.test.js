require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OrbitChainConfig } = require('../mocks/models');
const { ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI } = require('../../constants/orbit');
const checkOrbitMessageDeliveredLogs = require('../../jobs/checkOrbitMessageDeliveredLogs');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');
jest.mock('../../lib/pm2');
jest.mock('../../lib/env');

// Mock Sequelize Op operators
jest.mock('sequelize', () => ({
    Op: {
        ne: Symbol('ne'),
        eq: Symbol('eq'),
        gt: Symbol('gt'),
        lt: Symbol('lt'),
        gte: Symbol('gte'),
        lte: Symbol('lte'),
        in: Symbol('in'),
        notIn: Symbol('notIn'),
        like: Symbol('like'),
        notLike: Symbol('notLike'),
        iLike: Symbol('iLike'),
        notILike: Symbol('notILike'),
        between: Symbol('between'),
        notBetween: Symbol('notBetween'),
        overlap: Symbol('overlap'),
        contains: Symbol('contains'),
        contained: Symbol('contained'),
        adjacent: Symbol('adjacent'),
        strictLeft: Symbol('strictLeft'),
        strictRight: Symbol('strictRight'),
        noExtendLeft: Symbol('noExtendLeft'),
        noExtendRight: Symbol('noExtendRight'),
        and: Symbol('and'),
        or: Symbol('or'),
        any: Symbol('any'),
        all: Symbol('all'),
        values: Symbol('values'),
        col: Symbol('col'),
        placeholder: Symbol('placeholder'),
        join: Symbol('join'),
        fn: Symbol('fn'),
        literal: Symbol('literal'),
        cast: Symbol('cast'),
        json: Symbol('json'),
        where: Symbol('where'),
        jsonPath: Symbol('jsonPath'),
        attribute: Symbol('attribute'),
        identifier: Symbol('identifier'),
        match: Symbol('match'),
        regexp: Symbol('regexp'),
        notRegexp: Symbol('notRegexp'),
        iRegexp: Symbol('iRegexp'),
        notIRegexp: Symbol('notIRegexp')
    }
}));

const PM2 = require('../../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../../lib/env');
const { Op } = require('sequelize');

beforeEach(() => jest.clearAllMocks());

describe('checkOrbitMessageDeliveredLogs', () => {
    let mockOrbitConfigs;
    let mockParentWorkspace;
    let mockPm2Instance;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock environment variables
        getPm2Host.mockReturnValue('http://localhost:3000');
        getPm2Secret.mockReturnValue('test-secret');

        // Mock parent workspace
        mockParentWorkspace = {
            id: 1,
            name: 'Test Parent Workspace'
        };

        // Mock orbit configs
        mockOrbitConfigs = [
            {
                id: 1,
                workspaceId: 101,
                parentWorkspaceId: 201,
                bridgeContract: '0x1234567890123456789012345678901234567890',
                parentWorkspace: mockParentWorkspace
            },
            {
                id: 2,
                workspaceId: 102,
                parentWorkspaceId: 202,
                bridgeContract: '0x2345678901234567890123456789012345678901',
                parentWorkspace: mockParentWorkspace
            }
        ];

        // Mock PM2 instance
        mockPm2Instance = {
            find: jest.fn(),
            startLogListener: jest.fn()
        };

        // Mock PM2 constructor
        PM2.mockImplementation(() => mockPm2Instance);

        // Setup OrbitChainConfig mock
        OrbitChainConfig.findAll.mockResolvedValue(mockOrbitConfigs);
    });

    describe('when orbit configs exist with parent workspaces', () => {
        it('should start new log listeners for configs without existing processes', async () => {
            // Mock PM2 find to return no existing processes
            mockPm2Instance.find.mockResolvedValue({ data: null });

            const result = await checkOrbitMessageDeliveredLogs();

            // Verify OrbitChainConfig.findAll was called with correct filter
            expect(OrbitChainConfig.findAll).toHaveBeenCalledWith({
                where: {
                    parentWorkspaceId: { [Op.ne]: null }
                },
                include: 'parentWorkspace'
            });

            // Verify PM2 instances were created with correct parameters
            expect(PM2).toHaveBeenCalledWith('http://localhost:3000', 'test-secret');
            expect(PM2).toHaveBeenCalledTimes(2);

            // Verify find was called for each config with parent workspace
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-202');

            // Verify startLogListener was called with correct parameters
            expect(mockPm2Instance.startLogListener).toHaveBeenCalledWith(
                'logListener-201',
                JSON.stringify({
                    parentWorkspaceId: 201,
                    workspaceId: 101,
                    contractAddress: '0x1234567890123456789012345678901234567890',
                    abiFilter: JSON.stringify(ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI)
                })
            );

            expect(mockPm2Instance.startLogListener).toHaveBeenCalledWith(
                'logListener-202',
                JSON.stringify({
                    parentWorkspaceId: 202,
                    workspaceId: 102,
                    contractAddress: '0x2345678901234567890123456789012345678901',
                    abiFilter: JSON.stringify(ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI)
                })
            );

            // Verify result structure
            expect(result).toEqual({
                newProcesses: [201, 202],
                existingProcesses: []
            });
        });

        it('should skip configs with existing processes', async () => {
            // Mock PM2 find to return existing processes for first config
            mockPm2Instance.find
                .mockResolvedValueOnce({ data: { id: 'existing-process' } }) // First config has existing process
                .mockResolvedValueOnce({ data: null }); // Second config has no existing process

            const result = await checkOrbitMessageDeliveredLogs();

            // Verify find was called for both configs
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-202');

            // Verify startLogListener was only called for the second config
            expect(mockPm2Instance.startLogListener).toHaveBeenCalledTimes(1);
            expect(mockPm2Instance.startLogListener).toHaveBeenCalledWith(
                'logListener-202',
                JSON.stringify({
                    parentWorkspaceId: 202,
                    workspaceId: 102,
                    contractAddress: '0x2345678901234567890123456789012345678901',
                    abiFilter: JSON.stringify(ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI)
                })
            );

            // Verify result structure
            expect(result).toEqual({
                newProcesses: [202],
                existingProcesses: [201]
            });
        });

        it('should handle all configs having existing processes', async () => {
            // Mock PM2 find to return existing processes for all configs
            mockPm2Instance.find
                .mockResolvedValueOnce({ data: { id: 'existing-process-1' } })
                .mockResolvedValueOnce({ data: { id: 'existing-process-2' } });

            const result = await checkOrbitMessageDeliveredLogs();

            // Verify find was called for both configs
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('logListener-202');

            // Verify startLogListener was never called
            expect(mockPm2Instance.startLogListener).not.toHaveBeenCalled();

            // Verify result structure
            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: [201, 202]
            });
        });
    });

    describe('when no orbit configs exist', () => {
        it('should return empty arrays when no configs found', async () => {
            OrbitChainConfig.findAll.mockResolvedValue([]);

            const result = await checkOrbitMessageDeliveredLogs();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: []
            });

            // Verify PM2 was never instantiated
            expect(PM2).not.toHaveBeenCalled();
        });
    });

    describe('when orbit configs exist but none have parent workspaces', () => {
        it('should return empty arrays when all configs have null parentWorkspaceId', async () => {
            const configsWithoutParent = [
                {
                    id: 1,
                    workspaceId: 101,
                    parentWorkspaceId: null,
                    bridgeContract: '0x1234567890123456789012345678901234567890',
                    parentWorkspace: null
                }
            ];

            OrbitChainConfig.findAll.mockResolvedValue(configsWithoutParent);

            const result = await checkOrbitMessageDeliveredLogs();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: []
            });

            // Verify PM2 was never instantiated since all configs have null parentWorkspaceId
            expect(PM2).not.toHaveBeenCalled();
        });
    });

    describe('PM2 integration', () => {
        it('should create PM2 instance with correct host and secret', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });

            await checkOrbitMessageDeliveredLogs();

            expect(PM2).toHaveBeenCalledWith('http://localhost:3000', 'test-secret');
        });

        it('should call startLogListener with correct slug and JSON args', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });

            await checkOrbitMessageDeliveredLogs();

            const expectedArgs = {
                parentWorkspaceId: 201,
                workspaceId: 101,
                contractAddress: '0x1234567890123456789012345678901234567890',
                abiFilter: JSON.stringify(ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI)
            };

            expect(mockPm2Instance.startLogListener).toHaveBeenCalledWith(
                'logListener-201',
                JSON.stringify(expectedArgs)
            );
        });
    });

    describe('error handling', () => {
        it('should handle OrbitChainConfig.findAll errors gracefully', async () => {
            const error = new Error('Database connection failed');
            OrbitChainConfig.findAll.mockRejectedValue(error);

            await expect(checkOrbitMessageDeliveredLogs()).rejects.toThrow('Database connection failed');
        });

        it('should handle PM2.find errors gracefully', async () => {
            const error = new Error('PM2 service unavailable');
            mockPm2Instance.find.mockRejectedValue(error);

            await expect(checkOrbitMessageDeliveredLogs()).rejects.toThrow('PM2 service unavailable');
        });

        it('should handle PM2.startLogListener errors gracefully', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });
            const error = new Error('Failed to start log listener');
            mockPm2Instance.startLogListener.mockRejectedValue(error);

            await expect(checkOrbitMessageDeliveredLogs()).rejects.toThrow('Failed to start log listener');
        });
    });

    describe('data validation', () => {
        it('should correctly filter configs with non-null parentWorkspaceId', async () => {
            const mixedConfigs = [
                {
                    id: 1,
                    workspaceId: 101,
                    parentWorkspaceId: 201,
                    bridgeContract: '0x1234567890123456789012345678901234567890',
                    parentWorkspace: mockParentWorkspace
                },
                {
                    id: 2,
                    workspaceId: 102,
                    parentWorkspaceId: null,
                    bridgeContract: '0x2345678901234567890123456789012345678901',
                    parentWorkspace: null
                },
                {
                    id: 3,
                    workspaceId: 103,
                    parentWorkspaceId: 203,
                    bridgeContract: '0x3456789012345678901234567890123456789012',
                    parentWorkspace: mockParentWorkspace
                }
            ];

            OrbitChainConfig.findAll.mockResolvedValue(mixedConfigs);
            mockPm2Instance.find.mockResolvedValue({ data: null });

            const result = await checkOrbitMessageDeliveredLogs();

            // Should only process configs 1 and 3 (with parentWorkspaceId)
            expect(result.newProcesses).toEqual([201, 203]);
            expect(result.existingProcesses).toEqual([]);

            // Verify PM2 was only called for configs with parent workspaces
            expect(PM2).toHaveBeenCalledTimes(2);
        });
    });
});
