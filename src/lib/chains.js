import { defineChain } from 'viem';

const defineCustomChain = (id, rpc) => {
    const defaultRpc = {};
    if (rpc.startsWith('http')) {
        defaultRpc.http = [rpc];
    } else {
        defaultRpc.webSocket = [rpc];
    }

    return defineChain({
        id,
        rpcUrls: {
            default: defaultRpc
        }
    });
}

export default defineCustomChain;
