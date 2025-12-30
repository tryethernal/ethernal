/**
 * @fileoverview TransactionTraceStep model - stores internal transaction trace steps.
 * Records CALL, DELEGATECALL, STATICCALL, CREATE operations from trace.
 *
 * @module models/TransactionTraceStep
 *
 * @property {number} id - Primary key
 * @property {number} workspaceId - Foreign key to workspace
 * @property {number} transactionId - Foreign key to transaction
 * @property {string} op - Operation type (CALL, DELEGATECALL, etc.)
 * @property {string} address - Target contract address
 * @property {number} depth - Call stack depth
 * @property {string} input - Call input data
 * @property {string} returnData - Call return data
 */

'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
module.exports = (sequelize, DataTypes) => {
  class TransactionTraceStep extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionTraceStep.belongsTo(models.Transaction, { foreignKey: 'id', as: 'transaction' });
      TransactionTraceStep.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      TransactionTraceStep.hasOne(models.Contract, {
          sourceKey: 'address',
          foreignKey:  'address',
          as: 'contract',
          scope: {
            [Op.and]: sequelize.where(sequelize.col("traceSteps.workspaceId"),
                Op.eq,
                sequelize.col("traceSteps->contract.workspaceId")
              ),
            },
          constraints: false
      });
    }
  }
  TransactionTraceStep.init({
    transactionId: DataTypes.INTEGER,
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    contractHashedBytecode: DataTypes.STRING,
    depth: DataTypes.INTEGER,
    input: DataTypes.STRING,
    op: DataTypes.STRING,
    returnData: DataTypes.STRING,
    workspaceId: DataTypes.INTEGER,
    value: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TransactionTraceStep',
    tableName: 'transaction_trace_steps'
  });
  return TransactionTraceStep;
};