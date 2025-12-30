/**
 * @fileoverview OrbitNode model - represents Arbitrum Orbit rollup nodes/assertions.
 * Tracks node creation, confirmation, and rejection events.
 *
 * @module models/OrbitNode
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to L2 workspace
 * @property {string} nodeNum - Node number in the chain
 * @property {string} nodeHash - Node hash
 * @property {boolean} confirmed - Whether node is confirmed
 */

'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrbitNode extends Model {
    static associate(models) {
      OrbitNode.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      OrbitNode.hasMany(models.OrbitBatch, { foreignKey: 'orbitNodeId', as: 'batches' });
    }

    async confirm(confirmedNodeData, transaction) {
      const latestConfirmedBlock = await sequelize.models.Block.findOne({
        where: {
          workspaceId: this.workspaceId,
          hash: confirmedNodeData.confirmedBlockHash
        },
        include: ['orbitBatch']
      });

      if (!latestConfirmedBlock)
        throw new Error('No confirmed block found');

      if (latestConfirmedBlock.orbitBatch) {
        const confirmedBatches = await sequelize.models.OrbitBatch.findAll({
          where: {
            workspaceId: this.workspaceId,
            batchSequenceNumber: {
              [Op.lte]: latestConfirmedBlock.orbitBatch.batchSequenceNumber
            }
          }
        });

        for (const batch of confirmedBatches) {
          await batch.finalize(this.id, transaction);
        }
      }

      await sequelize.models.OrbitWithdrawal.update({
        status: 'ready'
      }, {
        where: {
          workspaceId: this.workspaceId,
          messageNumber: {
            [Op.lte]: latestConfirmedBlock.sendCount
          },
          status: 'waiting'
        }
      }, { transaction });

      return this.update({
        status: 'confirmed',
        confirmedBlockHash: confirmedNodeData.confirmedBlockHash,
        confirmedSendRoot: confirmedNodeData.confirmedSendRoot
      }, { transaction });
    }
  }

  OrbitNode.init({
    workspaceId: DataTypes.INTEGER,
    nodeNum: DataTypes.BIGINT,
    createdTxHash: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    parentNodeHash: DataTypes.STRING,
    nodeHash: DataTypes.STRING,
    afterInboxBatchAcc: DataTypes.STRING,
    wasmModuleRoot: DataTypes.STRING,
    inboxMaxCount: DataTypes.BIGINT,
    confirmedBlockHash: DataTypes.STRING,
    confirmedSendRoot: DataTypes.STRING,
    status: DataTypes.ENUM('pending', 'confirmed', 'rejected')
  }, {
    sequelize,
    modelName: 'OrbitNode',
    tableName: 'orbit_nodes'
  });

  return OrbitNode;
};
