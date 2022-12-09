const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    exitOnError: false,
    format: format.json(),
    transports: [
        new transports.Console({ format: format.simple() })
    ],
});

module.exports = logger;
