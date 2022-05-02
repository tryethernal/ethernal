const { CloudTasksClient } = require('@google-cloud/tasks');

let client;

const TASKS_TO_QUEUE = {
    blockSyncTask: 'block-sync',
    transactionSyncTask: 'transaction-sync',
    batchBlockSyncTask: 'batch-block-sync',
    dbBlockSyncTask: 'db-block-sync',
    dbTransactionBlockSyncTask: 'transaction-block-sync',
    insertUserTask: 'populate-postgres',
    blockSyncTaskCloudRun: 'block-sync-cloud-run',
    transactionSyncTaskCloudRun: 'transaction-sync-cloud-run'
};

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
        const projectId = process.env.PROJECT_ID;
        if (!TASKS_TO_QUEUE[taskName])
            throw '[enqueueTask] Unknown task';
        client = client || getTaskClient()

        const parent = client.queuePath(projectId, process.env.GCLOUD_LOCATION, TASKS_TO_QUEUE[taskName]);

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: url,
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
