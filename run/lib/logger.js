const { createLogger, format, transports } = require('winston');
const { getLogLevel } = require('./env');

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
