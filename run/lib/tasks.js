const { CloudTasksClient } = require('@google-cloud/tasks');

let client;

const ALLOWED_TASKS = [
    'migration',
    'blockSync',
    'transactionSync',
    'transactionProcessing',
    'usageBilling',
    'contractProcessing',
    'processWorkspace',
    'submitExplorerLead',
    'reloadErc721Token',
    'findAndProcessExistingErc721',
    'batchBlockSync',
    'secondaryBlockSync',
    'enforceDataRetentionForWorkspace',
    'processUser'
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
    enqueueTask: async (taskName, data, resource) => {
        const projectId = process.env.GCLOUD_PROJECT;
        if (ALLOWED_TASKS.indexOf(taskName) < 0)
            throw '[enqueueTask] Unknown task';

        client = client || getTaskClient();

        const url = resource || `${process.env.CLOUD_RUN_ROOT}/tasks/${taskName}`;
        const parent = client.queuePath(projectId, process.env.GCLOUD_LOCATION, taskName);

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
