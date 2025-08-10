const { OrbitChainConfig, OrbitNode, OrbitBatch, OrbitBatchNodeMap, TransactionLog, TransactionReceipt, Transaction, Block, sequelize } = require('../models');
const logger = require('../lib/logger');
const { markJobCompleted } = require('../lib/orbitBatchQueue');
const { ethers } = require('ethers');

const ROLLUP_ABI = [
  'event NodeCreated(uint64 nodeNum, bytes32 parentHash, uint64 parentNodeNum, uint64 createdAtBlock, uint64 deadlineBlock, bytes32 nodeHash, uint256 seqNumStart, uint256 seqNumEnd, bytes32 stateHash, bytes32 sendAcc, bytes32 logAcc)',
  'event NodeConfirmed(uint64 nodeNum)'
];

async function indexOrbitNodes(job) {
  const { workspaceId } = job.data;
  const jobContext = { job: 'indexOrbitNodes', workspaceId, jobId: job.id };
  try {
    const cfg = await OrbitChainConfig.findOne({ where: { workspaceId } });
    if (!cfg || !cfg.parentWorkspaceId || !cfg.rollupContract) {
      logger.debug('Missing orbit config/parent/rollup', jobContext);
      return { status: 'skipped' };
    }

    const iface = new ethers.utils.Interface(ROLLUP_ABI);
    const nodeCreatedTopic = iface.getEventTopic('NodeCreated');
    const nodeConfirmedTopic = iface.getEventTopic('NodeConfirmed');

    const logs = await TransactionLog.findAll({
      where: {
        workspaceId: cfg.parentWorkspaceId,
        address: cfg.rollupContract.toLowerCase(),
        [sequelize.Op.and]: sequelize.where(sequelize.json('topics')[0], sequelize.Op.in, [nodeCreatedTopic, nodeConfirmedTopic])
      },
      order: [['blockNumber','ASC'],['logIndex','ASC']],
      attributes: ['topics','data','transactionHash','blockNumber','logIndex']
    });

    let created = 0, confirmed = 0, errors = 0;
    for (const log of logs) {
      try {
        const topic0 = log.topics[0];
        if (topic0 === nodeCreatedTopic) {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          const args = parsed.args;
          const deadlineBlock = Number(args.deadlineBlock);
          const createdAtBlock = Number(args.createdAtBlock);

          let challengeDeadline = null;
          if (!Number.isNaN(deadlineBlock)) {
            const deadlineBlk = await Block.findOne({ where: { workspaceId: cfg.parentWorkspaceId, number: deadlineBlock }, attributes: ['timestamp'] });
            if (deadlineBlk) challengeDeadline = deadlineBlk.timestamp;
          }

          await OrbitNode.upsert({
            workspaceId,
            nodeNum: String(args.nodeNum),
            parentNodeNum: String(args.parentNodeNum),
            seqNumStart: args.seqNumStart ? String(args.seqNumStart) : null,
            seqNumEnd: args.seqNumEnd ? String(args.seqNumEnd) : null,
            stateRoot: args.stateHash,
            sendAccumulator: args.sendAcc,
            logAccumulator: args.logAcc,
            stakerCount: null,
            challengeDeadline,
            confirmed: false,
            createdTxHash: log.transactionHash,
            createdBlockNumber: createdAtBlock
          });
          created++;
        } else if (topic0 === nodeConfirmedTopic) {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          const nodeNum = String(parsed.args.nodeNum);
          await OrbitNode.update({ confirmed: true }, { where: { workspaceId, nodeNum } });
          confirmed++;
        }
      } catch (e) {
        errors++;
        logger.error('Failed to process rollup log', { ...jobContext, error: e.message });
      }
    }

    // Build/refresh batch -> node mappings
    const batches = await OrbitBatch.findAll({ where: { workspaceId }, attributes: ['id','seqNumEnd','confirmationStatus'] });
    for (const b of batches) {
      if (!b.seqNumEnd) continue;
      const node = await OrbitNode.findOne({
        where: { workspaceId, [sequelize.Op.and]: sequelize.where(sequelize.col('seqNumEnd'), ">=", b.seqNumEnd) },
        order: [['seqNumEnd','ASC']]
      });
      if (!node) {
        await OrbitBatchNodeMap.upsert({ workspaceId, batchId: b.id, nodeNum: null, coverageStatus: 'pending' });
        continue;
      }
      const coverageStatus = node.confirmed ? 'finalized' : 'executed';
      await OrbitBatchNodeMap.upsert({ workspaceId, batchId: b.id, nodeNum: node.nodeNum, coverageStatus });

      // Optionally reflect finalization in batch
      if (node.confirmed && b.confirmationStatus !== 'finalized') {
        await b.update({ confirmationStatus: 'finalized', finalizedAt: new Date() });
      }
    }

    const result = { status: 'completed', created, confirmed, errors };
    logger.info('Completed indexOrbitNodes', { ...jobContext, ...result });
    markJobCompleted(workspaceId, job.id);
    return result;
  } catch (error) {
    logger.error('Error in indexOrbitNodes job', { ...jobContext, error: error.message });
    throw error;
  }
}

module.exports = indexOrbitNodes;