const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'error',
    exitOnError: false,
    format: format.json(),
    transports: []
});

const transport = new transports.Console({ format: format.combine(format.colorize(), format.simple()) });
logger.add(transport);
logger.exceptions.handle(transport);

module.exports = logger;
