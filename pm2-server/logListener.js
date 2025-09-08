const { enqueue } = require('./lib/queue');
const { getClient } = require('./lib/client');
const { getWorkspace } = require('./lib/workspace');

const args = process.argv.slice(2);

const { parentWorkspaceId, workspaceId, contractAddress, abiFilter } = JSON.parse(args[0]);

// We only want to keep messages that are related to deposits
const kindToKeep = [3, 7, 9, 12];

const onLogs = (logs) => {
    for (const log of logs) {

        if (!kindToKeep.includes(log.args.kind))
            continue;

        enqueue('storeOrbitDeposit', `storeOrbitDeposit-${workspaceId}-${log.args.messageIndex}`, {
            workspaceId,
            l1Block: parseInt(log.blockNumber),
            l1TransactionHash: log.transactionHash,
            messageIndex: parseInt(log.args.messageIndex),
            timestamp: String(log.args.timestamp),
            sender: log.args.sender,
        });
    }
};

const onError = (error) => {
    console.error(error);
};

getWorkspace(parentWorkspaceId).then(({ workspace }) => {
    const client = getClient(workspace);
    console.log(`Listening to ${contractAddress} for ${JSON.parse(abiFilter).name} on workspace ${parentWorkspaceId}`);
    client.watchEvent({
        address: contractAddress,
        event: JSON.parse(abiFilter),
        onLogs,
        onError
    });
});
