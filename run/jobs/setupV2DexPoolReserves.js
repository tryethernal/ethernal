const { getV2PoolReserves } = require('../lib/abi');
const { Op, literal } = require('sequelize');
const { ExplorerV2Dex, TransactionLog, V2DexPair, TransactionReceipt, V2DexPoolReserve } = require('../models');

module.exports = async job => {
    const data = job.data;

    if (!data.v2DexPairId)
        return 'Missing parameters';

    const pair = await V2DexPair.findByPk(data.v2DexPairId, {
        include: [
            'pair',
            {
                model: ExplorerV2Dex,
                as: 'dex',
                include: 'explorer'
            }
        ]
    });

    if (!pair)
        return 'Could not find pair';

    const workspaceId = pair.dex.explorer.workspaceId;

    const logs = await TransactionLog.findAll({
        where: {
            address: pair.pair.address,
            workspaceId,
            [Op.and]: literal(`topics[1] = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'`)
        },
        include: [
            {
                model: TransactionReceipt,
                as: 'receipt',
                include: 'transaction'
            },
            {
                model: V2DexPoolReserve,
                as: 'v2DexPoolReserve'
            }
        ]
    });

    const batch = [];
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (log.v2DexPoolReserve)
            continue;
        const reserves = getV2PoolReserves(log);
        batch.push({
            v2DexPairId: pair.id,
            transactionLogId: log.id,
            timestamp: log.receipt.transaction.timestamp,
            reserve0: reserves.reserve0,
            reserve1: reserves.reserve1,
            token0ContractId: pair.token0ContractId,
            token1ContractId: pair.token1ContractId
        });
    }

    const MAX_INSERT_SIZE = 10;
    for (let i = 0; i < batch.length; i += MAX_INSERT_SIZE) {
        await V2DexPoolReserve.bulkCreate(batch.slice(i, i + MAX_INSERT_SIZE));
    }

    return true;
};
