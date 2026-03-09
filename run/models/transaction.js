/**
 * @fileoverview Transaction model - represents blockchain transactions.
 * Stores transaction data, receipts, token transfers, and trace information.
 * Handles Orbit L2 chain events (batches, withdrawals, nodes).
 *
 * @module models/Transaction
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to workspace
 * @property {number} blockId - Foreign key to block
 * @property {string} hash - Transaction hash
 * @property {string} from - Sender address
 * @property {string} to - Recipient address (null for contract creation)
 * @property {string} value - ETH value transferred
 * @property {string} data - Transaction input data
 * @property {string} gasPrice - Gas price in wei
 * @property {string} gasLimit - Gas limit
 * @property {Date} timestamp - Transaction timestamp
 */

'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const ethers = require('ethers');
const Op = Sequelize.Op
const { sanitize, stringifyBns, processRawRpcObject, eToNumber } = require('../lib/utils');
const { trigger } = require('../lib/pusher');
const logger = require('../lib/logger');
let { getTransactionMethodDetails, getTokenTransfer } = require('../lib/abi');
const moment = require('moment');
const { isOrbitNodeCreatedLog, isOrbitNodeConfirmedLog, isOrbitNodeRejectedLog, getOrbitCreatedNodeData, getOrbitConfirmedNodeData } = require('../lib/orbitNodes');
const { isOrbitBatchDeliveredLog, getOrbitBatchDeliveredData } = require('../lib/orbitBatches');
const { isWithdrawalLog, getWithdrawalData, isOutboxTransactionExecutedLog, getOutboxTransactionExecutedData, getWithdrawalTokenInfo } = require('../lib/orbitWithdrawals');
const { isTransactionDepositedLog, getTransactionDepositedData, deriveL2TransactionHash } = require('../lib/opDeposits');
const { isOutputProposedLog, isDisputeGameCreatedLog, getOutputProposedData, getDisputeGameCreatedData, calculateChallengePeriodEnd } = require('../lib/opOutputs');
const { isMessagePassedLog, isWithdrawalProvenLog, isWithdrawalFinalizedLog, getMessagePassedData, getWithdrawalProvenData, getWithdrawalFinalizedData, L2_TO_L1_MESSAGE_PASSER_ADDRESS } = require('../lib/opWithdrawals');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Transaction.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Transaction.belongsTo(models.Block, { foreignKey: 'blockId', as: 'block' });
      Transaction.hasOne(models.Contract, {
          sourceKey: 'to',
          foreignKey:  'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("Transaction.workspaceId"),
                Op.eq,
                sequelize.col("contract.workspaceId")
              ),
            },
          constraints: false
      });
      Transaction.hasOne(models.Contract, { foreignKey: 'transactionId', as: 'createdContract' });
      Transaction.hasOne(models.TransactionReceipt, { foreignKey: 'transactionId', as: 'receipt' });
      Transaction.hasOne(models.TransactionEvent, { foreignKey: 'transactionId', as: 'event' });
      Transaction.hasMany(models.TokenTransfer, { foreignKey: 'transactionId', as: 'tokenTransfers' });
      Transaction.hasMany(models.TokenBalanceChange, { foreignKey: 'transactionId', as: 'tokenBalanceChanges' });
      Transaction.hasMany(models.TransactionTraceStep, { foreignKey: 'transactionId', as: 'traceSteps' });
    }

    /**
     * Get trace steps for a transaction
     * @returns {Promise<Array>} - An array of trace steps
     */
    getTraceSteps() {
        return sequelize.query(`
            SELECT
                tts.id,
                tts."transactionId",
                tts.address,
                tts.depth,
                tts.input,
                tts.op,
                tts."returnData",
                tts.value,
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenDecimals" AS "contract.tokenDecimals",
                c."name" AS "contract.name",
                c."abi" AS "contract.abi"
            FROM transaction_trace_steps tts
            LEFT JOIN contracts c ON
                tts.address = c.address
                AND tts."workspaceId" = c."workspaceId"
            WHERE tts."transactionId" = :transactionId
            AND tts."workspaceId" = :workspaceId
            ORDER BY tts.id ASC
        `, {
            replacements: { transactionId: this.id, workspaceId: this.workspaceId },
            type: sequelize.QueryTypes.SELECT,
            nest: true
        });
    }

    /**
     * Get token balance changes for a transaction
     * @param {number} page - The page number to fetch
     * @param {number} itemsPerPage - The number of items per page
     * @returns {Promise<Array>} - An array of token balance changes
     */
    async getTokenBalanceChanges(page = 1, itemsPerPage = 10) {
        const result = await sequelize.query(`
            SELECT
                tbc.token,
                tbc.address,
                tbc."currentBalance",
                tbc."previousBalance",
                tbc."diff",
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenDecimals" AS "contract.tokenDecimals",
                c."name" AS "contract.name"
            FROM token_balance_changes tbc
            LEFT JOIN contracts c ON
                tbc.token = c.address
                AND tbc."workspaceId" = c."workspaceId"
            WHERE tbc."transactionId" = :transactionId
            AND tbc."workspaceId" = :workspaceId
            ORDER BY tbc.id DESC
            LIMIT :itemsPerPage OFFSET :offset
        `, {
            replacements: {
                transactionId: this.id,
                workspaceId: this.workspaceId,
                itemsPerPage: itemsPerPage,
                offset: (Math.max(page, 1) - 1) * itemsPerPage
            },
            type: sequelize.QueryTypes.SELECT,
            nest: true
        });

        const processedTokenBalanceChanges = [];

        const explorer = await sequelize.models.Explorer.findOne({ where: { workspaceId: this.workspaceId } });
        for (const balanceChange of result) {
            const balanceChangeCopy = { ...balanceChange };
            if (balanceChange.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                // Only inject custom contract object for native token
                if (explorer) {
                    balanceChangeCopy.contract = {
                        tokenSymbol: explorer.token || 'ETH',
                        tokenDecimals: 18,
                        tokenName: explorer.token || 'Ether'
                    };
                }
            }
            processedTokenBalanceChanges.push(balanceChangeCopy);
        }

        return processedTokenBalanceChanges;
    }

    /**
     * Safely destroys the transaction along with all related records.
     * Destroys receipt, trace steps, event, token transfers, and unlinks created contract.
     * @param {Object} transaction - Sequelize transaction
     * @returns {Promise<void>}
     */
    async safeDestroy(transaction) {
        const receipt = await this.getReceipt();
        if (receipt)
            await receipt.safeDestroy(transaction);

        sequelize.models.TransactionTraceStep.destroy({
            where: { transactionId: this.id },
            transaction
        });

        const event = await this.getEvent();
        if (event)
            await event.destroy({ transaction });

        // Delete token transfers that aren't handled by the receipt chain
        // (like reward transfers created directly on the transaction)
        const tokenTransfers = await this.getTokenTransfers();
        for (let i = 0; i < tokenTransfers.length; i++)
            await tokenTransfers[i].safeDestroy(transaction);

        const contract = await sequelize.models.Contract.findOne({ where: { transactionId: this.id }});
        if (contract)
            await contract.update({ transactionId: null }, { transaction });

        return this.destroy({ transaction });
    }

    /**
     * Creates a transaction receipt and processes its logs.
     * Updates transaction state to ready and triggers real-time updates.
     * @param {Object} receipt - Receipt data with logs
     * @returns {Promise<TransactionReceipt>} The created receipt
     * @throws {Error} If receipt parameter is missing
     */
    async safeCreateReceipt(receipt) {
        if (!receipt) throw new Error('Missing parameter');

        return sequelize.transaction(async transaction => {
            // Check if this transaction still exists before proceeding
            // Prevents race condition with workspace reset operations that delete transactions
            const transactionExists = await sequelize.models.Transaction.findByPk(this.id, {
                attributes: ['id'],
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!transactionExists) {
                return 'Transaction no longer exists';
            }

            await this.update({ state: 'ready' }, { transaction });

            const [storedReceipt] = await sequelize.models.TransactionReceipt.bulkCreate(
                [
                    stringifyBns(sanitize({
                        transactionId: this.id,
                        workspaceId: this.workspaceId,
                        blockHash: receipt.blockHash,
                        blockNumber: receipt.blockNumber,
                        byzantium: receipt.byzantium,
                        confirmations: receipt.confirmations,
                        contractAddress: receipt.contractAddress,
                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                        from: receipt.from,
                        gasUsed: receipt.gasUsed,
                        logsBloom: receipt.logsBloom,
                        status: receipt.status,
                        to: receipt.to,
                        transactionHash: receipt.transactionHash !== undefined ? receipt.transactionHash : receipt.hash,
                        transactionIndex: receipt.transactionIndex !== undefined && receipt.transactionIndex !== null ? receipt.transactionIndex : receipt.index,
                        type: receipt.type,
                        blobGasUsed: receipt.blobGasUsed,
                        blobGasPrice: receipt.blobGasPrice,
                        timeboosted: receipt.timeboosted,
                        gasUsedForL1: receipt.gasUsedForL1,
                        effectiveGasPrice: receipt.effectiveGasPrice,
                        raw: receipt.raw
                    }))
                ],
                {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction
                }
            );

            if (!storedReceipt || !storedReceipt.id)
                return 'Receipt already exists';

            const processedLogs = [];
            for (let i = 0; i < receipt.logs.length; i++) {
                const log = processRawRpcObject(
                    receipt.logs[i],
                    Object.keys(sequelize.models.TransactionLog.rawAttributes)
                );

                processedLogs.push(sanitize({
                    transactionReceiptId: storedReceipt.id,
                    workspaceId: this.workspaceId,
                    address: log.address,
                    blockHash: log.blockHash,
                    blockNumber: log.blockNumber || receipt.blockNumber,
                    data: log.data,
                    logIndex: log.logIndex,
                    topics: log.topics,
                    transactionHash: log.transactionHash,
                    transactionIndex: log.transactionIndex,
                    raw: log.raw
                }));
            }

            let storedLogs;
            try {
                storedLogs = await sequelize.models.TransactionLog.bulkCreate(processedLogs,
                    {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction
                    }
                );
            } catch(error) {
                logger.error(error.message, { location: 'models.transaction.safeCreateReceipt', error: error, receipt, transaction: this });
                storedLogs = [];
                for (let i = 0; i < processedLogs.length; i++) {
                    const log = processedLogs[i];
                    storedLogs.push([
                        await sequelize.models.TransactionLog.bulkCreate(
                            [
                                sanitize({
                                    workspaceId: this.workspaceId,
                                    transactionReceiptId: storedReceipt.id,
                                    transactionId: this.id,
                                    blockNumber: log.blockNumber || receipt.blockNumber,
                                    raw: log.raw
                                })
                            ],
                            {
                                ignoreDuplicates: true,
                                returning: true,
                                transaction
                            }
                        )
                    ]);
                }
            }

            // Orbit deposit finalization
            if (this.requestId) {
                const orbitDeposit = await sequelize.models.OrbitDeposit.findOne({
                    where: {
                        workspaceId: this.workspaceId,
                        messageIndex: this.requestId
                    }
                });

                if (orbitDeposit) {
                    await orbitDeposit.finalize({
                        l2TransactionId: this.id,
                        l2TransactionHash: this.hash
                    }, transaction);
                }
            }

            if (receipt.to && this.data.length > 2) {

                if (receipt.workspace.orbitConfig) {
                    // Detect orbit withdrawals
                    for (const log of storedLogs) {
                        if (isWithdrawalLog(log)) {
                            const withdrawalData = getWithdrawalData(log, this);
                            let tokenSymbol, tokenDecimals;
                            if (withdrawalData.l1Token) {
                                const parentWorkspace = await receipt.workspace.orbitConfig.getParentWorkspace();
                                ({ tokenSymbol, tokenDecimals } = await getWithdrawalTokenInfo(withdrawalData.l1Token, parentWorkspace.rpcServer));
                            }

                            const [createdWithdrawal] = await sequelize.models.OrbitWithdrawal.bulkCreate([
                                {
                                    workspaceId: receipt.workspace.id,
                                    l2TransactionId: this.id,
                                    l2TransactionHash: this.hash,
                                    messageNumber: withdrawalData.position,
                                    to: withdrawalData.destination,
                                    amount: withdrawalData.amount,
                                    l1TokenAddress: withdrawalData.l1Token,
                                    tokenSymbol,
                                    tokenDecimals,
                                    timestamp: withdrawalData.timestamp,
                                    from: withdrawalData.caller
                                }
                            ], {
                                ignoreDuplicates: true,
                                returning: true,
                                transaction
                            });

                            logger.info(`Created withdrawal #${createdWithdrawal.messageNumber} for transaction ${this.hash}`);
                        }
                    }
                }

                for (const orbitChildConfig of receipt.workspace.orbitChildConfigs) {
                    logger.info(`${receipt.workspace.id} has child ${orbitChildConfig.workspaceId}`)

                    // Detect withdrawal confirmations
                    if (this.to.toLowerCase() === orbitChildConfig.outboxContract.toLowerCase()) {
                        logger.info(`Processing outbox transaction executed log for transaction ${this.hash}`);

                        for (const log of storedLogs) {
                            if (isOutboxTransactionExecutedLog(log)) {
                                const outboxTransactionExecutedData = getOutboxTransactionExecutedData(log);
                                const orbitWithdrawal = await sequelize.models.OrbitWithdrawal.findOne({
                                    where: {
                                        workspaceId: orbitChildConfig.workspaceId,
                                        messageNumber: outboxTransactionExecutedData.transactionIndex
                                    }
                                });

                                if (!orbitWithdrawal)
                                    throw new Error('Could not find pending withdrawal');

                                await orbitWithdrawal.finalize(this.id, transaction);
                            }
                        }
                    }

                    // Detect orbit batch operations
                    if (this.to.toLowerCase() === orbitChildConfig.sequencerInboxContract.toLowerCase()) {
                        logger.info(`Processing orbit batch operations for transaction ${this.hash}`);
                        for (const log of storedLogs) {
                            if (isOrbitBatchDeliveredLog(log)) {
                                const batchDeliveredData = {
                                    workspaceId: orbitChildConfig.workspaceId,
                                    parentChainBlockNumber: receipt.blockNumber,
                                    parentChainTxHash: this.hash,
                                    postedAt: this.timestamp,
                                    confirmationStatus: orbitChildConfig.topParentChainBlockValidationType == 'LATEST' ? 'finalized' : 'pending',
                                    ...getOrbitBatchDeliveredData(log, this)
                                };
                                logger.info(`Processing orbit batch ${batchDeliveredData.batchSequenceNumber} delivered log for transaction ${this.hash}`);
                                const [createdBatch] = await sequelize.models.OrbitBatch.bulkCreate([batchDeliveredData], {
                                    ignoreDuplicates: true,
                                    returning: true,
                                    transaction
                                });
                                await createdBatch.safeUpdateBlocks({
                                    parentMessageCountShift: orbitChildConfig.parentMessageCountShift,
                                    transaction
                                });
                                logger.info(`Created batch ${createdBatch.id} for transaction ${this.hash}`);
                            }
                        }
                    }

                    // Detect orbit node logs
                    if (this.to.toLowerCase() === orbitChildConfig.rollupContract.toLowerCase()) {
                        logger.info(`Processing orbit node logs for transaction ${this.hash} - workspace ${this.workspaceId}`);
                        for (const log of storedLogs) {
                            if (isOrbitNodeCreatedLog(log)) {
                                logger.info(`Processing orbit node created log for transaction ${this.hash}`);
                                const createdNodeData = {
                                    workspaceId: orbitChildConfig.workspaceId,
                                    ...getOrbitCreatedNodeData(log)
                                };
                                const [createdNode] = await sequelize.models.OrbitNode.bulkCreate([createdNodeData], {
                                    ignoreDuplicates: true,
                                    returning: true,
                                    transaction
                                });
                                logger.info(`Created node ${createdNode.id} for transaction ${this.hash}`);
                            }
                            else if (isOrbitNodeConfirmedLog(log)) {
                                logger.info(`Processing orbit node confirmed log for transaction ${this.hash}`);
                                const confirmedNodeData = getOrbitConfirmedNodeData(log);

                                const where = { workspaceId: orbitChildConfig.workspaceId };
                                if (confirmedNodeData.nodeNum)
                                    where.nodeNum = confirmedNodeData.nodeNum;
                                if (confirmedNodeData.nodeHash)
                                    where.nodeHash = confirmedNodeData.nodeHash;

                                const orbitNode = await sequelize.models.OrbitNode.findOne({ where });

                                if (!orbitNode) {
                                    logger.error(`Orbit node ${confirmedNodeData.nodeNum} not found for transaction ${this.hash}`);
                                    continue;
                                }
                                if (orbitNode.confirmed)
                                    logger.info(`Node ${orbitNode.nodeNum} already confirmed for transaction ${this.hash}`);
                                else {
                                    await orbitNode.confirm(confirmedNodeData, transaction);
                                    logger.info(`Confirmed node ${orbitNode.id} for transaction ${this.hash}`);
                                }
                            }
                            else if (isOrbitNodeRejectedLog(log)) {
                                console.log('Node rejected', log);
                            }
                        }
                    }
                }

                // OP Stack L1 event processing (when this L1 workspace has OP L2 children)
                for (const opChildConfig of receipt.workspace.opChildConfigs || []) {
                    // Detect deposits (TransactionDeposited events on OptimismPortal)
                    if (opChildConfig.optimismPortalAddress && this.to?.toLowerCase() === opChildConfig.optimismPortalAddress.toLowerCase()) {
                        for (const log of storedLogs) {
                            if (isTransactionDepositedLog(log)) {
                                try {
                                    const depositData = getTransactionDepositedData(log);
                                    const l2TxHash = deriveL2TransactionHash({
                                        l1BlockNumber: receipt.blockNumber,
                                        l1TransactionHash: this.hash,
                                        logIndex: log.logIndex
                                    });

                                    await sequelize.models.OpDeposit.bulkCreate([{
                                        workspaceId: opChildConfig.workspaceId,
                                        l1BlockNumber: receipt.blockNumber,
                                        l1TransactionHash: this.hash,
                                        l1TransactionId: this.id,
                                        l2TransactionHash: l2TxHash,
                                        from: depositData.from,
                                        to: depositData.to,
                                        value: depositData.value,
                                        gasLimit: depositData.gasLimit,
                                        data: depositData.data,
                                        isCreation: depositData.isCreation,
                                        status: 'pending'
                                    }], {
                                        ignoreDuplicates: true,
                                        returning: true,
                                        transaction
                                    });

                                    logger.info(`Created OP deposit for L2 workspace ${opChildConfig.workspaceId} from L1 tx ${this.hash}`);
                                } catch (error) {
                                    logger.error(`Error processing OP deposit: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opDeposit', error });
                                }
                            }

                            // Detect withdrawal proofs
                            if (isWithdrawalProvenLog(log)) {
                                try {
                                    const provenData = getWithdrawalProvenData(log);
                                    const withdrawal = await sequelize.models.OpWithdrawal.findOne({
                                        where: {
                                            workspaceId: opChildConfig.workspaceId,
                                            withdrawalHash: provenData.withdrawalHash
                                        }
                                    });

                                    if (withdrawal) {
                                        await withdrawal.update({
                                            status: 'proven',
                                            l1ProofTransactionHash: this.hash,
                                            provenAt: new Date()
                                        }, { transaction });
                                        logger.info(`OP withdrawal ${provenData.withdrawalHash} proven in tx ${this.hash}`);
                                    }
                                } catch (error) {
                                    logger.error(`Error processing OP withdrawal proof: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opWithdrawalProven', error });
                                }
                            }

                            // Detect withdrawal finalizations
                            if (isWithdrawalFinalizedLog(log)) {
                                try {
                                    const finalizedData = getWithdrawalFinalizedData(log);
                                    const withdrawal = await sequelize.models.OpWithdrawal.findOne({
                                        where: {
                                            workspaceId: opChildConfig.workspaceId,
                                            withdrawalHash: finalizedData.withdrawalHash
                                        }
                                    });

                                    if (withdrawal) {
                                        await withdrawal.update({
                                            status: 'finalized',
                                            l1FinalizeTransactionHash: this.hash,
                                            finalizedAt: new Date()
                                        }, { transaction });
                                        logger.info(`OP withdrawal ${finalizedData.withdrawalHash} finalized in tx ${this.hash}`);
                                    }
                                } catch (error) {
                                    logger.error(`Error processing OP withdrawal finalization: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opWithdrawalFinalized', error });
                                }
                            }
                        }
                    }

                    // Detect output proposals (L2OutputOracle - legacy)
                    if (opChildConfig.l2OutputOracleAddress && this.to?.toLowerCase() === opChildConfig.l2OutputOracleAddress.toLowerCase()) {
                        for (const log of storedLogs) {
                            if (isOutputProposedLog(log)) {
                                try {
                                    const outputData = getOutputProposedData(log);
                                    const challengePeriodEnds = calculateChallengePeriodEnd(
                                        parseInt(outputData.l1Timestamp),
                                        opChildConfig.challengePeriodSeconds || 604800
                                    );

                                    await sequelize.models.OpOutput.bulkCreate([{
                                        workspaceId: opChildConfig.workspaceId,
                                        outputIndex: parseInt(outputData.l2OutputIndex),
                                        outputRoot: outputData.outputRoot,
                                        l2BlockNumber: parseInt(outputData.l2BlockNumber),
                                        l1BlockNumber: receipt.blockNumber,
                                        l1TransactionHash: this.hash,
                                        l1TransactionId: this.id,
                                        proposer: this.from,
                                        timestamp: new Date(parseInt(outputData.l1Timestamp) * 1000),
                                        challengePeriodEnds: new Date(challengePeriodEnds * 1000),
                                        status: 'proposed'
                                    }], {
                                        ignoreDuplicates: true,
                                        returning: true,
                                        transaction
                                    });

                                    logger.info(`Created OP output ${outputData.l2OutputIndex} for L2 workspace ${opChildConfig.workspaceId}`);
                                } catch (error) {
                                    logger.error(`Error processing OP output proposal: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opOutput', error });
                                }
                            }
                        }
                    }

                    // Detect dispute game creation (DisputeGameFactory - modern/fault proofs)
                    if (opChildConfig.disputeGameFactoryAddress && this.to?.toLowerCase() === opChildConfig.disputeGameFactoryAddress.toLowerCase()) {
                        for (const log of storedLogs) {
                            if (isDisputeGameCreatedLog(log)) {
                                try {
                                    const gameData = getDisputeGameCreatedData(log);
                                    const lastOutput = await sequelize.models.OpOutput.findOne({
                                        where: { workspaceId: opChildConfig.workspaceId },
                                        order: [['outputIndex', 'DESC']]
                                    });
                                    const nextOutputIndex = lastOutput ? lastOutput.outputIndex + 1 : 0;

                                    const challengePeriodEnds = calculateChallengePeriodEnd(
                                        Math.floor(Date.now() / 1000),
                                        opChildConfig.challengePeriodSeconds || 604800
                                    );

                                    await sequelize.models.OpOutput.bulkCreate([{
                                        workspaceId: opChildConfig.workspaceId,
                                        outputIndex: nextOutputIndex,
                                        outputRoot: gameData.rootClaim,
                                        l1BlockNumber: receipt.blockNumber,
                                        l1TransactionHash: this.hash,
                                        l1TransactionId: this.id,
                                        proposer: this.from,
                                        timestamp: new Date(),
                                        challengePeriodEnds: new Date(challengePeriodEnds * 1000),
                                        disputeGameAddress: gameData.disputeProxy,
                                        gameType: gameData.gameType,
                                        status: 'proposed'
                                    }], {
                                        ignoreDuplicates: true,
                                        returning: true,
                                        transaction
                                    });

                                    logger.info(`Created OP dispute game output for L2 workspace ${opChildConfig.workspaceId}`);
                                } catch (error) {
                                    logger.error(`Error processing OP dispute game: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opDisputeGame', error });
                                }
                            }
                        }
                    }
                }

                // OP Stack L2 event processing (when this L2 workspace has an OP config)
                if (receipt.workspace.opConfig) {
                    // Detect withdrawal initiations (MessagePassed on L2ToL1MessagePasser)
                    if (this.to?.toLowerCase() === L2_TO_L1_MESSAGE_PASSER_ADDRESS.toLowerCase()) {
                        for (const log of storedLogs) {
                            if (isMessagePassedLog(log)) {
                                try {
                                    const withdrawalData = getMessagePassedData(log);

                                    await sequelize.models.OpWithdrawal.bulkCreate([{
                                        workspaceId: receipt.workspace.id,
                                        withdrawalHash: withdrawalData.withdrawalHash,
                                        nonce: withdrawalData.nonce,
                                        l2BlockNumber: receipt.blockNumber,
                                        l2TransactionHash: this.hash,
                                        l2TransactionId: this.id,
                                        sender: withdrawalData.sender,
                                        target: withdrawalData.target,
                                        value: withdrawalData.value,
                                        gasLimit: withdrawalData.gasLimit,
                                        data: withdrawalData.data,
                                        status: 'initiated'
                                    }], {
                                        ignoreDuplicates: true,
                                        returning: true,
                                        transaction
                                    });

                                    logger.info(`Created OP withdrawal ${withdrawalData.withdrawalHash} from L2 tx ${this.hash}`);
                                } catch (error) {
                                    logger.error(`Error processing OP withdrawal initiation: ${error.message}`, { location: 'models.transaction.safeCreateReceipt.opWithdrawal', error });
                                }
                            }
                        }
                    }
                }
            }

            const tokenTransfers = [];
            for (let i = 0; i < storedLogs.length; i++) {
                const log = storedLogs[i];
                const tokenTransfer = getTokenTransfer(log);
                if (tokenTransfer && log.id)
                    tokenTransfers.push(sanitize({
                        transactionId: this.id,
                        transactionLogId: log.id,
                        workspaceId: this.workspaceId,
                        isReward: false,
                        ...tokenTransfer
                    }));
            }

            const block = await this.getBlock();
            let toValidator;
            if (this.type && this.type == 2) {
                // Use BigNumber for (effectiveGasPrice - baseFeePerGas) * gasUsed
                const effectiveGasPrice = ethers.BigNumber.from(String(receipt.effectiveGasPrice));
                const baseFeePerGas = ethers.BigNumber.from(String(block.baseFeePerGas || 0));
                const gasUsed = ethers.BigNumber.from(String(receipt.gasUsed));
                toValidator = effectiveGasPrice.sub(baseFeePerGas).mul(gasUsed);
            } else {
                // Use BigNumber for gasPrice * gasUsed
                const gasPrice = ethers.BigNumber.from(String(this.gasPrice));
                const gasUsed = ethers.BigNumber.from(String(receipt.gasUsed));
                toValidator = gasPrice.mul(gasUsed);
            }

            tokenTransfers.push(sanitize({
                transactionId: this.id,
                transactionLogId: null,
                workspaceId: this.workspaceId,
                src: this.from,
                dst: block.miner,
                amount: toValidator.toString(),
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                tokenId: null,
                isReward: true
            }));

            if (this.value) {
                // Use BigNumber for value comparison
                const valueBN = ethers.BigNumber.from(eToNumber(String(this.value)));
                if (valueBN.gt(ethers.constants.Zero)) {
                    let dstAddress = this.to;
                    // If contract creation (to is null), use receipt.contractAddress
                    if (!dstAddress && receipt.contractAddress) {
                        dstAddress = receipt.contractAddress;
                    }
                    tokenTransfers.push(sanitize({
                        transactionId: this.id,
                        transactionLogId: null,
                        workspaceId: this.workspaceId,
                        src: this.from,
                        dst: dstAddress,
                        amount: valueBN.toString(),
                        token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        tokenId: null,
                        isReward: false
                    }));
                }
            }

            const events = [];
            if (tokenTransfers.length > 0) {
                const storedTokenTransfers = await sequelize.models.TokenTransfer.bulkCreate(tokenTransfers, {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction
                });

                for (let i = 0; i < storedTokenTransfers.length; i++)
                    trigger(`private-contractLog;workspace=${this.workspaceId};contract=${tokenTransfers[i].address}`, 'new', null);

                for (let i = 0; i < storedTokenTransfers.length; i++) {
                    const tokenTransfer = storedTokenTransfers[i];
                    if (!tokenTransfer.id)
                        continue;

                    const contract = await sequelize.models.Contract.findOne({
                        where: {
                            workspaceId: this.workspaceId,
                            address: tokenTransfer.token
                        }
                    });
                    if (!contract && tokenTransfer.token !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                        const workspace = await this.getWorkspace();
                        await workspace.safeCreateOrUpdateContract({
                            address: tokenTransfer.token,
                            timestamp: moment(this.timestamp).unix()
                        }, transaction);
                    }

                    events.push(sanitize({
                        workspaceId: this.workspaceId,
                        tokenTransferId: tokenTransfer.id,
                        blockNumber: receipt.blockNumber,
                        timestamp: this.timestamp,
                        amount: tokenTransfer.amount,
                        token: tokenTransfer.token,
                        tokenType: contract ? contract.patterns[0] : null,
                        src: tokenTransfer.src,
                        dst: tokenTransfer.dst,
                        isReward: tokenTransfer.isReward
                    }));
                }
            }

            await sequelize.models.TokenTransferEvent.bulkCreate(events, {
                ignoreDuplicates: true,
                transaction
            });

            await storedReceipt.insertAnalyticEvent(transaction);

            return storedReceipt;
        });
    }

    /**
     * Gets paginated token transfers for this transaction.
     * @param {number} [page=1] - Page number
     * @param {number} [itemsPerPage=10] - Items per page
     * @param {string} [order='DESC'] - Sort order
     * @param {string} [orderBy='id'] - Field to order by
     * @returns {Promise<Object>} Paginated token transfer results
     */
    async getFilteredTokenTransfers(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'id') {
        const result = await sequelize.models.TokenTransfer.findAndCountAll({
            where: { transactionId: this.id, isReward: false },
            include: {
                model: sequelize.models.Contract,
                as: 'contract',
                attributes: ['tokenSymbol', 'tokenDecimals', 'isToken', 'patterns', 'name', 'tokenName'],
                include: {
                    model: sequelize.models.ContractVerification,
                    as: 'verification',
                    attributes: ['createdAt']
                }
            },
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });

        const tokenTransfers = result.rows.map(t => t.toJSON());
        const processedTokenTransfers = [];

        const explorer = await sequelize.models.Explorer.findOne({ where: { workspaceId: this.workspaceId } });
        for (const transfer of tokenTransfers) {
            const transferCopy = { ...transfer };
            if (transfer.token === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                // Only inject custom contract object for native token
                if (explorer) {
                    transferCopy.contract = {
                        tokenSymbol: explorer.token || 'ETH',
                        tokenDecimals: 18,
                        tokenName: explorer.token || 'Ether'
                    };
                }
            }
            processedTokenTransfers.push(transferCopy);
        }

        return {
            items: processedTokenTransfers,
            total: result.count
        };
    }

    /**
     * Counts the number of token transfers for this transaction.
     * @returns {Promise<number>} Token transfer count
     */
    async countTokenTransfers() {
        const [{ count }] = await sequelize.query(`
            SELECT COUNT(*)::int
            FROM token_transfers
            WHERE "transactionId" = :id
            AND "workspaceId" = :workspaceId
        `, {
            replacements: { id: this.id, workspaceId: this.workspaceId },
            type: sequelize.QueryTypes.SELECT
        });
        return count;
    }

    /**
     * Gets the contract associated with this transaction's to address.
     * @returns {Promise<Contract|null>} The contract or null
     */
    getContract() {
        return sequelize.models.Contract.findOne({
            where: {
                workspaceId: this.workspaceId,
                address: this.to
            }
        });
    }

    /**
     * Updates the transaction's method details.
     * @param {Object} methodDetails - Method details
     * @param {string} methodDetails.label - Method label
     * @param {string} methodDetails.name - Method name
     * @param {string} methodDetails.signature - Method signature
     * @returns {Promise<Transaction>} Updated transaction
     */
    updateMethodDetails(methodDetails) {
        return this.update(sanitize({
            methodLabel: methodDetails.label,
            methodName: methodDetails.name,
            methodSignature: methodDetails.signature
        }));
    }

    /**
     * Creates a token transfer record for this transaction.
     * @param {Object} tokenTransfer - Token transfer data
     * @returns {Promise<TokenTransfer>} Created token transfer
     */
    safeCreateTokenTransfer(tokenTransfer) {
        return this.createTokenTransfer(sanitize({
            workspaceId: this.workspaceId,
            dst: tokenTransfer.dst,
            src: tokenTransfer.src,
            amount: tokenTransfer.amount,
            token: tokenTransfer.token,
            tokenId: tokenTransfer.tokenId
        }));
    }

    /**
     * Updates the transaction with a failed transaction error.
     * @param {Object} error - Error object
     * @param {boolean} error.parsed - Whether error was parsed
     * @param {string} error.message - Error message
     * @returns {Promise<Transaction>} Updated transaction
     */
    updateFailedTransactionError(error) {
        return this.update({
            parsedError: error.parsed ? error.message : null,
            rawError: error.parsed ? null :  error.message
        });
    }

    /**
     * Updates the transaction's storage data.
     * @param {Object} data - Storage data
     * @returns {Promise<Transaction>} Updated transaction
     */
    safeUpdateStorage(data) {
        return this.update({
            storage: data
        });
    }

    /**
     * Triggers real-time events for the transaction.
     * Pushes updates to frontend subscribers.
     * @returns {Promise<void>}
     */
    async triggerEvents() {
        const data = {
            hash: this.hash,
            state: this.state,
            blockNumber: this.blockNumber,
            from: this.from,
            to: this.to
        };

        trigger(`private-transactions;workspace=${this.workspaceId}`, 'new', data);
        if (this.to)
            trigger(`private-transactions;workspace=${this.workspaceId};address=${this.to}`, 'new', data);
        
        return trigger(`private-transactions;workspace=${this.workspaceId};address=${this.from}`, 'new', data);
    };

    safeCreateTransactionTrace(steps) {
        return sequelize.transaction(async transaction => {

            // Find parent address for each step
            const findParentAddress = (step, steps) => {
                const filtered = steps.filter(s => s.depth === step.depth - 1);
                if (filtered.length === 0) return null;
                return filtered[filtered.length - 1].address;
            };

            const augmentedSteps = steps.map(step => ({
                ...step,
                workspaceId: this.workspaceId,
                timestamp: this.timestamp,
                transactionId: this.id,
                parentAddress: step.depth === 1 ? this.to : findParentAddress(step, steps)
            }));

            const tokenTransfers = [];
            for (const step of augmentedSteps) {
                // Use BigNumber for value comparison
                if (step.value) {
                    const valueBN = ethers.BigNumber.from(eToNumber(String(step.value)));
                    if (valueBN.gt(ethers.constants.Zero)) {
                        tokenTransfers.push(sanitize({
                            transactionId: this.id,
                            transactionLogId: null,
                            workspaceId: this.workspaceId,
                            src: step.parentAddress,
                            dst: step.address,
                            amount: valueBN.toString(),
                            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                            tokenId: null,
                            isReward: false
                        }));
                    }
                }
            }

            const createdTokenTransfers = await sequelize.models.TokenTransfer.bulkCreate(tokenTransfers, {
                ignoreDuplicates: true,
                transaction
            });

            const tokenTransferEvents = [];
            for (const tokenTransfer of createdTokenTransfers) {
                tokenTransferEvents.push(sanitize({
                    workspaceId: this.workspaceId,
                    tokenTransferId: tokenTransfer.id,
                    blockNumber: this.blockNumber,
                    timestamp: this.timestamp,
                    amount: tokenTransfer.amount,
                    token: tokenTransfer.token,
                    tokenType: null, // This is ok as we are only creating native token transfer events here
                    src: tokenTransfer.src,
                    dst: tokenTransfer.dst,
                    isReward: false
                }));
            }

            await sequelize.models.TokenTransferEvent.bulkCreate(tokenTransferEvents, {
                ignoreDuplicates: true,
                transaction
            });

            const contracts = steps
                .filter(step => step.contractHashedBytecode)
                .map(step => ({ address: step.address, workspaceId: this.workspaceId }));

            await sequelize.models.Contract.bulkCreate(contracts, {
                ignoreDuplicates: true,
                transaction
            });

            return sequelize.models.TransactionTraceStep.bulkCreate(augmentedSteps, {
                ignoreDuplicates: true,
                returning: true,
                transaction
            });
        });
    }

    async afterCreate(options) {
        const afterCommitFn = async () => {
            return this.triggerEvents();
        };

        if (options.transaction)
            return options.transaction.afterCommit(afterCommitFn);
        else
            return afterCommitFn();
    }

    async isOrbitTransaction() {
        const workspace = await this.getWorkspace({ include: ['orbitConfig'] });
        return !!workspace.orbitConfig;
    }

    async createOrbitState(initialState = 'SUBMITTED') {
        const workspace = await this.getWorkspace();
        return workspace.createOrbitTransactionState(this.id, initialState);
    }
  }
  Transaction.init({
    blockHash: DataTypes.STRING,
    blockNumber: DataTypes.INTEGER,
    blockId: DataTypes.INTEGER,
    chainId: DataTypes.INTEGER,
    creates: DataTypes.STRING,
    data: DataTypes.STRING,
    parsedError: DataTypes.STRING,
    rawError: DataTypes.JSON,
    from: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('from', value.toLowerCase());
        },
        get() {
            return this.getDataValue('from') ? this.getDataValue('from').toLowerCase() : null;
        }
    },
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    hash: DataTypes.STRING,
    methodDetails: {
        type: DataTypes.VIRTUAL,
        get() {
            return getTransactionMethodDetails(this, this.contract && this.contract.abi);
        }
    },
    nonce: DataTypes.INTEGER,
    r: DataTypes.STRING,
    s: DataTypes.STRING,
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            if (String(value).length > 10)
              this.setDataValue('timestamp', moment(value).format());
            else
              this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
    to: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('to', value.toLowerCase());
        },
        get() {
            return this.getDataValue('to') ? this.getDataValue('to').toLowerCase() : null;
        }
    },
    transactionIndex: DataTypes.INTEGER,
    type: DataTypes.INTEGER,
    v: DataTypes.INTEGER,
    value: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('value', value.toString(10));
        },
        get() {
            return this.getDataValue('value') ? this.getDataValue('value').toString(10) : null
        }
    },
    storage: DataTypes.JSON,
    raw: DataTypes.JSON,
    formattedBalanceChanges: {
        type: DataTypes.VIRTUAL,
        get() {
            if (this.tokenBalanceChanges) {
                return this.tokenBalanceChanges.reduce((r, a) => {
                    r[a.token] = r[a.token] || [];
                    r[a.token].push(a);
                    return r;
                }, Object.create(null));
            }
            else
                return {};
        }
    },
    workspaceId: DataTypes.INTEGER,
    state: DataTypes.ENUM('syncing', 'ready'),
    isReady: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('state') === 'ready';
        }
    },
    isSyncing: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.getDataValue('state') === 'syncing';
        }
    },
    maxFeePerGas: {
        type: DataTypes.STRING,
        get() {
            return String(this.getDataValue('maxFeePerGas') || this.getDataValue('raw.maxFeePerGas'));
        }
    },
    maxPriorityFeePerGas: {
        type: DataTypes.STRING,
        get() {
            return String(this.getDataValue('maxPriorityFeePerGas') || this.getDataValue('raw.maxPriorityFeePerGas'));
        }
    },
    gas: {
        type: DataTypes.STRING,
        get() {
            return String(this.getDataValue('gas') || this.getDataValue('raw.gas'));
        }
    },
    accessList: {
        type: DataTypes.JSON,
        get() {
            return this.getDataValue('accessList') || this.getDataValue('raw.accessList');
        }
    },
    yParity: {
        type: DataTypes.BOOLEAN,
        get() {
            return this.getDataValue('yParity') || this.getDataValue('raw.yParity');
        },
        set(value) {
            const _val = value == '0x1' ? true : false;
            this.setDataValue('yParity', _val);
        }
    },
    blobVersionedHashes: {
        type: DataTypes.JSON,
        get() {
            return this.getDataValue('blobVersionedHashes') || this.getDataValue('raw.blobVersionedHashes');
        }
    },
    maxFeePerBlobGas: {
        type: DataTypes.STRING,
        get() {
            return this.getDataValue('maxFeePerBlobGas') || this.getDataValue('raw.maxFeePerBlobGas');
        }
    },
    requestId: DataTypes.INTEGER
  }, {
    hooks: {
        afterBulkCreate(transactions, options) {
            return Promise.all(transactions.map(t => t.afterCreate(options)));
        },
        afterCreate(transaction, options) {
            return transaction.afterCreate(options);
        },
        afterSave(transaction, options) {
            return transaction.afterCreate(options);
        }
    },
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions'
  });
  return Transaction;
};
