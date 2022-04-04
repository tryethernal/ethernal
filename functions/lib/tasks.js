const { CloudTasksClient } = require('@google-cloud/tasks');
const grpc = require("@grpc/grpc-js");

const TASKS_TO_QUEUE = {
    blockSyncTask: 'block-sync',
    transactionSyncTask: 'transaction-sync'
};

module.exports = {
    enqueueTask: async (taskName, data) => {
        if (!TASKS_TO_QUEUE[taskName])
            throw '[enqueueTask] Unknown task';

        const client = functions.config().devMode ? new CloudTasksClient({
            servicePath: 'localhost',
            port: 9090,
            sslCreds: grpc.credentials.createInsecure()
        }) : new CloudTasksClient();

        const parent = client.queuePath(functions.config().firebaseProjectId, functions.config().functionsLocation, TASKS_TO_QUEUE[taskName]);

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: `${functions.config().ethernal.root_functions}/${taskName}`,
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
