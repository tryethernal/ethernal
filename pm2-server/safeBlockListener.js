const Redis = require('ioredis');
const axios = require('axios');
const { Queue } = require('bullmq');
const { createPublicClient, http, defineChain } = require('viem');

const secret = process.env.ETHERNAL_SECRET;
const apiHost = process.env.ETHERNAL_HOST || 'http://localhost:8888';
const redisUrl = process.env.ETHERNAL_REDIS_URL

if (!secret) {
    console.log(`Pass the secret with the ETHERNAL_SECRET env variable.`);
    process.exit(1);
}

const defaultJobOptions = {
    attempts: 50,
    removeOnComplete: {
        count: 100,
        age: 4 * 60
    },
    timeout: 30000,
    backoff: {
        type: 'exponential',
        delay: 1000
    }
};

const connection = new Redis(redisUrl);
const queue = new Queue('finalizePendingOrbitBatches', { connection, defaultJobOptions });

const args = process.argv.slice(2);
const workspaceId = args[0];

const getProvider = (_rpcServer) => {
    try {
        const rpcServer = new URL(_rpcServer);
        return rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:' ? { http: [], webSocket: [_rpcServer] } : { http: [_rpcServer], webSocket: [] };
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

const fetchOptions = (_rpcServer) => {
    const rpcServer = new URL(_rpcServer);
    if (rpcServer.username.length || rpcServer.password.length) {
        const base64Credentials = btoa(`${rpcServer.username}:${rpcServer.password}`);
        return { headers: { 'Authorization': `Basic ${base64Credentials}` }};
    }
    else
        return {};
};

const getWorkspace = async () => {
    const { data: workspace } = await axios.get(`${apiHost}/api/workspaces/${workspaceId}`, { params: { secret } });
    return { workspace };
}

getWorkspace().then(({ workspace }) => {
    const chain = defineChain({
        id: workspace.networkId,
        name: workspace.name,
        network: workspace.name,
        nativeCurrency: {
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH'
        },
        rpcUrls: {
            default: getProvider(workspace.rpcServer),
            public: getProvider(workspace.rpcServer)
        }
    });

    const url = new URL(workspace.rpcServer).origin + new URL(workspace.rpcServer).pathname + new URL(workspace.rpcServer).search;
    const transport = workspace.rpcServer.startsWith('ws') ?
        webSocket(url) :
        http(url, { fetchOptions: fetchOptions(workspace.rpcServer) });

    const client = createPublicClient({ chain, transport });

    client.watchBlocks({
        blockTag: 'safe',
        emitOnBegin: true,
        onBlock: async (block) => {
            console.log('New finalized block', String(block.number));
            await queue.add('finalizePendingOrbitBatches', {
                workspaceId: parseInt(workspaceId)
            }, { priority: 1 });
        },
        onError: (error) => {
            console.error(error);
        }
    });
});
