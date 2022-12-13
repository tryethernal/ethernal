const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'debug',
    exitOnError: false,
    format: format.json(),
    transports: []
});

if (process.env.DATADOG_API_KEY) {
    const httpTransportOptions = {
        host: 'http-intake.logs.datadoghq.eu',
        path: `/api/v2/logs?dd-api-key=${process.env.DATADOG_API_KEY}&ddsource=nodejs&service=ethernal`,
        ssl: true
    };
    const transport = new transports.Http(httpTransportOptions);
    logger.add(transport);
    logger.exceptions.handle(transport)
}
else {
    const transport = new transports.Console({ format: format.combine(format.colorize(), format.simple()) });
    logger.add(transport);
    logger.exceptions.handle(transport);
}

module.exports = logger;
