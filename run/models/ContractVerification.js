'use strict';
const {
  Model
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractVerification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
        ContractVerification.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
        ContractVerification.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
        ContractVerification.hasMany(models.ContractSource, { foreignKey: 'contractVerificationId', as: 'sources' });
    }
  }
  ContractVerification.init({
    workspaceId: DataTypes.INTEGER,
    contractId: DataTypes.INTEGER,
    compilerVersion: DataTypes.STRING,
    evmVersion: DataTypes.STRING,
    contractName: DataTypes.STRING,
    runs: DataTypes.INTEGER,
    libraries: DataTypes.JSON,
    constructorArguments: DataTypes.JSON,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'ContractVerification',
    tableName: 'contract_verifications',
  });
  return ContractVerification;
};
