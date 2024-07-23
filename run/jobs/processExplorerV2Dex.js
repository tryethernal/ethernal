const { ExplorerV2Dex, Explorer } = require('../models');
const { getMaxV2DexPairsForTrial } = require('../lib/env');
const { bulkEnqueue } = require('../lib/queue');
const { DexFactoryConnector } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.explorerDexId)
        return 'Missing parameter.';

    const dex = await ExplorerV2Dex.findByPk(data.explorerDexId, {
        include: [
            {
                model: Explorer,
                as: 'explorer',
                include: ['workspace', 'stripeSubscription']
            }
        ]
    });
    const subscription = dex.explorer.stripeSubscription;

    if (!dex)
        return 'Could not find dex';

    const rpcServer = dex.explorer.workspace.rpcServer;
    const dexFactoryConnector = new DexFactoryConnector(rpcServer, dex.factoryAddress);
    const pairLength = await dexFactoryConnector.allPairsLength();

    const pairsToProcess = subscription ? 
        (subscription.isTrialing || dex.explorer.isDemo ? getMaxV2DexPairsForTrial() : pairLength) :
        0;
    const currentPairCount = await dex.countPairs();

    if (currentPairCount >= pairsToProcess)
        return `All pairs processed ${currentPairCount} / ${pairLength}`;

    const jobs = [];
    for (let i = 0; i < pairsToProcess; i++) {
        jobs.push({
            name: `processExplorerV2DexPair-${dex.id}-${i}`,
            data: {
                explorerDexId: dex.id,
                pairIndex: i
            }
        });
    }

    await bulkEnqueue('processExplorerV2DexPair', jobs);

    return true;
};
