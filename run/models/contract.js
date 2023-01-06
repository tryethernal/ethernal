'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
const Op = Sequelize.Op;
const { sanitize } = require('../lib/utils');
const { trigger } = require('../lib/pusher');
const { enqueue } = require('../lib/queue');
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
      Contract.hasMany(models.Transaction, { 
          sourceKey: 'address',
          foreignKey: 'to',
          as: 'transactions'
      });
      Contract.hasOne(models.Contract, {
          sourceKey: 'proxy',
          foreignKey: 'address',
          as: 'proxyContract'
      });
      Contract.hasMany(models.Erc721Token, { foreignKey: 'contractId', as: 'erc721Tokens' });
      Contract.hasOne(models.Transaction, {
          sourceKey: 'address',
          foreignKey: 'creates',
          as: 'creationTransaction',
          scope: {
              [Op.and]: sequelize.where(sequelize.col("Contract.workspaceId"),
                  Op.eq,
                  sequelize.col("creationTransaction.workspaceId")
              )
          },
      });
      Contract.hasMany(models.TransactionLog, {
          sourceKey: 'address',
          foreignKey: 'address',
          as: 'transactionLogs',
          scope: {
              [Op.and]: sequelize.where(sequelize.col("contracts.workspaceId"),
                  Op.eq,
                  sequelize.col("transaction_logs.workspaceId")
              )
          },
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

    async countErc20TokenHolders() {
        const result = await sequelize.models.TokenBalanceChange.findAll({
            where: {
                workspaceId: this.workspaceId,
                token: this.address
            },
            attributes: [
                sequelize.literal('COUNT(DISTINCT(address))', 'count')
            ],
            raw: true
        });
        return parseInt(result[0].count);
    }

    countErc20TokenTransfers() {
        return sequelize.models.TokenTransfer.count({
            where: {
                tokenId: null,
                workspaceId: this.workspaceId,
                '$contract.id$': { [Op.eq]: this.id }
            },
            include: 'contract'
        });
    }

    async getErc20TokenCirculatingSupply() {
        const result = await sequelize.models.TokenBalanceChange.findAll({
            where: {
                workspaceId: this.workspaceId,
                token: this.address
            },
            attributes: [
                sequelize.literal('SUM(diff::numeric)'),
            ],
            raw: true,
        });
        return result[0].sum;
    }

    getErc20TokenTransfers(page = 1, itemsPerPage = 10, orderBy = 'id', order = 'DESC') {
        return sequelize.models.TokenTransfer.findAll({
            where: {
                tokenId: null,
                workspaceId: this.workspaceId,
                '$contract.id$': { [Op.eq]: this.id }
            },
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['id', 'tokenName', 'tokenDecimals', 'tokenSymbol'],
                    as: 'contract'
                }
            ],
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        })
    }

    getErc721TokenTransfersByTokenId(tokenId) {
        return sequelize.models.TokenTransfer.findAll({
            where: {
                tokenId: tokenId,
                workspaceId: this.workspaceId,
                '$contract.id$': { [Op.eq]: this.id }
            },
            order: [
                ['id', 'desc']
            ],
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['id', 'tokenName', 'tokenDecimals', 'tokenSymbol', 'name', 'patterns'],
                    as: 'contract'
                },
                {
                    model: sequelize.models.Transaction,
                    attributes: ['hash', 'timestamp'],
                    as: 'transaction'
                }
            ],
            attributes: ['id', 'amount', 'dst', 'src', 'token', 'tokenId']
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

    countFilteredLogs(signature) {
        return sequelize.models.TransactionLog.count({
            include: {
                model: sequelize.models.Contract,
                as: 'contract'
            },
            where: {
                address: this.address,
                [Op.and]: sequelize.where(
                    sequelize.json('topics')[0],
                    Op.eq,
                    signature
                ),
                [Op.and]: sequelize.where(sequelize.col("contract.workspaceId"),
                  Op.eq,
                  sequelize.col("TransactionLog.workspaceId")
                )
            }
        });
    }

    getFilteredLogs(signature, page = 1, itemsPerPage = 10, orderBy = 'id', order = 'DESC') {
        return sequelize.models.TransactionLog.findAll({
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    as: 'receipt',
                    attributes: ['transactionHash', 'from', 'to']
                },
                {
                    model: sequelize.models.Contract,
                    as: 'contract',
                    attributes: ['id', 'name', 'abi', 'address', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'patterns']
                },
            ],
            attributes: ['id', 'workspaceId', 'address', 'data', 'topics'],
            where: {
                address: this.address,
                [Op.and]: sequelize.where(
                    sequelize.json('topics')[0],
                    Op.eq,
                    signature
                ),
                [Op.and]: sequelize.where(sequelize.col("contract.workspaceId"),
                  Op.eq,
                  sequelize.col("TransactionLog.workspaceId")
                )
            },
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });
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

    async safeCreateOrUpdateErc721Token(token) {
        const existingTokens = await this.getErc721Tokens({
            where: {
                tokenId: String(token.tokenId)
            }
        });
       
        if (existingTokens.length > 0)
            return this.safeUpdateErc721Token(existingTokens[0].tokenId, token)
        else
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
    tokenTotalSupply: DataTypes.STRING,
    ast: DataTypes.JSON,
    bytecode: DataTypes.TEXT,
    asm: DataTypes.TEXT
  }, {
    hooks: {
        afterDestroy(contract, options) {
            trigger(`private-contracts;workspace=${contract.workspaceId}`, 'destroyed', null);
            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'destroyed', null);
        },
        beforeUpdate(contract, options) {
            if (contract._changed.size > 0 && !contract._changed.has('processed') && !contract._changed.has('totalSupply'))
                contract.processed = false;
        },
        afterUpdate(contract, options) {
            trigger(`private-transactions;workspace=${contract.workspaceId};address=${contract.address}`, 'new', null);
            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'new', null);

            return enqueue(`contractProcessing`, `contractProcessing-${contract.id}`, { contractId: contract.id, workspaceId: contract.workspaceId });
        },
        afterSave(contract, options) {
            trigger(`private-contracts;workspace=${contract.workspaceId}`, 'new', null);
            trigger(`private-transactions;workspace=${contract.workspaceId};address=${contract.address}`, 'new', null);

            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'new', null);

            return enqueue(`contractProcessing`, `contractProcessing-${contract.id}`, { contractId: contract.id, workspaceId: contract.workspaceId });
        }
    },
    sequelize,
    modelName: 'Contract',
    tableName: 'contracts'
  });
  return Contract;
};