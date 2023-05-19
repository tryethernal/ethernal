'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractSource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        ContractSource.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
        ContractSource.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
        ContractSource.belongsTo(models.ContractVerification, { foreignKey: 'contractVerificationId', as: 'verification' });
    }
  }
  ContractSource.init({
    workspaceId: DataTypes.INTEGER,
    contractId: DataTypes.INTEGER,
    contractVerificationId: DataTypes.INTEGER,
    fileName: DataTypes.STRING,
    content: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ContractSource',
    tableName: 'contract_sources',
  });
  return ContractSource;
};
