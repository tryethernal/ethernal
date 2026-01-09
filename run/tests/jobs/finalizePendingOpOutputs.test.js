require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OpOutput } = require('../mocks/models');
const finalizePendingOpOutputs = require('../../jobs/finalizePendingOpOutputs');

// Mock dependencies
jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('finalizePendingOpOutputs', () => {
    let mockOutputs;

    beforeEach(() => {
        jest.clearAllMocks();

        mockOutputs = [
            {
                id: 1,
                workspaceId: 101,
                outputIndex: 50,
                status: 'proposed',
                challengePeriodEnds: new Date(Date.now() - 86400000), // 1 day ago
                update: jest.fn().mockResolvedValue(true)
            },
            {
                id: 2,
                workspaceId: 101,
                outputIndex: 51,
                status: 'proposed',
                challengePeriodEnds: new Date(Date.now() - 3600000), // 1 hour ago
                update: jest.fn().mockResolvedValue(true)
            }
        ];

        OpOutput.findAll.mockResolvedValue(mockOutputs);
    });

    describe('basic functionality', () => {
        it('should find proposed outputs with expired challenge period', async () => {
            await finalizePendingOpOutputs();

            expect(OpOutput.findAll).toHaveBeenCalledWith({
                where: {
                    status: 'proposed',
                    challengePeriodEnds: expect.any(Object)
                }
            });
        });

        it('should update each output status to finalized', async () => {
            await finalizePendingOpOutputs();

            expect(mockOutputs[0].update).toHaveBeenCalledWith({ status: 'finalized' });
            expect(mockOutputs[1].update).toHaveBeenCalledWith({ status: 'finalized' });
        });

        it('should return count of finalized outputs', async () => {
            const result = await finalizePendingOpOutputs();

            expect(result).toBe('Finalized 2 OP outputs');
        });
    });

    describe('no outputs to finalize', () => {
        it('should return appropriate message when no outputs need finalization', async () => {
            OpOutput.findAll.mockResolvedValue([]);

            const result = await finalizePendingOpOutputs();

            expect(result).toBe('No outputs to finalize');
        });
    });

    describe('partial failures', () => {
        it('should continue processing other outputs if one fails', async () => {
            mockOutputs[0].update.mockRejectedValue(new Error('Update failed'));

            const result = await finalizePendingOpOutputs();

            expect(mockOutputs[1].update).toHaveBeenCalledWith({ status: 'finalized' });
            expect(result).toBe('Finalized 1 OP outputs');
        });
    });

    describe('error handling', () => {
        it('should throw error if findAll fails', async () => {
            OpOutput.findAll.mockRejectedValue(new Error('Database error'));

            await expect(finalizePendingOpOutputs()).rejects.toThrow('Database error');
        });
    });

    describe('single output', () => {
        it('should handle single output correctly', async () => {
            OpOutput.findAll.mockResolvedValue([mockOutputs[0]]);

            const result = await finalizePendingOpOutputs();

            expect(result).toBe('Finalized 1 OP outputs');
        });
    });
});
