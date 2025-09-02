require('../mocks/lib/queue');
require('../mocks/models');
require('../mocks/lib/env');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');

const { OrbitChainConfig } = require('../mocks/models');
const PM2 = require('../../lib/pm2');
const env = require('../../lib/env');

const safeBlockListenerCheck = require('../../jobs/safeBlockListenerCheck');

// Mock PM2 class
const mockPM2 = {
    find: jest.fn(),
    startSafeBlockListener: jest.fn()
};

jest.mock('../../lib/pm2', () => {
    return jest.fn().mockImplementation(() => mockPM2);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('safeBlockListenerCheck', () => {
    it('Should start new safe block listeners for SAFE validation type', async () => {
        // Mock environment variables
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        // Mock OrbitChainConfig data
        const mockWorkspace = {
            id: 100,
            getExplorer: jest.fn().mockResolvedValue({
                slug: 'test-explorer'
            })
        };

        const mockConfig = {
            id: 1,
            topParentChainBlockValidationType: 'SAFE',
            getTopParentWorkspace: jest.fn().mockResolvedValue(mockWorkspace)
        };

        OrbitChainConfig.findAll.mockResolvedValue([mockConfig]);

        // Mock PM2 responses
        mockPM2.find.mockResolvedValue({ data: null }); // No existing process
        mockPM2.startSafeBlockListener.mockResolvedValue({ success: true });

        const result = await safeBlockListenerCheck();

        expect(OrbitChainConfig.findAll).toHaveBeenCalledWith({
            where: {
                topParentChainBlockValidationType: {
                    [require('sequelize').Op.in]: ['SAFE', 'FINALIZED']
                }
            }
        });

        expect(mockConfig.getTopParentWorkspace).toHaveBeenCalled();
        expect(mockWorkspace.getExplorer).toHaveBeenCalled();
        expect(mockPM2.find).toHaveBeenCalledWith('safeBlockListener-test-explorer');
        expect(mockPM2.startSafeBlockListener).toHaveBeenCalledWith('test-explorer', 100);

        expect(result).toEqual({
            newProcesses: ['test-explorer'],
            existingProcesses: []
        });
    });

    it('Should start new safe block listeners for FINALIZED validation type', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        const mockWorkspace = {
            id: 200,
            getExplorer: jest.fn().mockResolvedValue({
                slug: 'finalized-explorer'
            })
        };

        const mockConfig = {
            id: 2,
            topParentChainBlockValidationType: 'FINALIZED',
            getTopParentWorkspace: jest.fn().mockResolvedValue(mockWorkspace)
        };

        OrbitChainConfig.findAll.mockResolvedValue([mockConfig]);

        mockPM2.find.mockResolvedValue({ data: null });
        mockPM2.startSafeBlockListener.mockResolvedValue({ success: true });

        const result = await safeBlockListenerCheck();

        expect(mockPM2.startSafeBlockListener).toHaveBeenCalledWith('finalized-explorer', 200);
        expect(result).toEqual({
            newProcesses: ['finalized-explorer'],
            existingProcesses: []
        });
    });

    it('Should not start new processes for existing safe block listeners', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        const mockWorkspace = {
            id: 300,
            getExplorer: jest.fn().mockResolvedValue({
                slug: 'existing-explorer'
            })
        };

        const mockConfig = {
            id: 3,
            topParentChainBlockValidationType: 'SAFE',
            getTopParentWorkspace: jest.fn().mockResolvedValue(mockWorkspace)
        };

        OrbitChainConfig.findAll.mockResolvedValue([mockConfig]);

        // Mock existing process
        mockPM2.find.mockResolvedValue({
            data: { 
                pm2_env: { 
                    status: 'online' 
                } 
            } 
        });

        const result = await safeBlockListenerCheck();

        expect(mockPM2.find).toHaveBeenCalledWith('safeBlockListener-existing-explorer');
        expect(mockPM2.startSafeBlockListener).not.toHaveBeenCalled();
        expect(result).toEqual({
            newProcesses: [],
            existingProcesses: ['existing-explorer']
        });
    });

    it('Should handle multiple configurations correctly', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        const mockConfigs = [
            {
                id: 1,
                topParentChainBlockValidationType: 'SAFE',
                getTopParentWorkspace: jest.fn().mockResolvedValue({
                    id: 100,
                    getExplorer: jest.fn().mockResolvedValue({
                        slug: 'explorer-1'
                    })
                })
            },
            {
                id: 2,
                topParentChainBlockValidationType: 'FINALIZED',
                getTopParentWorkspace: jest.fn().mockResolvedValue({
                    id: 200,
                    getExplorer: jest.fn().mockResolvedValue({
                        slug: 'explorer-2'
                    })
                })
            },
            {
                id: 3,
                topParentChainBlockValidationType: 'SAFE',
                getTopParentWorkspace: jest.fn().mockResolvedValue({
                    id: 300,
                    getExplorer: jest.fn().mockResolvedValue({
                        slug: 'explorer-3'
                    })
                })
            }
        ];

        OrbitChainConfig.findAll.mockResolvedValue(mockConfigs);

        // First two are new, third exists
        mockPM2.find
            .mockResolvedValueOnce({ data: null }) // explorer-1: new
            .mockResolvedValueOnce({ data: null }) // explorer-2: new
            .mockResolvedValueOnce({ data: { pm2_env: { status: 'online' } } }); // explorer-3: exists

        mockPM2.startSafeBlockListener.mockResolvedValue({ success: true });

        const result = await safeBlockListenerCheck();

        expect(mockPM2.startSafeBlockListener).toHaveBeenCalledTimes(2);
        expect(mockPM2.startSafeBlockListener).toHaveBeenCalledWith('explorer-1', 100);
        expect(mockPM2.startSafeBlockListener).toHaveBeenCalledWith('explorer-2', 200);

        expect(result).toEqual({
            newProcesses: ['explorer-1', 'explorer-2'],
            existingProcesses: ['explorer-3']
        });
    });

    it('Should handle empty configuration list', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        OrbitChainConfig.findAll.mockResolvedValue([]);

        const result = await safeBlockListenerCheck();

        expect(OrbitChainConfig.findAll).toHaveBeenCalled();
        expect(mockPM2.find).not.toHaveBeenCalled();
        expect(mockPM2.startSafeBlockListener).not.toHaveBeenCalled();

        expect(result).toEqual({
            newProcesses: [],
            existingProcesses: []
        });
    });

    it('Should handle configurations with LATEST validation type (excluded)', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        // This test verifies that LATEST type is not included in the query
        // The actual job should filter out LATEST types, so we expect no results
        OrbitChainConfig.findAll.mockResolvedValue([]);

        const result = await safeBlockListenerCheck();

        // LATEST type should not be included in the query
        expect(OrbitChainConfig.findAll).toHaveBeenCalledWith({
            where: {
                topParentChainBlockValidationType: {
                    [require('sequelize').Op.in]: ['SAFE', 'FINALIZED']
                }
            }
        });

        expect(mockPM2.find).not.toHaveBeenCalled();
        expect(mockPM2.startSafeBlockListener).not.toHaveBeenCalled();

        expect(result).toEqual({
            newProcesses: [],
            existingProcesses: []
        });
    });

    it('Should create PM2 instance with correct host and secret', async () => {
        jest.spyOn(env, 'getPm2Host').mockReturnValue('http://localhost:3000');
        jest.spyOn(env, 'getPm2Secret').mockReturnValue('secret123');

        OrbitChainConfig.findAll.mockResolvedValue([]);

        await safeBlockListenerCheck();

        expect(env.getPm2Host).toHaveBeenCalled();
        expect(env.getPm2Secret).toHaveBeenCalled();
        expect(PM2).toHaveBeenCalledWith('http://localhost:3000', 'secret123');
    });
});
