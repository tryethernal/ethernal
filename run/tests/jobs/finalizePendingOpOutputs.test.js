require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OpOutput } = require('../mocks/models');
const finalizePendingOpOutputs = require('../../jobs/finalizePendingOpOutputs');

jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('finalizePendingOpOutputs', () => {
    describe('basic functionality', () => {
        it('should bulk update proposed outputs with expired challenge period', async () => {
            OpOutput.update.mockResolvedValue([2]);

            const result = await finalizePendingOpOutputs();

            expect(OpOutput.update).toHaveBeenCalledWith(
                { status: 'finalized' },
                {
                    where: {
                        status: 'proposed',
                        challengePeriodEnds: expect.any(Object)
                    }
                }
            );
            expect(result).toBe('Finalized 2 OP outputs');
        });
    });

    describe('no outputs to finalize', () => {
        it('should return appropriate message when no outputs need finalization', async () => {
            OpOutput.update.mockResolvedValue([0]);

            const result = await finalizePendingOpOutputs();

            expect(result).toBe('No outputs to finalize');
        });
    });

    describe('error handling', () => {
        it('should throw error if update fails', async () => {
            OpOutput.update.mockRejectedValue(new Error('Database error'));

            await expect(finalizePendingOpOutputs()).rejects.toThrow('Database error');
        });
    });

    describe('single output', () => {
        it('should handle single output correctly', async () => {
            OpOutput.update.mockResolvedValue([1]);

            const result = await finalizePendingOpOutputs();

            expect(result).toBe('Finalized 1 OP outputs');
        });
    });
});
