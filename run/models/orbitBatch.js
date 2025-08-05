'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class OrbitBatch extends Model {
        static associate(models) {
            OrbitBatch.belongsTo(models.Workspace, {
                foreignKey: 'workspaceId',
                as: 'workspace'
            });
            
            // A batch can contain many transaction states
            OrbitBatch.hasMany(models.OrbitTransactionState, {
                foreignKey: 'batchSequenceNumber',
                sourceKey: 'batchSequenceNumber',
                as: 'transactionStates',
                scope: {
                    // Only link transactions from the same workspace
                    workspaceId: sequelize.where(sequelize.col('OrbitBatch.workspaceId'), '=', sequelize.col('transactionStates.workspaceId'))
                }
            });
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