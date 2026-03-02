/**
 * @fileoverview Viem client factory.
 * Creates Viem public clients for RPC connections with auth support.
 * @module pm2-server/lib/client
 */

const { createPublicClient, http, defineChain, webSocket } = require('viem');

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

const getClient = (workspace) => {
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

    return createPublicClient({ chain, transport });
};

module.exports = {
    getClient
};
