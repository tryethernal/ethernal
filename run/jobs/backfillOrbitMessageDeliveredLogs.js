const logger = require('../lib/logger');
const { enqueue } = require('../lib/queue');

const { ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI } = require('../constants/orbit');
const SCAN_RANGE = 5;

const { OrbitDeposit, OrbitChainConfig } = require('../models');

module.exports = async (job) => {
    const data = job.data;

    const orbitConfig = await OrbitChainConfig.findByPk(data.orbitChainConfigId);
    if (!orbitConfig)
        throw new Error('OrbitChainConfig not found');

    const parentWorkspace = await orbitConfig.getParentWorkspace();
    const bridgeContract = orbitConfig.bridgeContract;
    let fromBlock = data.fromBlock;

    if (!fromBlock) {
        const [earliestDeposit] = await OrbitDeposit.findAll({
            where: {
                workspaceId: orbitConfig.workspaceId
            },
            order: [['messageIndex', 'ASC']],
            limit: 1
        })
        fromBlock = earliestDeposit.l1Block;
    }

    if (!fromBlock)
        throw new Error('Could not determine fromBlock');

    const client = parentWorkspace.getViemPublicClient();

    logger.info(`Scanning L2 deposits from #${(fromBlock - SCAN_RANGE).toLocaleString()} to #${fromBlock.toLocaleString()}`);
    const filter = await client.createEventFilter({
        address: bridgeContract,
        event: ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI,
        fromBlock: '0x' + (fromBlock - SCAN_RANGE).toString(16),
        toBlock: '0x' + fromBlock.toString(16)
    });

    const logs = await client.getFilterLogs({ filter });
    const deposits = [];
    for (const log of logs) {
        if ([3, 7, 9, 12].includes(log.args.kind)) {
            logger.info(`Found deposit #${parseInt(log.args.messageIndex)}`)
            deposits.push({
                workspaceId: orbitConfig.workspaceId,
                l1Block: parseInt(log.blockNumber),
                l1TransactionHash: log.transactionHash,
                messageIndex: parseInt(log.args.messageIndex),
                timestamp: String(log.args.timestamp),
                sender: log.args.sender
            });
        }
    }
    await OrbitDeposit.bulkCreate(deposits, { ignoreDuplicates: true });

    const newFromBlock = fromBlock - SCAN_RANGE;
    return enqueue('backfillOrbitMessageDeliveredLogs', `backfillOrbitMessageDeliveredLogs-${orbitConfig.id}-${newFromBlock}-${fromBlock - 2 * SCAN_RANGE}`, {
        orbitChainConfigId: data.orbitChainConfigId,
        fromBlock: newFromBlock
    })
}
