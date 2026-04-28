/**
 * Regression test for the lib/queue ↔ models circular dependency.
 *
 * Production load chain that broke before the fix:
 *   jobs/blockSync.js → lib/rpc → lib/queue → lib/queueCaps → models/index → models/block
 *   block.js destructures `{ enqueue, bulkEnqueue }` from lib/queue while queue.js
 *   is still mid-load, so it captured `undefined` and the afterCreate hook crashed
 *   with `TypeError: enqueue is not a function`.
 *
 * The fix moves `require('../models')` from queueCaps top-level into evaluateTier,
 * so models is no longer pulled in during the queue.js → queueCaps.js init phase.
 */

jest.mock('../../lib/env', () => ({
    queueCapBlockSync: () => 200,
    queueCapReceiptSync: () => 5000,
    queueCapTierCacheTtlSeconds: () => 60,
}));

jest.mock('../../lib/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }));

jest.mock('../../lib/redis', () => ({ get: jest.fn(), set: jest.fn() }));

describe('lib/queue ↔ models circular import', () => {
    it('does not pull models into queueCaps during initial load', () => {
        jest.isolateModules(() => {
            jest.doMock('../../queues', () => ({}));
            jest.doMock('@sentry/node', () => ({
                startSpan: jest.fn((_, cb) => cb()),
                addBreadcrumb: jest.fn(),
            }));

            // Sentinel that fails the test if models/index runs eagerly while
            // queueCaps initializes (which is what the old top-level require did).
            const modelsLoad = jest.fn(() => {
                throw new Error('models/index loaded eagerly during queueCaps init');
            });
            jest.doMock('../../models', modelsLoad);

            // Loads the full queue ↔ queueCaps graph. Must NOT touch models.
            require('../../lib/queueCaps');
            require('../../lib/queue');

            expect(modelsLoad).not.toHaveBeenCalled();
        });
    });

    it('exposes enqueue as a function after the full module graph loads', () => {
        jest.isolateModules(() => {
            jest.doMock('../../queues', () => ({
                blockSync: { add: jest.fn(), addBulk: jest.fn() },
            }));
            jest.doMock('@sentry/node', () => ({
                startSpan: jest.fn((_, cb) => cb()),
                addBreadcrumb: jest.fn(),
            }));
            jest.doMock('../../models', () => ({
                Workspace: { findByPk: jest.fn() },
            }));

            const queue = require('../../lib/queue');
            expect(typeof queue.enqueue).toBe('function');
            expect(typeof queue.bulkEnqueue).toBe('function');
        });
    });
});
