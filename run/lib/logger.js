/**
 * @fileoverview Centralized logging using Winston.
 * Provides structured JSON logging with configurable log levels.
 * @module lib/logger
 */

const { createLogger, format, transports } = require('winston');
const { getLogLevel } = require('./env');

/**
 * Winston logger instance.
 * Configured with JSON format and console transport.
 * Log level is configurable via LOG_LEVEL environment variable.
 *
 * @type {winston.Logger}
 * @example
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Failed to connect', { error: err.message });
 */
const logger = createLogger({
    level: getLogLevel(),
    exitOnError: false,
    format: format.json(),
    transports: []
});

const transport = new transports.Console({ format: format.combine(format.colorize(), format.simple()) });

logger.add(transport);
logger.exceptions.handle(transport);

module.exports = logger;
