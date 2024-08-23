const { ExplorerV2Dex, Explorer, V2DexPair } = require('../models');
const db = require('../lib/firebase');
const { DexFactoryConnector } = require('../lib/rpc');

module.exports = async job => {
    const data = job.data;

    if (!data.explorerDexId || data.pairIndex === undefined || data.pairIndex === null)
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
    const dexFactoryConnector = new DexFactoryConnector(rpcServer, dex.factoryAddress);
    const pair = await dexFactoryConnector.allPairs(data.pairIndex);

    const token0 = await dexFactoryConnector.token0Of(pair);
    const token1 = await dexFactoryConnector.token1Of(pair);

    if (!token0 || !token1)
        return 'Could not find token0 or token1';

    const existingPair = await V2DexPair.findOne({
        where: {
            explorerV2DexId: dex.id,
            '$token0.address$': token0.toLowerCase(),
            '$token1.address$': token1.toLowerCase()
        },
        include: ['token0', 'token1']
    });

    if (existingPair)
        return 'Pair already exists';

    return db.createV2DexPair(dex.id, token0, token1, pair);
};
