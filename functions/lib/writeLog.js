const functions = require('firebase-functions');
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();

const loggers = {
    postgresLogs: logging.log('postgresLogs')
};

const isProductionEnvironment = functions.config().devMode ? false : true;

module.exports = ({ log, functionName, message, detail, severity = 'WARNING', uid }) => {
    if (isProductionEnvironment) {
        const logger = loggers[log];
        return logger.write(
            logger.entry({
                severity: severity,
                labels: {
                    function: functionName,
                    userId: uid
                }
            }, {
                message: message,
                detail: detail
            })
        );
    }
    else
        console.log(`[${severity}]`, functionName || '', message || '', detail || '', uid || '');
};

