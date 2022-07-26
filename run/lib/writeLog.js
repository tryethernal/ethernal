const { Logging } = require('@google-cloud/logging');
const projectId = process.env.GCLOUD_PROJECT;

const isProductionEnvironment = process.env.NODE_ENV == 'production' ? true : false;

let logging;

module.exports = ({ logName = 'app', severity = 'WARNING', functionName, error, extra }) => {
    if (isProductionEnvironment) {
        logging = logging || new Logging({ projectId });
        const logger = logging.log(logName);
        const message = error.message || '';
        const stackTrace = error.stack || {}
        return logger.write(
            logger.entry({
                severity: severity,
                labels: {
                    function: functionName,
                }
            }, {
                message: message,
                stackTrace: stackTrace,
                extra: extra
            })
        );
    }
    else
        console.log(`[${severity}]`, functionName || '', error || '', extra || '');
};

