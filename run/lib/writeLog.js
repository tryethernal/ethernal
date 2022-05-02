const { Logging } = require('@google-cloud/logging');
const projectId = process.env.GCLOUD_PROJECT;

const isProductionEnvironment = process.env.NODE_ENV == 'production' ? true : false;

let logging;

module.exports = ({ logName = 'defaultLog', functionName, message, detail, severity = 'WARNING', uid, extra }) => {
    if (isProductionEnvironment) {
        logging = logging || new Logging({ projectId });
        const logger = logging.log(logName);
        return logger.write(
            logger.entry({
                severity: severity,
                labels: {
                    function: functionName,
                    userId: uid,
                    extra: extra
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

