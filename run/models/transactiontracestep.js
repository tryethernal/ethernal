'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const { getTransactionMethodDetails } = require('../lib/abi');
module.exports = (sequelize, DataTypes) => {
  class TransactionTraceStep extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionTraceStep.belongsTo(models.Transaction, { foreignKey: 'id', as: 'transaction' });
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
    methodDetails: {
      type: DataTypes.VIRTUAL,
      get() {
          return getTransactionMethodDetails(this, this.contract && this.contract.abi);
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