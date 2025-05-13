/* eslint-disable */
// For some reason the linter always thinks there are no new lines at the end of this file
self.window = self;
import Api from '@/workers/api';

import { ethers } from 'ethers';

let providers = {};
const getProvider = function(url) {
    if (providers[url])
        return providers[url];

    const rpcServer = new URL(url);

    let ProviderClass;
    if (rpcServer.protocol === 'http:' || rpcServer.protocol === 'https:') {
        ProviderClass = ethers.providers.JsonRpcProvider;
    } else if (rpcServer.protocol === 'ws:' || rpcServer.protocol === 'wss:') {
        ProviderClass = ethers.providers.WebSocketProvider;
    } else {
        throw new Error('Unsupported protocol: ' + rpcServer.protocol);
    }

    // If username/password are present, inject them into the URL
    let finalUrl = url;
    if (rpcServer.username || rpcServer.password) {
        // Rebuild the URL with auth
        rpcServer.username = rpcServer.username || '';
        rpcServer.password = rpcServer.password || '';
        rpcServer.href = `${rpcServer.protocol}//${rpcServer.username}:${rpcServer.password}@${rpcServer.host}${rpcServer.pathname}${rpcServer.search}`;
        finalUrl = rpcServer.href;
    }

    const providerInstance = new ProviderClass(finalUrl);
    providers[url] = providerInstance;
    return providerInstance;
};
// --- End inlined getProvider function ---

const onError = console.log;

addEventListener('message', event => {
    const { rpcServer, apiToken, workspace } = event.data;

    if (!rpcServer || !apiToken || !workspace)
        console.log(`[workers.blockSyncer] Missing parameters`);

    const provider = getProvider(rpcServer);
    if (!provider)
        return console.log(`[workers.blockSyncer] Couldn't setup rpc provider`);

    const api = new Api(apiToken, workspace);

    provider.on('block', async (blockNumber, error) => {
       if (error && error.reason) {
            return console.log(`Error while receiving data: ${error.reason}`);
        }

        try {
            const block = await provider.getBlockWithTransactions(blockNumber)
            if (block) {

                await api.syncBlock(block);

                for (var i = 0; i < block.transactions.length; i++) {
                    const transaction = block.transactions[i];
                    let receipt;

                    try {
                        receipt = await provider.getTransactionReceipt(transaction.hash);
                    } catch(error) {
                        receipt = await provider.send('eth_getTransactionReceipt', [transaction.hash]);
                    }

                    try {
                        await api.syncTransaction(block, transaction, receipt);
                        console.log(`Synced transaction ${transaction.hash}`);
                    } catch(_error) {
                        console.log(`Error while syncing transaction ${transaction.hash}.`);
                    }

                    if (!receipt) {
                        console.log(`Couldn't get receipt information for transaction #${transaction.hash}.`);
                    }
                }

                console.log(`Synced block #${block.number}`);
            }
        } catch(error) {
            console.log(error);
            if (error.response && error.response.data && error.response.data == 'Browser sync is not enabled.'); {
                postMessage('Au revoir!');
                close();
            }
        }
    });

    provider.on('error', onError);        
});
