/**
 * @fileoverview Viem chain definition helper.
 * Creates custom chain configurations for Viem/Wagmi from RPC URL and chain ID.
 * @module lib/chains
 */

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
