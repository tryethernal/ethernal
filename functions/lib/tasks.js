const { CloudTasksClient } = require('@google-cloud/tasks');
const functions = require('firebase-functions');

let client;

const ALLOWED_TASKS = [
    'cloudFunctionTransactionSync',
    'cloudRunBlockSync',
    'cloudFunctionBlockSync',
    'cloudFunctionBatchBlockSync',
    'contractVerification',
    'contractProcessing',
    'migration'
];

const getTaskClient = () => {
    if (process.env.NODE_ENV != 'production') {
        const grpc = require("@grpc/grpc-js");
        return new CloudTasksClient({
            servicePath: 'localhost',
            port: 9090,
            sslCreds: grpc.credentials.createInsecure()
        });
    }

    return new CloudTasksClient();
};

module.exports = {
    enqueueTask: async (taskName, data, url) => {
        const projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
        if (ALLOWED_TASKS.indexOf(taskName) < 0)
            throw '[enqueueTask] Unknown task';

        client = client || getTaskClient();

        const parent = client.queuePath(projectId, functions.config().ethernal.functions_location, taskName);
        const resource = url || `${functions.config().ethernal.root_tasks}/${taskName}`;

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: resource,
                body: Buffer.from(JSON.stringify({ data: data })).toString('base64'),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        };

        const request = {
            parent: parent,
            task: task
        };

        const [response] = await client.createTask(request);
        return response;
    }
}
