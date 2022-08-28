'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const { enqueueTask } = require('../lib/tasks');
const { sanitize } = require('../lib/utils');
const { trigger } = require('../lib/pusher');
const moment = require('moment');

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
      Contract.hasMany(models.Erc721Token, { foreignKey: 'contractId', as: 'erc721Tokens' });
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

    async getErc721Token(tokenId) {
        const tokens = await this.getErc721Tokens({
            where: {
                tokenId: tokenId
            },
            include: {
                model: sequelize.models.Contract,
                attributes: ['address', 'tokenName', 'tokenSymbol'],
                as: 'contract'
            },
            attributes: ['owner', 'URI', 'tokenId', 'metadata', 'attributes']
        });
        return tokens[0];
    }

    getFilteredErc721Tokens(page = 1, itemsPerPage = 10, orderBy = 'tokenId', order = 'ASC') {
        return this.getErc721Tokens({
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });
    }

    async safeUpdateErc721Token(tokenId, fields) {
        const token = await this.getErc721Tokens({
            where: {
                tokenId: tokenId,
            }
        });

        return token[0].update(sanitize({
            metadata: fields.metadata,
            owner: fields.owner
        }));
    }

    async safeCreateErc721Token(token) {
        const existingToken = await this.getErc721Tokens({
            where: {
                tokenId: token.tokenId,
            }
        });
        if (existingToken.length > 0)
            return;

        return this.createErc721Token(sanitize({
            workspaceId: this.workspaceId,
            owner: token.owner,
            URI: token.URI,
            tokenId: token.tokenId,
            metadata: token.metadata
        }));
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
    timestamp: {
        type: DataTypes.DATE,
        set(value) {
            this.setDataValue('timestamp', moment.unix(value).format());
        }
    },
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
    verificationStatus: DataTypes.STRING,
    has721Metadata: DataTypes.BOOLEAN,
    has721Enumerable: DataTypes.BOOLEAN,
    tokenTotalSupply: DataTypes.STRING
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