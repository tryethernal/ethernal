/**
 * @fileoverview Tests for update-blocks-statistics script
 */

// Mock the sequelize instance before importing the module
const mockSequelize = {
    query: jest.fn(),
    close: jest.fn()
};

jest.mock('../../models', () => ({
    sequelize: mockSequelize
}));

jest.mock('../../lib/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

const updateBlocksStatistics = require('../../../scripts/update-blocks-statistics');

describe('update-blocks-statistics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute ANALYZE command on blocks table', async () => {
        mockSequelize.query.mockImplementation((sql) => {
            if (sql.includes('pg_stat_user_tables')) {
                return Promise.resolve([[{
                    schemaname: 'public',
                    relname: 'blocks',
                    n_live_tup: 158947513,
                    last_autoanalyze: '2026-03-09T13:22:34.658945Z',
                    hours_since_analyze: 264.5
                }]]);
            }
            if (sql === 'ANALYZE blocks') {
                return Promise.resolve();
            }
            return Promise.resolve([[{}]]);
        });

        mockSequelize.close.mockResolvedValue();

        await updateBlocksStatistics();

        expect(mockSequelize.query).toHaveBeenCalledWith('ANALYZE blocks');
        expect(mockSequelize.close).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        mockSequelize.query.mockRejectedValue(new Error('Database connection failed'));
        mockSequelize.close.mockResolvedValue();

        await expect(updateBlocksStatistics()).rejects.toThrow('Database connection failed');

        expect(mockSequelize.close).toHaveBeenCalled();
    });
});