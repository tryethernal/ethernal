'use strict';
const {
  Model
} = require('sequelize');
const { enqueueTask } = require('../lib/tasks');

module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contract.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
    }
  }
  Contract.init({
    workspaceId: DataTypes.INTEGER,
    hashedBytecode: DataTypes.STRING,
    abi: DataTypes.JSON,
    address: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('address', value.toLowerCase());
        }
    },
    imported: DataTypes.BOOLEAN,
    name: DataTypes.STRING,
    patterns: DataTypes.ARRAY(DataTypes.STRING),
    processed: DataTypes.BOOLEAN,
    timestamp: DataTypes.STRING,
    tokenDecimals: DataTypes.INTEGER,
    tokenName: DataTypes.STRING,
    tokenSymbol: DataTypes.STRING,
    watchedPaths: {
        type: DataTypes.STRING,
        get() {
            const raw = this.getDataValue('watchedPaths');
            return raw ? JSON.parse(raw) : [];
        }
    },
    verificationStatus: DataTypes.STRING
  }, {
    hooks: {
        afterUpdate(contract, options) {
            console.log(contract);
            return enqueueTask('contractProcessing', {
                contractId: contract.id,
                workspaceId: contract.workspaceId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/processContract`)
        },
        afterSave(contract, options) {
            console.log(contract);
            return enqueueTask('contractProcessing', {
                contractId: contract.id,
                workspaceId: contract.workspaceId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/processContract`)
        }
    },
    sequelize,
    modelName: 'Contract',
    tableName: 'contracts'
  });
  return Contract;
};