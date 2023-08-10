const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'error',
    exitOnError: false,
    format: format.json(),
    transports: []
});

let newrelicWinstonFormatter, transport;

if (process.env.NEW_RELIC_APP_NAME) {
    const newrelicFormatter = require('@newrelic/winston-enricher');
    newrelicWinstonFormatter = newrelicFormatter(require('winston'));
}

if (newrelicWinstonFormatter)
    transport = new transports.Console({ format: format.combine(format.colorize(), format.simple(), newrelicWinstonFormatter()) });
else
    transport = new transports.Console({ format: format.combine(format.colorize(), format.simple()) });

logger.add(transport);
logger.exceptions.handle(transport);

module.exports = logger;
