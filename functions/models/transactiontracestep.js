'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TransactionTraceStep extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TransactionTraceStep.belongsTo(models.Transaction, { foreignKey: 'id', as: 'transaction' });
    }
  }
  TransactionTraceStep.init({
    transactionId: DataTypes.INTEGER,
    address: DataTypes.STRING,
    contractHashedBytecode: DataTypes.STRING,
    depth: DataTypes.INTEGER,
    input: DataTypes.STRING,
    op: DataTypes.STRING,
    returnData: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'TransactionTraceStep',
    tableName: 'transaction_trace_steps'
  });
  return TransactionTraceStep;
};