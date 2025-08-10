const { OrbitChainConfig, OrbitNode, TransactionLog, Block } = require('../models');
const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;
const logger = require('../lib/logger');
const { markJobCompleted } = require('../lib/orbitBatchQueue');
const { ethers } = require('ethers');

// DO NOT CHANGE: ABI provided by user is correct
const ROLLUP_ABI = [{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint64","name":"nodeNum","type":"uint64"},{"indexed":false,"internalType":"bytes32","name":"blockHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"sendRoot","type":"bytes32"}],"name":"NodeConfirmed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint64","name":"nodeNum","type":"uint64"},{"indexed":true,"internalType":"bytes32","name":"parentNodeHash","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"nodeHash","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"executionHash","type":"bytes32"},{"components":[{"components":[{"components":[{"internalType":"bytes32[2]","name":"bytes32Vals","type":"bytes32[2]"},{"internalType":"uint64[2]","name":"u64Vals","type":"uint64[2]"}],"internalType":"struct GlobalState","name":"globalState","type":"tuple"},{"internalType":"enum MachineStatus","name":"machineStatus","type":"uint8"}],"internalType":"struct ExecutionState","name":"beforeState","type":"tuple"},{"components":[{"components":[{"internalType":"bytes32[2]","name":"bytes32Vals","type":"bytes32[2]"},{"internalType":"uint64[2]","name":"u64Vals","type":"uint64[2]"}],"internalType":"struct GlobalState","name":"globalState","type":"tuple"},{"internalType":"enum MachineStatus","name":"machineStatus","type":"uint8"}],"internalType":"struct ExecutionState","name":"afterState","type":"tuple"},{"internalType":"uint64","name":"numBlocks","type":"uint64"}],"indexed":false,"internalType":"struct Assertion","name":"assertion","type":"tuple"},{"indexed":false,"internalType":"bytes32","name":"afterInboxBatchAcc","type":"bytes32"},{"indexed":false,"internalType":"bytes32","name":"wasmModuleRoot","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"inboxMaxCount","type":"uint256"}],"name":"NodeCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint64","name":"nodeNum","type":"uint64"}],"name":"NodeRejected","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"OwnerFunctionCalled","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint64","name":"challengeIndex","type":"uint64"},{"indexed":false,"internalType":"address","name":"asserter","type":"address"},{"indexed":false,"internalType":"address","name":"challenger","type":"address"},{"indexed":false,"internalType":"uint64","name":"challengedNode","type":"uint64"}],"name":"RollupChallengeStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"machineHash","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"chainId","type":"uint256"}],"name":"RollupInitialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"UpgradedSecondary","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"initialBalance","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"finalBalance","type":"uint256"}],"name":"UserStakeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"initialBalance","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"finalBalance","type":"uint256"}],"name":"UserWithdrawableFundsUpdated","type":"event"}];

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
        [Op.and]: Sequelize.where(Sequelize.json('topics')[0], Op.in, [nodeCreatedTopic, nodeConfirmedTopic])
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

          const nodeRecord = {
            workspaceId,
            nodeNum: String(args.nodeNum),
            parentNodeHash: String(args.parentNodeHash),
            nodeHash: String(args.nodeHash),
            executionHash: String(args.executionHash),
            afterInboxBatchAcc: String(args.afterInboxBatchAcc),
            wasmModuleRoot: String(args.wasmModuleRoot),
            inboxMaxCount: args.inboxMaxCount ? String(args.inboxMaxCount) : null,
            createdTxHash: log.transactionHash,
            confirmed: false,
            rejected: false
          };

          // Derive last included batch using afterInboxBatchAcc by matching orbit_batches.afterAcc
          try {
            const { OrbitBatch } = require('../models');
            const matchedBatch = await OrbitBatch.findOne({
              where: { workspaceId, afterAcc: String(args.afterInboxBatchAcc) },
              attributes: ['batchSequenceNumber']
            });
            nodeRecord.lastIncludedBatchSequenceNumber = matchedBatch ? matchedBatch.batchSequenceNumber : null;
          } catch (_) {}

          await OrbitNode.upsert(nodeRecord);
          created++;
        } else if (topic0 === nodeConfirmedTopic) {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          const args = parsed.args;
          await OrbitNode.update({ confirmed: true, confirmedBlockHash: String(args.blockHash), confirmedSendRoot: String(args.sendRoot) }, {
            where: { workspaceId, nodeNum: String(args.nodeNum) }
          });
          confirmed++;
        }
      } catch (e) {
        errors++;
        logger.error('Failed to process rollup log', { ...jobContext, error: e.message });
      }
    }

    // Build/refresh batch -> node mappings using lastIncludedBatchSequenceNumber when present
    // A batch is covered by the earliest node whose lastIncludedBatchSequenceNumber >= batch.batchSequenceNumber
    const { OrbitBatch, OrbitBatchNodeMap } = require('../models');
    const batches = await OrbitBatch.findAll({ where: { workspaceId }, attributes: ['id','batchSequenceNumber'] });
    for (const b of batches) {
      const node = await OrbitNode.findOne({
        where: { workspaceId, lastIncludedBatchSequenceNumber: { [Op.gte]: b.batchSequenceNumber } },
        order: [['lastIncludedBatchSequenceNumber','ASC']]
      });
      const coverageStatus = node ? (node.confirmed ? 'finalized' : 'executed') : 'pending';
      await OrbitBatchNodeMap.upsert({ workspaceId, batchId: b.id, nodeNum: node ? node.nodeNum : null, coverageStatus });
      if (node && node.confirmed) await b.update({ confirmationStatus: 'finalized', finalizedAt: new Date() });
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