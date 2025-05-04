/* eslint-disable */
// For some reason the linter always thinks there are no new lines at the end of this file
self.window = self;
const { getProvider } = require('@/lib/rpc');
const Api = require('@/workers/api');

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
