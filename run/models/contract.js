'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const { enqueueTask } = require('../lib/tasks');
const { trigger } = require('../lib/pusher');

module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Contract.belongsTo(models.Workspace, { foreignKey: 'workspaceId', as: 'workspace' });
      Contract.hasOne(models.Contract, {
          sourceKey: 'proxy',
          foreignKey: 'address',
          as: 'proxyContract'
      });
    }

    getProxyContract() {
        if (!this.proxy) return null;

        return Contract.findOne({
            where: {
                workspaceId: this.workspaceId,
                address: this.proxy
            }
        });
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
    proxy: {
        type: DataTypes.STRING,
        set(value) {
            this.setDataValue('proxy', value.toLowerCase());
        }
    },
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
            trigger(`private-transactions;workspace=${contract.workspaceId};address=${contract.address}`, 'new', null);
            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'new', null);

            return enqueueTask('contractProcessing', {
                contractId: contract.id,
                workspaceId: contract.workspaceId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/contractProcessing`)
        },
        afterSave(contract, options) {
            trigger(`private-contracts;workspace=${contract.workspaceId}`, 'new', null);
            trigger(`private-transactions;workspace=${contract.workspaceId};address=${contract.address}`, 'new', null);

            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'new', null);

            return enqueueTask('contractProcessing', {
                contractId: contract.id,
                workspaceId: contract.workspaceId,
                secret: process.env.AUTH_SECRET
            }, `${process.env.CLOUD_RUN_ROOT}/tasks/contractProcessing`)
        }
    },
    sequelize,
    modelName: 'Contract',
    tableName: 'contracts'
  });
  return Contract;
};