const { createLogger, format, transports } = require('winston');
const newrelicFormatter = require('@newrelic/winston-enricher');

const newrelicWinstonFormatter = newrelicFormatter(require('winston'));

const logger = createLogger({
    level: 'error',
    exitOnError: false,
    format: format.json(),
    transports: []
});

const transport = new transports.Console({ format: format.combine(format.colorize(), format.simple(), newrelicWinstonFormatter() });
logger.add(transport);
logger.exceptions.handle(transport);

module.exports = logger;
