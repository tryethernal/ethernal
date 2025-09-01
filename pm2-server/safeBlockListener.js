const { enqueue } = require('./lib/queue');
const { getClient } = require('./lib/client');
const { getWorkspace } = require('./lib/workspace');

const args = process.argv.slice(2);
const workspaceId = args[0];

const onBlock = async (block) => {
    console.log('New finalized block', String(block.number));
    await enqueue('finalizePendingOrbitBatches', `finalizePendingOrbitBatches-${workspaceId}`, {
        workspaceId: parseInt(workspaceId)
    }, { priority: 1 });
};

const onError = (error) => {
    console.error(error);
};

getWorkspace(workspaceId).then(({ workspace }) => {
    const client = getClient(workspace);

    client.watchBlocks({
        blockTag: 'safe',
        emitOnBegin: true,
        onBlock,
        onError
    });
});
