/**
 * @fileoverview Tests for the retryability classifier used by background jobs.
 *
 * Misclassifying here is expensive in both directions: calling a transient
 * error permanent drops work on the floor, while calling a permanent error
 * transient parks the job in a delayed set for decades where no alert sees it.
 */

require('../mocks/lib/logger');

const { isPermanentDataError } = require('../../lib/errors');

/**
 * Builds a Sequelize error carrying the given PostgreSQL SQLSTATE code.
 * @param {string} code - The SQLSTATE code the driver would report
 * @returns {Error} A Sequelize-shaped database error
 */
const sequelizeError = code => {
    const error = new Error('database error');
    error.name = 'SequelizeDatabaseError';
    error.parent = { code };
    return error;
};

describe('isPermanentDataError', () => {
    it('Should flag a value the column cannot hold', () => {
        expect(isPermanentDataError(sequelizeError('22003'))).toBe(true);
    });

    it('Should flag the other unstorable-data codes', () => {
        ['22001', '22007', '22P02', '23502', '23514'].forEach(code => {
            expect(isPermanentDataError(sequelizeError(code))).toBe(true);
        });
    });

    it('Should not flag conditions that succeed on retry', () => {
        // unique violation, foreign key violation, serialization failure, deadlock
        ['23505', '23503', '40001', '40P01'].forEach(code => {
            expect(isPermanentDataError(sequelizeError(code))).toBe(false);
        });
    });

    it('Should read the driver code from `original` as well as `parent`', () => {
        const error = new Error('database error');
        error.original = { code: '22003' };
        expect(isPermanentDataError(error)).toBe(true);
    });

    it('Should read the code off the error itself', () => {
        const error = new Error('database error');
        error.code = '22003';
        expect(isPermanentDataError(error)).toBe(true);
    });

    it('Should not flag errors carrying no driver code', () => {
        expect(isPermanentDataError(new Error('Timed out after 10000ms'))).toBe(false);
    });

    it('Should not flag a missing error', () => {
        expect(isPermanentDataError(null)).toBe(false);
        expect(isPermanentDataError(undefined)).toBe(false);
    });

    it('Should not flag an unrelated connection error code', () => {
        const error = new Error('connection refused');
        error.code = 'ECONNREFUSED';
        expect(isPermanentDataError(error)).toBe(false);
    });
});
