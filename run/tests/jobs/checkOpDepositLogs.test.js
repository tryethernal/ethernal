require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OpChainConfig } = require('../mocks/models');
const checkOpDepositLogs = require('../../jobs/checkOpDepositLogs');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');
jest.mock('../../lib/pm2');
jest.mock('../../lib/env');

const PM2 = require('../../lib/pm2');
const { getPm2Host, getPm2Secret } = require('../../lib/env');
const { Op } = require('sequelize');

beforeEach(() => jest.clearAllMocks());

describe('checkOpDepositLogs', () => {
    let mockOpConfigs;
    let mockPm2Instance;

    beforeEach(() => {
        jest.clearAllMocks();

        getPm2Host.mockReturnValue('http://localhost:3000');
        getPm2Secret.mockReturnValue('test-secret');

        mockOpConfigs = [
            {
                id: 1,
                workspaceId: 101,
                parentWorkspaceId: 201,
                optimismPortalAddress: '0x1234567890123456789012345678901234567890'
            },
            {
                id: 2,
                workspaceId: 102,
                parentWorkspaceId: 202,
                optimismPortalAddress: '0x2345678901234567890123456789012345678901'
            }
        ];

        mockPm2Instance = {
            find: jest.fn(),
            startOpLogListener: jest.fn()
        };

        PM2.mockImplementation(() => mockPm2Instance);

        OpChainConfig.findAll.mockResolvedValue(mockOpConfigs);
    });

    describe('when OP configs exist with parent workspaces', () => {
        it('should start new log listeners for configs without existing processes', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });

            const result = await checkOpDepositLogs();

            expect(OpChainConfig.findAll).toHaveBeenCalledWith({
                where: {
                    parentWorkspaceId: { [Op.ne]: null },
                    optimismPortalAddress: { [Op.ne]: null }
                },
                include: 'parentWorkspace'
            });

            expect(PM2).toHaveBeenCalledWith('http://localhost:3000', 'test-secret');
            expect(PM2).toHaveBeenCalledTimes(2);

            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-202');

            expect(mockPm2Instance.startOpLogListener).toHaveBeenCalledWith(
                'opLogListener-201',
                JSON.stringify({
                    parentWorkspaceId: 201,
                    workspaceId: 101,
                    contractAddress: '0x1234567890123456789012345678901234567890'
                })
            );

            expect(mockPm2Instance.startOpLogListener).toHaveBeenCalledWith(
                'opLogListener-202',
                JSON.stringify({
                    parentWorkspaceId: 202,
                    workspaceId: 102,
                    contractAddress: '0x2345678901234567890123456789012345678901'
                })
            );

            expect(result).toEqual({
                newProcesses: [201, 202],
                existingProcesses: []
            });
        });

        it('should skip configs with existing processes', async () => {
            mockPm2Instance.find
                .mockResolvedValueOnce({ data: { id: 'existing-process' } })
                .mockResolvedValueOnce({ data: null });

            const result = await checkOpDepositLogs();

            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-202');

            expect(mockPm2Instance.startOpLogListener).toHaveBeenCalledTimes(1);
            expect(mockPm2Instance.startOpLogListener).toHaveBeenCalledWith(
                'opLogListener-202',
                JSON.stringify({
                    parentWorkspaceId: 202,
                    workspaceId: 102,
                    contractAddress: '0x2345678901234567890123456789012345678901'
                })
            );

            expect(result).toEqual({
                newProcesses: [202],
                existingProcesses: [201]
            });
        });

        it('should handle all configs having existing processes', async () => {
            mockPm2Instance.find
                .mockResolvedValueOnce({ data: { id: 'existing-process-1' } })
                .mockResolvedValueOnce({ data: { id: 'existing-process-2' } });

            const result = await checkOpDepositLogs();

            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-201');
            expect(mockPm2Instance.find).toHaveBeenCalledWith('opLogListener-202');

            expect(mockPm2Instance.startOpLogListener).not.toHaveBeenCalled();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: [201, 202]
            });
        });
    });

    describe('when no OP configs exist', () => {
        it('should return empty arrays when no configs found', async () => {
            OpChainConfig.findAll.mockResolvedValue([]);

            const result = await checkOpDepositLogs();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: []
            });

            expect(PM2).not.toHaveBeenCalled();
        });
    });

    describe('when OP configs exist but lack required fields', () => {
        it('should skip configs with null parentWorkspaceId', async () => {
            const configsWithoutParent = [
                {
                    id: 1,
                    workspaceId: 101,
                    parentWorkspaceId: null,
                    optimismPortalAddress: '0x1234567890123456789012345678901234567890'
                }
            ];

            OpChainConfig.findAll.mockResolvedValue(configsWithoutParent);

            const result = await checkOpDepositLogs();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: []
            });

            expect(PM2).not.toHaveBeenCalled();
        });

        it('should skip configs with null optimismPortalAddress', async () => {
            const configsWithoutPortal = [
                {
                    id: 1,
                    workspaceId: 101,
                    parentWorkspaceId: 201,
                    optimismPortalAddress: null
                }
            ];

            OpChainConfig.findAll.mockResolvedValue(configsWithoutPortal);

            const result = await checkOpDepositLogs();

            expect(result).toEqual({
                newProcesses: [],
                existingProcesses: []
            });

            expect(PM2).not.toHaveBeenCalled();
        });
    });

    describe('PM2 integration', () => {
        it('should create PM2 instance with correct host and secret', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });

            await checkOpDepositLogs();

            expect(PM2).toHaveBeenCalledWith('http://localhost:3000', 'test-secret');
        });

        it('should call startOpLogListener with correct slug and JSON args', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });

            await checkOpDepositLogs();

            const expectedArgs = {
                parentWorkspaceId: 201,
                workspaceId: 101,
                contractAddress: '0x1234567890123456789012345678901234567890'
            };

            expect(mockPm2Instance.startOpLogListener).toHaveBeenCalledWith(
                'opLogListener-201',
                JSON.stringify(expectedArgs)
            );
        });
    });

    describe('error handling', () => {
        it('should handle OpChainConfig.findAll errors gracefully', async () => {
            const error = new Error('Database connection failed');
            OpChainConfig.findAll.mockRejectedValue(error);

            await expect(checkOpDepositLogs()).rejects.toThrow('Database connection failed');
        });

        it('should handle PM2.find errors gracefully', async () => {
            const error = new Error('PM2 service unavailable');
            mockPm2Instance.find.mockRejectedValue(error);

            await expect(checkOpDepositLogs()).rejects.toThrow('PM2 service unavailable');
        });

        it('should handle PM2.startOpLogListener errors gracefully', async () => {
            mockPm2Instance.find.mockResolvedValue({ data: null });
            const error = new Error('Failed to start log listener');
            mockPm2Instance.startOpLogListener.mockRejectedValue(error);

            await expect(checkOpDepositLogs()).rejects.toThrow('Failed to start log listener');
        });
    });

    describe('data validation', () => {
        it('should correctly filter configs with valid fields', async () => {
            const mixedConfigs = [
                {
                    id: 1,
                    workspaceId: 101,
                    parentWorkspaceId: 201,
                    optimismPortalAddress: '0x1234567890123456789012345678901234567890'
                },
                {
                    id: 2,
                    workspaceId: 102,
                    parentWorkspaceId: null,
                    optimismPortalAddress: '0x2345678901234567890123456789012345678901'
                },
                {
                    id: 3,
                    workspaceId: 103,
                    parentWorkspaceId: 203,
                    optimismPortalAddress: '0x3456789012345678901234567890123456789012'
                }
            ];

            OpChainConfig.findAll.mockResolvedValue(mixedConfigs);
            mockPm2Instance.find.mockResolvedValue({ data: null });

            const result = await checkOpDepositLogs();

            // Should only process configs 1 and 3 (with parentWorkspaceId)
            expect(result.newProcesses).toEqual([201, 203]);
            expect(result.existingProcesses).toEqual([]);

            expect(PM2).toHaveBeenCalledTimes(2);
        });
    });
});
