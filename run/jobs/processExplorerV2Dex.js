const db = require('../lib/firebase');
const { ExplorerV2Dex, Explorer } = require('../models');
const { DexFactoryConnector, DexPairConnector } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.explorerDexId)
        return 'Missing parameter.';

    const dex = await ExplorerV2Dex.findByPk(data.explorerDexId, {
        include: [
            {
                model: Explorer,
                as: 'explorer',
                include: 'workspace'
            }
        ]
    });

    if (!dex)
        return 'Could not find dex';

    const rpcServer = dex.explorer.workspace.rpcServer;

    // try {
        const dexFactoryConnector = new DexFactoryConnector(rpcServer, dex.factoryAddress);
        const pairLength = await dexFactoryConnector.allPairsLength();
        for (let i = 0; i < pairLength; i++) {
            const pair = await dexFactoryConnector.allPairs(i);
            const dexPairConnector = new DexPairConnector(rpcServer, pair);
            const token0 = await dexPairConnector.token0();
            const token1 = await dexPairConnector.token1();
            await db.createV2DexPair(dex.id, token0, token1, pair);
        }
    // } catch(error) {
    //     console.log(error);
    // }

    return true;
};
