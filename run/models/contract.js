'use strict';

const {
  Model,
  Sequelize,
  QueryTypes
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
      Contract.hasOne(models.ContractVerification, { foreignKey: 'contractId', as: 'verification' });
      Contract.hasMany(models.ContractSource, { foreignKey: 'contractId', as: 'sources' });
    }

    safeCreateVerification(verificationData) {
        console.log(verificationData)
        const { compilerVersion, evmVersion, runs, sources, libraries, constructorArguments, contractName } = verificationData;

        if (!compilerVersion || !evmVersion || !sources)
            throw new Error('Missing parameter');

        return sequelize.transaction(async transaction => {
            const contractVerification = await this.createVerification({
                workspaceId: this.workspaceId,
                compilerVersion, evmVersion, runs, constructorArguments, libraries, contractName
            }, { transaction });

            const keys = Object.keys(sources);
            for (let i = 0; i < keys.length; i++) {
                const source = sources[keys[i]].content;
                await this.createSource({
                    workspaceId: this.workspaceId,
                    contractVerificationId: contractVerification.id,
                    fileName: keys[i],
                    content: source
                }, { transaction });
            }

            return contractVerification;
        });
    }

    getTokenHolderHistory(from, to) {
        if (!from || !to) return new Promise(resolve => resolve([]));

        return sequelize.query(`
            WITH days as (
                SELECT
                    date_trunc('day', d) as day
                FROM generate_series(timestamp :from, timestamp :to, interval  '1 day') d
            ),
            data as (
                SELECT
                    days.day,
                    (
                        SELECT COUNT(DISTINCT(address))
                        FROM token_balance_changes
                        LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                        WHERE token_balance_changes.token = :token
                        AND (
                            SELECT SUM(diff::numeric) AS value
                            FROM token_balance_changes
                            LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                            WHERE token_balance_changes."workspaceId" = :workspaceId
                            AND token_balance_changes.token = :token
                            AND transactions.timestamp::date <= days.day
                            AND token_balance_changes.address = address
                        )::numeric > 0 
                        AND token_balance_changes."workspaceId" = :workspaceId
                        AND transactions.timestamp::date <= days.day
                    ) AS count
                FROM days
                GROUP BY days.day
            )

            SELECT
                day AS timestamp,
                count
            FROM data
            ORDER BY day ASC
        `, {
            replacements: {
                from: from,
                to: to,
                token: this.address,
                workspaceId: this.workspaceId
            },
            type: QueryTypes.SELECT
        });
    }

    getTokenCumulativeSupply(from, to) {
        if (!from || !to) return new Promise(resolve => resolve([]));

        return sequelize.query(`
            WITH init as (
                SELECT coalesce(sum(diff::numeric), 0) as supply
                FROM token_balance_changes
                LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                WHERE token_balance_changes.token = :token
                AND token_balance_changes."workspaceId" = :workspaceId
                AND transactions.timestamp::date < :from
            ),
            days as (
                SELECT
                    date_trunc('day', d) as day
                FROM generate_series(timestamp :from, timestamp :to, interval  '1 day') d
            ),
            data as (
                SELECT
                    days.day,
                    (
                        SELECT coalesce(sum(diff::numeric), 0)
                        FROM token_balance_changes
                        LEFT JOIN transactions ON token_balance_changes."transactionId" = transactions.id
                        WHERE token_balance_changes.token = :token
                        AND token_balance_changes."workspaceId" = :workspaceId
                        AND transactions.timestamp::date = days.day
                    ) AS supply
                FROM days
                GROUP BY days.day
            )

            SELECT
                day AS timestamp,
                (sum(data.supply) OVER (order by day asc rows between unbounded preceding and current row)) + init.supply AS "cumulativeSupply"
            FROM data
            CROSS JOIN init
        `, {
            replacements: {
                from: from,
                to: to,
                token: this.address,
                workspaceId: this.workspaceId
            },
            type: QueryTypes.SELECT
        });
    }

    getTokenTransferVolume(from, to) {
        if (!from || !to) return new Promise(resolve => resolve([]));

        return sequelize.query(`
            WITH days as (
                SELECT
                    date_trunc('day', d) as day
                FROM generate_series(timestamp :from, timestamp :to, interval  '1 day') d
            ),
            data as (
                SELECT
                    days.day,
                    (
                        SELECT count(1)
                        FROM token_transfers
                        LEFT JOIN transactions ON token_transfers."transactionId" = transactions.id
                        WHERE token_transfers.token = :token
                        AND transactions.timestamp::date = days.day
                        AND token_transfers."workspaceId" = :workspaceId
                    ) AS count
                FROM days
                GROUP BY days.day
            )

            SELECT
                day AS timestamp,
                count
            FROM data
            ORDER BY day ASC
        `, {
            replacements: {
                from: from,
                to: to,
                token: this.address,
                workspaceId: this.workspaceId
            },
            type: QueryTypes.SELECT
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

    getTokenHolders(page = 1, itemsPerPage = 10, orderBy = 'amount', order = 'DESC') {
        const sanitizedOrderBy = ['address', 'amount', 'share'].indexOf(orderBy) > -1 ? orderBy : 'amount';
        const sanitizedOrder = ['desc', 'asc'].indexOf(order.toLowerCase()) > -1 ? order : 'DESC';

        return sequelize.query(`
            WITH balances AS (
                SELECT DISTINCT ON (address) address, "blockNumber", "currentBalance"::numeric cb
                FROM token_balance_changes
                LEFT JOIN transactions t ON t.id = token_balance_changes."transactionId"
                WHERE token_balance_changes."workspaceId" = :workspaceId AND token = :token
                ORDER BY "address", "blockNumber" DESC
            ),
            supply AS (
                SELECT sum("cb"::numeric) AS value FROM balances
            )
            SELECT balances.address, balances.cb AS amount, balances.cb::float / supply.value::float AS share
            FROM balances, supply
            ORDER BY ${sanitizedOrderBy} ${sanitizedOrder} LIMIT :itemsPerPage OFFSET :offset;
        `, {
            replacements: {
                workspaceId: this.workspaceId,
                token: this.address,
                itemsPerPage:itemsPerPage,
                offset: (page - 1) * itemsPerPage
            },
            type: QueryTypes.SELECT
        });
    }

    async countTokenHolders() {
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

    countTokenTransfers() {
        return sequelize.models.TokenTransfer.count({
            where: {
                workspaceId: this.workspaceId,
                token: this.address
            }
        });
    }

    async getTokenCirculatingSupply() {
        const res = await sequelize.query(`
            WITH balances AS (
                SELECT DISTINCT ON (address) address, "blockNumber", "currentBalance"::numeric cb
                FROM token_balance_changes
                LEFT JOIN transactions t ON t.id = token_balance_changes."transactionId"
                WHERE token_balance_changes."workspaceId" = :workspaceId AND token = :token
                ORDER BY "address", "blockNumber" DESC
            )
            SELECT sum("cb"::numeric) AS value FROM balances
        `, {
            replacements: {
                workspaceId: this.workspaceId,
                token: this.address,
            },
            type: QueryTypes.SELECT
        });

        return res[0] && res[0].value;
    }

    getTokenTransfers(page = 1, itemsPerPage = 10, orderBy = 'id', order = 'DESC', fromBlock = 0) {
        let sanitizedOrderBy;
        switch(orderBy) {
            case 'timestamp':
            case 'transactionHash':
            case 'blockNumber':
                sanitizedOrderBy = ['transaction', orderBy];
                break;
            case 'amount':
                sanitizedOrderBy = [sequelize.cast(sequelize.col('"TokenTransfer".amount'), 'numeric')];
                break;
            default:
                sanitizedOrderBy = [orderBy];
                break;
        }

        return sequelize.models.TokenTransfer.findAndCountAll({
            where: {
                workspaceId: this.workspaceId,
                token: this.address,
                '$transaction.blockNumber$': { [Op.gte]: fromBlock }
            },
            attributes: ['id', 'src', 'dst', 'token', [sequelize.cast(sequelize.col('"TokenTransfer".amount'), 'numeric'), 'amount'], 'tokenId'],
            include: [
                {
                    model: sequelize.models.Transaction,
                    as: 'transaction',
                    attributes: ['hash', 'blockNumber', 'timestamp'],
                },
                {
                    model: sequelize.models.Contract,
                    as: 'contract',
                    attributes: ['id', 'patterns', 'tokenName', 'tokenSymbol', 'tokenDecimals']
                }
            ],
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[...sanitizedOrderBy, order]]
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
                    attributes: ['hash', 'timestamp', 'blockNumber'],
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
        let sanitizedOrderBy;
        switch(orderBy) {
            case 'timestamp':
                sanitizedOrderBy = ['receipt', 'transaction', orderBy];
                break;
            case 'blockNumber':
                sanitizedOrderBy = ['receipt', orderBy];
                break;
            default:
                sanitizedOrderBy = [orderBy];
                break;
        }

        const where = sanitize({
            workspaceId: this.workspaceId,
            address: this.address,
            [Op.and]: signature ? sequelize.where(sequelize.json('topics')[0], Op.eq, signature) : null,
            [Op.and]: sequelize.where(sequelize.col("contract.workspaceId"), Op.eq, sequelize.col("TransactionLog.workspaceId"))
        });
        return sequelize.models.TransactionLog.findAll({
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    as: 'receipt',
                    attributes: ['transactionHash', 'from', 'to', 'blockNumber'],
                    include: {
                        model: sequelize.models.Transaction,
                        as: 'transaction',
                        attributes: ['timestamp']
                    }
                },
                {
                    model: sequelize.models.Contract,
                    as: 'contract',
                    attributes: ['id', 'name', 'abi', 'address', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'patterns']
                },
            ],
            attributes: ['id', 'workspaceId', 'address', 'data', 'topics', 'logIndex'],
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[...sanitizedOrderBy, order]]
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
    isToken: {
        type: DataTypes.VIRTUAL,
        get() {
            const patterns = this.getDataValue('patterns');
            if (!patterns)
                return false;
            return patterns.indexOf('erc20') > -1 || patterns.indexOf('erc721') > -1;
        }
    },
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
        afterDestroy(contract) {
            trigger(`private-contracts;workspace=${contract.workspaceId}`, 'destroyed', null);
        },
        async afterCreate(contract, options) {
            const afterCreateFn = () => {
                return enqueue(`processContract`, `processContract-${contract.id}`, { contractId: contract.id });
            };

            if (options.transaction)
                options.transaction.afterCommit(afterCreateFn);
            else
                afterCreateFn();
        },
        async afterSave(contract) {
            trigger(`private-contracts;workspace=${contract.workspaceId}`, 'new', null);
            trigger(`private-transactions;workspace=${contract.workspaceId};address=${contract.address}`, 'new', null);

            if (contract.patterns.indexOf('erc20') > -1)
                trigger(`private-tokens;workspace=${contract.workspaceId}`, 'new', null);
            else if (contract.patterns.indexOf('erc721') > -1)
                trigger(`private-nft;workspace=${contract.workspaceId}`, 'new', null);
        }
    },
    sequelize,
    modelName: 'Contract',
    tableName: 'contracts'
  });
  return Contract;
};