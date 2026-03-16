/**
 * @fileoverview Worker heartbeat writer.
 * Writes a periodic heartbeat to Redis so external monitors can detect dead workers.
 * @module lib/heartbeat
 */

const connection = require('./redis');
const logger = require('./logger');

const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TTL_S = 120;

/**
 * Starts writing heartbeats to Redis for this worker process.
 * @param {string} workerType - e.g. 'highPriority', 'mediumPriority', 'lowPriority'
 */
function startHeartbeat(workerType) {
    const machineId = process.env.FLY_MACHINE_ID || 'local';
    const key = `ethernal:worker:${workerType}:heartbeat:${machineId}`;

    const write = async () => {
        try {
            const value = JSON.stringify({
                timestamp: Date.now(),
                pid: process.pid,
                machineId
            });
            await connection.set(key, value, 'EX', HEARTBEAT_TTL_S);
        } catch (err) {
            logger.error(`Heartbeat write failed for ${workerType}: ${err.message}`);
        }
    };

    write();
    setInterval(write, HEARTBEAT_INTERVAL_MS);
    logger.info(`Heartbeat started for worker "${workerType}" (key: ${key})`);
}

module.exports = { startHeartbeat };
