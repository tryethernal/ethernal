const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    exitOnError: false,
    format: format.json(),
    transports: []
});

const transport = new transports.Console({ format: format.combine(format.colorize(), format.simple()) });

logger.add(transport);
logger.exceptions.handle(transport);

module.exports = logger;
