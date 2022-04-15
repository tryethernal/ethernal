const functions = require('firebase-functions');
const { Logging } = require('@google-cloud/logging');
const projectId = process.env.GCLOUD_PROJECT;
const logging = new Logging({ projectId });

const isProductionEnvironment = functions.config().devMode ? false : true;

module.exports = ({ logName = 'defaultLog', functionName, message, detail, severity = 'WARNING', uid }) => {
    if (isProductionEnvironment) {
        const logger = logging.log(logName);
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

