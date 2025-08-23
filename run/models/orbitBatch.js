'use strict';
const { Model } = require('sequelize');
const { Op } = require('sequelize');
const logger = require('../lib/logger');
const { getTransactionMethodDetails } = require('../lib/abi');

module.exports = (sequelize, DataTypes) => {
    class OrbitBatch extends Model {
        static associate(models) {
            OrbitBatch.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
            OrbitBatch.hasMany(models.Block, { foreignKey: 'orbitBatchId', as: 'blocks' });
            OrbitBatch.belongsTo(models.OrbitNode, { foreignKey: 'orbitNodeId', as: 'orbitNode' });
        }

        async countTransactions() {
            const result = await sequelize.query(`
                SELECT COUNT(*)::integer
                FROM transactions t
                JOIN blocks b ON t."blockId" = b.id
                JOIN orbit_batches ob ON ob.id = b."orbitBatchId"
                WHERE ob."batchSequenceNumber" = :batchSequenceNumber
                AND ob."workspaceId" = :workspaceId;
            `, {
                replacements: {
                    batchSequenceNumber: this.batchSequenceNumber,
                    workspaceId: this.workspaceId
                },
                type: sequelize.QueryTypes.SELECT
            });

            return result[0].count;
        }

        async getFilteredTransactions(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber') {
            const result = await sequelize.query(`
                WITH batch_blocks AS (
                    SELECT 
                        b.id AS "blockId",
                        (ob."prevMessageCount" + oc."parentMessageCountShift") AS startBlock,
                        (ob."newMessageCount" + oc."parentMessageCountShift" - 1) AS endBlock
                    FROM blocks b
                    JOIN orbit_batches ob ON ob.id = b."orbitBatchId"
                    JOIN orbit_chain_configs oc ON oc."workspaceId" = ob."workspaceId"
                    WHERE b."orbitBatchId" = :batchId
                ),
                block_range AS (
                    SELECT 
                        MIN(startBlock) AS minBlock, 
                        MAX(endBlock) AS maxBlock
                    FROM batch_blocks
                ),
                paginated_transactions AS (
                    SELECT t.*
                    FROM transactions t
                    JOIN batch_blocks bb ON bb."blockId" = t."blockId"
                    CROSS JOIN block_range
                    WHERE t."blockNumber" BETWEEN block_range.minBlock AND block_range.maxBlock
                    ORDER BY t."blockNumber" ${order}
                    LIMIT :itemsPerPage
                    OFFSET :page
                )
                SELECT
                    t."blockNumber" AS "transaction.blockNumber",
                    t."from" AS "transaction.from",
                    t."gasPrice" AS "transaction.gasPrice",
                    t."hash" AS "transaction.hash",
                    t."data" AS "transaction.data",
                    t."timestamp" AS "transaction.timestamp",
                    t."to" AS "transaction.to",
                    t."value" AS "transaction.value",
                    t."workspaceId" AS "transaction.workspaceId",
                    t."state" AS "transaction.state",

                    tr."gasUsed" AS "transaction.receipt.gasUsed",
                    tr."status" AS "transaction.receipt.status",
                    tr."contractAddress" AS "transaction.receipt.contractAddress",
                    tr."raw"->>'root' AS "transaction.receipt.root",
                    tr."cumulativeGasUsed" AS "transaction.receipt.cumulativeGasUsed",
                    tr."raw"->>'effectiveGasPrice' AS "transaction.receipt.effectiveGasPrice",

                    "createdContract"."address" AS "transaction.receipt.createdContract.address",
                    "createdContract"."name" AS "transaction.receipt.createdContract.name",
                    "createdContract"."tokenDecimals" AS "transaction.receipt.createdContract.tokenDecimals",
                    "createdContract"."tokenName" AS "transaction.receipt.createdContract.tokenName",
                    "createdContract"."tokenSymbol" AS "transaction.receipt.createdContract.tokenSymbol",
                    "createdContract"."workspaceId" AS "transaction.receipt.createdContract.workspaceId",
                    "createdContract"."patterns" AS "transaction.receipt.createdContract.patterns",

                    "createdContractVerification"."createdAt" AS "transaction.receipt.contract.verification.createdAt",

                    b."number" AS "transaction.block.number",

                    c."name" AS "transaction.contract.name",
                    c."tokenName" AS "transaction.contract.tokenName",
                    c."tokenSymbol" AS "transaction.contract.tokenSymbol",
                    c."abi" AS "transaction.contract.abi",

                    cv."createdAt" AS "transaction.receipt.contract.verification.createdAt"
                FROM paginated_transactions t
                LEFT JOIN blocks b ON b."id" = t."blockId"
                LEFT JOIN transaction_receipts tr ON tr."transactionId" = t.id
                LEFT JOIN contracts "createdContract" 
                    ON "createdContract"."address" = tr."contractAddress" 
                AND "createdContract"."workspaceId" = tr."workspaceId"
                LEFT JOIN contract_verifications "createdContractVerification" 
                    ON "createdContractVerification"."contractId" = "createdContract"."id"
                LEFT JOIN contracts c 
                    ON c."address" = t."to" 
                AND c."workspaceId" = t."workspaceId"
                LEFT JOIN contract_verifications cv 
                    ON cv."contractId" = c.id;
            `, {
                    replacements: {
                        batchId: this.id,
                        orderBy,
                        order,
                        itemsPerPage,
                        page: (page - 1) * itemsPerPage
                    },
                    logging: console.log,
                    type: sequelize.QueryTypes.SELECT,
                    nest: true
                }
            );

            const res = result.map(item => {
                let transaction = item.transaction;
                if (transaction && transaction.receipt && transaction.receipt.createdContract) {
                    transaction.methodDetails = getTransactionMethodDetails({ data: transaction.data }, transaction.receipt.createdContract.abi);
                }
                else if (transaction && transaction.receipt && transaction.receipt.contract) {
                    transaction.methodDetails = getTransactionMethodDetails({ data: transaction.data }, transaction.contract.abi);
                }
                return transaction;
            });

            return res;
        }

        getFilteredBlocks(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'number') {
            return sequelize.models.Block.findAndCountAll({
                where: { orbitBatchId: this.id },
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage,
                order: [[orderBy, order]]
            });
        }

        safeUpdateBlocks({ parentMessageCountShift, transaction }) {
            const fromBlock = Number(this.prevMessageCount) + parentMessageCountShift;
            const toBlock = Number(this.newMessageCount) + parentMessageCountShift - 1;
            logger.info(`Updating blocks for batch #${this.batchSequenceNumber} (id: ${this.id}) from block ${fromBlock} to block ${toBlock}`);

            return sequelize.models.Block.update(
                { orbitBatchId: this.id },
                { 
                    where: {
                        workspaceId: this.workspaceId,
                        number: { [Op.between]: [fromBlock, toBlock] }
                    }
                },
                { transaction }
            );
        }

        async confirm(transaction) {

            const _confirm = async (transaction) => {
                const workspace = await this.getWorkspace();
                const orbitConfig = await workspace.getOrbitConfig();

                logger.info(`Finalizing batch ${this.batchSequenceNumber} on workspace ${workspace.name}`);

                await this.update({ confirmationStatus: 'confirmed' }, { transaction });

                const orbitChildConfigs = await workspace.getOrbitChildConfigs();
                for (const orbitChildConfig of orbitChildConfigs) {
                    const pendingBatches = await OrbitBatch.findAll({
                        where: {
                            workspaceId: orbitChildConfig.workspaceId,
                            confirmationStatus: 'pending',
                            parentChainBlockNumber: {
                                [Op.lt]: Number(this.newMessageCount) + orbitConfig.parentMessageCountShift
                            }
                        }
                    });

                    for (const batch of pendingBatches) {
                        await batch.confirm(transaction);
                    }
                }
            }

            if (transaction)
                return _confirm(transaction);
            else
                return sequelize.transaction(_confirm);
        }

        finalize(transaction) {
            return this.update({
                confirmationStatus: 'finalized',
            }, { transaction });
        }

        /**
         * Get batch status with human-readable description
         */
        getStatusInfo() {
            const statusMap = {
                pending: {
                    label: 'Pending',
                    description: 'Batch posted to parent chain, awaiting confirmation',
                    color: 'warning'
                },
                confirmed: {
                    label: 'Confirmed',
                    description: 'Batch has been confirmed on parent chain',
                    color: 'info'
                },
                challenged: {
                    label: 'Challenged',
                    description: 'Batch is under challenge, resolution pending',
                    color: 'error'
                },
                finalized: {
                    label: 'Finalized',
                    description: 'Batch is finalized and cannot be challenged',
                    color: 'success'
                }
            };
            
            return statusMap[this.confirmationStatus] || statusMap.pending;
        }

        /**
         * Get batch timing information
         */
        getTimingInfo() {
            const now = new Date();
            const postedAt = new Date(this.postedAt);
            const ageMs = now - postedAt;
            
            const timing = {
                postedAt: this.postedAt,
                ageMs,
                ageFormatted: this.formatDuration(ageMs)
            };

            if (this.confirmedAt) {
                const confirmedAt = new Date(this.confirmedAt);
                timing.confirmedAt = this.confirmedAt;
                timing.timeToConfirmMs = confirmedAt - postedAt;
                timing.timeToConfirmFormatted = this.formatDuration(timing.timeToConfirmMs);
            }

            if (this.finalizedAt) {
                const finalizedAt = new Date(this.finalizedAt);
                timing.finalizedAt = this.finalizedAt;
                timing.timeToFinalizeMs = finalizedAt - postedAt;
                timing.timeToFinalizeFormatted = this.formatDuration(timing.timeToFinalizeMs);
            }

            return timing;
        }

        /**
         * Format duration in milliseconds to human readable format
         */
        formatDuration(ms) {
            if (ms < 1000) return `${ms}ms`;
            if (ms < 60000) return `${Math.round(ms / 1000)}s`;
            if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
            if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
            return `${Math.round(ms / 86400000)}d`;
        }

        /**
         * Get batch economics (gas usage, costs)
         */
        getEconomics() {
            const economics = {};

            if (this.l1GasUsed) {
                economics.l1GasUsed = this.l1GasUsed;
                economics.l1GasUsedFormatted = this.l1GasUsed.toLocaleString();
            }

            if (this.l1GasPrice) {
                economics.l1GasPrice = this.l1GasPrice;
                economics.l1GasPriceGwei = (parseFloat(this.l1GasPrice) / 1e9).toFixed(2);
            }

            if (this.l1Cost) {
                economics.l1Cost = this.l1Cost;
                economics.l1CostEth = (parseFloat(this.l1Cost) / 1e18).toFixed(6);
            }

            if (this.transactionCount && economics.l1Cost) {
                economics.costPerTransaction = (parseFloat(this.l1Cost) / this.transactionCount).toFixed(0);
                economics.costPerTransactionEth = (parseFloat(economics.costPerTransaction) / 1e18).toFixed(8);
            }

            return economics;
        }

        /**
         * Update confirmation status
         */
        async updateConfirmationStatus(newStatus, metadata = {}) {
            const updateData = { confirmationStatus: newStatus };
            
            if (newStatus === 'confirmed' && !this.confirmedAt) {
                updateData.confirmedAt = new Date();
            }
            
            if (newStatus === 'finalized' && !this.finalizedAt) {
                updateData.finalizedAt = new Date();
            }

            if (Object.keys(metadata).length > 0) {
                updateData.metadata = {
                    ...this.metadata,
                    ...metadata,
                    [`${newStatus}UpdatedAt`]: new Date().toISOString()
                };
            }

            await this.update(updateData);
        }

        /**
         * Get summary information for list views
         */
        getSummary() {
            const status = this.getStatusInfo();
            const timing = this.getTimingInfo();
            const economics = this.getEconomics();

            return {
                batchSequenceNumber: this.batchSequenceNumber,
                parentChainBlockNumber: this.parentChainBlockNumber,
                parentChainTxHash: this.parentChainTxHash,
                transactionCount: this.transactionCount,
                batchSize: this.batchSize,
                status: status,
                timing: timing,
                economics: economics,
                batchDataLocation: this.batchDataLocation
            };
        }

        /**
         * Get detailed information for detail views
         */
        getDetailedInfo() {
            return {
                ...this.getSummary(),
                batchHash: this.batchHash,
                parentChainTxIndex: this.parentChainTxIndex,
                batchDataHash: this.batchDataHash,
                firstTxTimestamp: this.firstTxTimestamp,
                lastTxTimestamp: this.lastTxTimestamp,
                seqNumStart: this.seqNumStart,
                seqNumEnd: this.seqNumEnd,
                beforeAcc: this.beforeAcc,
                afterAcc: this.afterAcc,
                delayedAcc: this.delayedAcc,
                metadata: this.metadata,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt
            };
        }

        /**
         * Static method to find batches with pagination and filtering
         */
        static async findBatchesWithPagination(workspaceId, options = {}) {
            const {
                page = 1,
                limit = 50,
                status,
                fromDate,
                toDate,
                sortBy = 'batchSequenceNumber',
                sortOrder = 'DESC'
            } = options;

            const where = { workspaceId };

            if (status) {
                where.confirmationStatus = status;
            }

            if (fromDate || toDate) {
                where.postedAt = {};
                if (fromDate) where.postedAt[sequelize.Sequelize.Op.gte] = fromDate;
                if (toDate) where.postedAt[sequelize.Sequelize.Op.lte] = toDate;
            }

            const { count, rows } = await OrbitBatch.findAndCountAll({
                where,
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                include: [{
                    model: sequelize.models.Workspace,
                    as: 'workspace',
                    attributes: ['id', 'name']
                }]
            });

            return {
                batches: rows.map(batch => batch.getSummary()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                    hasNext: page * limit < count,
                    hasPrev: page > 1
                }
            };
        }

        /**
         * Static method to get batch statistics
         */
        static async getBatchStatistics(workspaceId, days = 30) {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            const [statusStats, dailyStats] = await Promise.all([
                // Status distribution
                OrbitBatch.findAll({
                    where: { 
                        workspaceId,
                        postedAt: { [sequelize.Sequelize.Op.gte]: since }
                    },
                    attributes: [
                        'confirmationStatus',
                        [sequelize.fn('COUNT', '*'), 'count']
                    ],
                    group: ['confirmationStatus']
                }),
                
                // Daily batch counts
                OrbitBatch.findAll({
                    where: { 
                        workspaceId,
                        postedAt: { [sequelize.Sequelize.Op.gte]: since }
                    },
                    attributes: [
                        [sequelize.fn('DATE', sequelize.col('postedAt')), 'date'],
                        [sequelize.fn('COUNT', '*'), 'count'],
                        [sequelize.fn('SUM', sequelize.col('transactionCount')), 'totalTransactions']
                    ],
                    group: [sequelize.fn('DATE', sequelize.col('postedAt'))],
                    order: [[sequelize.fn('DATE', sequelize.col('postedAt')), 'ASC']]
                })
            ]);

            return {
                statusDistribution: statusStats.reduce((acc, item) => {
                    acc[item.confirmationStatus] = parseInt(item.dataValues.count);
                    return acc;
                }, {}),
                dailyStats: dailyStats.map(item => ({
                    date: item.dataValues.date,
                    batchCount: parseInt(item.dataValues.count),
                    transactionCount: parseInt(item.dataValues.totalTransactions) || 0
                }))
            };
        }
    }

    OrbitBatch.init({
        workspaceId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        batchSequenceNumber: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        batchHash: {
            type: DataTypes.STRING(66),
            allowNull: true
        },
        parentChainBlockNumber: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        parentChainTxHash: {
            type: DataTypes.STRING(66),
            allowNull: false
        },
        parentChainTxIndex: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        transactionCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        batchDataLocation: {
            type: DataTypes.ENUM('onchain', 'das', 'ipfs'),
            allowNull: false,
            defaultValue: 'onchain'
        },
        batchDataHash: {
            type: DataTypes.STRING(66),
            allowNull: true
        },
        batchSize: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        postedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        firstTxTimestamp: {
            type: DataTypes.DATE,
            allowNull: true
        },
        lastTxTimestamp: {
            type: DataTypes.DATE,
            allowNull: true
        },
        confirmationStatus: {
            type: DataTypes.ENUM('pending', 'confirmed', 'challenged', 'finalized'),
            allowNull: false,
            defaultValue: 'pending'
        },
        confirmedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        finalizedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        beforeAcc: {
            type: DataTypes.STRING(66),
            allowNull: true
        },
        afterAcc: {
            type: DataTypes.STRING(66),
            allowNull: true
        },
        delayedAcc: {
            type: DataTypes.STRING(66),
            allowNull: true
        },
        l1GasUsed: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        l1GasPrice: {
            type: DataTypes.STRING,
            allowNull: true
        },
        l1Cost: {
            type: DataTypes.STRING,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        prevMessageCount: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        newMessageCount: {
            type: DataTypes.BIGINT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'OrbitBatch',
        tableName: 'orbit_batches',
        indexes: [
            {
                unique: true,
                fields: ['workspaceId', 'batchSequenceNumber']
            },
            {
                fields: ['parentChainBlockNumber']
            },
            {
                fields: ['postedAt']
            },
            {
                fields: ['confirmationStatus']
            }
        ]
    });

    return OrbitBatch;
};