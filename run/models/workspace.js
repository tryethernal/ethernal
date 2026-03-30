/**
 * @fileoverview Workspace model - represents a blockchain network workspace.
 * A workspace contains blocks, transactions, contracts, and configuration
 * for a specific chain being explored.
 *
 * @module models/Workspace
 *
 * @property {number} id - Primary key
 * @property {number} userId - Foreign key to owner user
 * @property {string} name - Workspace name
 * @property {string} rpcServer - RPC endpoint URL
 * @property {number} networkId - Chain/network ID
 * @property {boolean} public - Whether workspace is publicly accessible
 * @property {string} tracing - Tracing mode (hardhat, other, null)
 */

'use strict';
const {
  Model,
  Sequelize,
  QueryTypes,
} = require('sequelize');
const { defineChain, createPublicClient, http, webSocket } = require('viem');
const moment = require('moment');
const { sanitize, slugify, processRawRpcObject, withTimeout } = require('../lib/utils');
const { getTransactionMethodDetails } = require('../lib/abi');
const { ProviderConnector } = require('../lib/rpc');
const logger = require('../lib/logger');
const { getMaxBlockForSyncReset } = require('../lib/env');
const Analytics = require('../lib/analytics');

const Op = Sequelize.Op;
const INTEGRATION_FIELD_MAPPING = {
    'alchemy': 'alchemyIntegrationEnabled'
};

module.exports = (sequelize, DataTypes) => {
  class Workspace extends Model {
    static associate(models) {
      Workspace.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Workspace.hasOne(models.IntegrityCheck, { foreignKey: 'workspaceId', as: 'integrityCheck' });
      Workspace.hasOne(models.RpcHealthCheck, { foreignKey: 'workspaceId', as: 'rpcHealthCheck' });
      Workspace.hasOne(models.Explorer, { foreignKey: 'workspaceId', as: 'explorer' });
      Workspace.hasMany(models.CustomField, { foreignKey: 'workspaceId', as: 'custom_fields' });
      Workspace.hasMany(models.Block, { foreignKey: 'workspaceId', as: 'blocks' });
      Workspace.hasMany(models.Transaction, { foreignKey: 'workspaceId', as: 'transactions' });
      Workspace.hasMany(models.TransactionReceipt, { foreignKey: 'workspaceId', as: 'receipts' });
      Workspace.hasMany(models.TransactionLog, { foreignKey: 'workspaceId', as: 'logs' });
      Workspace.hasMany(models.Contract, { foreignKey: 'workspaceId', as: 'contracts' });
      Workspace.hasMany(models.Account, { foreignKey: 'workspaceId', as: 'accounts' });
      Workspace.hasMany(models.TokenBalanceChange, { foreignKey: 'workspaceId', as: 'tokenBalanceChanges' });
      Workspace.hasMany(models.TokenTransfer, { foreignKey: 'workspaceId', as: 'tokenTransfers' });
      Workspace.hasMany(models.CustomField, { foreignKey: 'workspaceId', as: 'customFields' });
      Workspace.hasMany(models.CustomField, { foreignKey: 'workspaceId', as: 'packages', scope: { location: 'package' } });
      Workspace.hasMany(models.CustomField, { foreignKey: 'workspaceId', as: 'functions', scope: { location: 'global' } });
      Workspace.hasMany(models.TransactionTraceStep, { foreignKey: 'workspaceId', as: 'transactionTraceSteps' });
      Workspace.hasOne(models.OrbitChainConfig, { foreignKey: 'workspaceId', as: 'orbitConfig' });
      Workspace.hasMany(models.OrbitBatch, { foreignKey: 'workspaceId', as: 'orbitBatches' });
      Workspace.hasMany(models.OrbitChainConfig, { foreignKey: 'parentWorkspaceId', as: 'orbitChildConfigs' });
      Workspace.hasMany(models.OrbitDeposit, { foreignKey: 'workspaceId', as: 'orbitDeposits' });
      // OP Stack associations
      Workspace.hasOne(models.OpChainConfig, { foreignKey: 'workspaceId', as: 'opConfig' });
      Workspace.hasMany(models.OpChainConfig, { foreignKey: 'parentWorkspaceId', as: 'opChildConfigs' });
      Workspace.hasMany(models.OpBatch, { foreignKey: 'workspaceId', as: 'opBatches' });
      Workspace.hasMany(models.OpOutput, { foreignKey: 'workspaceId', as: 'opOutputs' });
      Workspace.hasMany(models.OpDeposit, { foreignKey: 'workspaceId', as: 'opDeposits' });
      Workspace.hasMany(models.OpWithdrawal, { foreignKey: 'workspaceId', as: 'opWithdrawals' });
    }

    /**
     * Finds a public workspace by ID.
     * @param {number} id - The workspace ID
     * @returns {Promise<Workspace|null>} The workspace or null
     */
    static findPublicWorkspaceById(id) {
        return Workspace.findOne({
            where: {
                public: true,
                id: id
            }
        });
    }

    /**
     * Finds a workspace by user ID and name.
     * @param {number} userId - The user ID
     * @param {string} name - The workspace name
     * @returns {Promise<Workspace|null>} The workspace or null
     */
    static findByUserIdAndName(userId, name) {
        return Workspace.findOne({
            where: {
                userId: userId,
                name: name
            }
        });
    }

    /**
     * Gets all top-level Orbit parent workspaces.
     * @returns {Promise<Array<Workspace>>} Array of parent workspaces
     */
    static async getAvailableTopOrbitParent() {
        return Workspace.findAll({ where: { isTopL1Parent: true } });
    }

    static async getAvailableTopOpParent() {
        return Workspace.findAll({ where: { isTopL1Parent: true } });
    }

    /**
     * Alias for getAvailableTopOrbitParent for backwards compatibility.
     * @returns {Promise<Array<Workspace>>} Array of parent workspaces
     */
    static async getAvailableTopOrbitParentIds() {
        return Workspace.getAvailableTopOrbitParent();
    }

    /**
     * Gets all available L1 parent workspaces for a user.
     * Returns public L1s (isTopL1Parent) and user's custom L1s (isCustomL1Parent).
     * @param {number} userId - The user ID
     * @returns {Promise<Object>} Object with publicParents and customParents arrays
     */
    static async getAvailableL1Parents(userId) {
        const publicParents = await Workspace.findAll({
            where: { isTopL1Parent: true },
            attributes: ['id', 'name', 'networkId', 'rpcServer']
        });

        const customParents = userId ? await Workspace.findAll({
            where: {
                isCustomL1Parent: true,
                userId: userId
            },
            attributes: ['id', 'name', 'networkId', 'rpcServer']
        }) : [];

        return { publicParents, customParents };
    }

    /**
     * Creates a custom L1 parent workspace for a user.
     * @param {number} userId - The user ID
     * @param {Object} params - The workspace parameters
     * @param {string} params.name - The name of the L1 parent
     * @param {string} params.rpcServer - The RPC server URL (used for backend sync)
     * @param {string} params.networkId - The network ID (auto-fetched if not provided)
     * @returns {Promise<Workspace>} The created workspace
     */
    static async createCustomL1Parent(userId, { name, rpcServer, networkId }) {
        if (!userId || !name || !rpcServer)
            throw new Error('Missing required parameters');

        return Workspace.create({
            userId,
            name,
            rpcServer,
            networkId,
            chain: 'ethereum',
            public: true,
            isCustomL1Parent: true
        });
    }

    /**
     * Checks if a custom L1 parent can be deleted (no L2 children).
     * @param {number} userId - The user ID
     * @param {number} workspaceId - The workspace ID
     * @returns {Promise<boolean>} True if can be deleted
     */
    async canDeleteCustomL1Parent(userId) {
        if (!this.isCustomL1Parent || this.userId !== userId) {
            return false;
        }

        // Check for Orbit L2 children
        const orbitChildren = await sequelize.models.OrbitChainConfig.count({
            where: { parentWorkspaceId: this.id }
        });

        // Check for OP Stack L2 children
        const opChildren = await sequelize.models.OpChainConfig.count({
            where: { parentWorkspaceId: this.id }
        });

        return orbitChildren === 0 && opChildren === 0;
    }

    /**
     * Creates a Viem public client for RPC interactions.
     * @returns {PublicClient} Viem public client instance
     */
    getViemPublicClient() {
        const fetchOptions = () => {
            const rpcServer = new URL(this.rpcServer);
            if (rpcServer.username.length || rpcServer.password.length) {
                const base64Credentials = btoa(`${rpcServer.username}:${rpcServer.password}`);
                return { headers: { 'Authorization': `Basic ${base64Credentials}` }};
            }
            else
                return {};
        };

        const provider = this.rpcServer.startsWith('http') ?
            { http: [this.rpcServer], webSocket: [this.rpcServer] } :
            { http: [], webSocket: [this.rpcServer] };

        const transport = this.rpcServer.startsWith('http') ?
            http(new URL(this.rpcServer).origin + new URL(this.rpcServer).pathname, {
                fetchOptions: fetchOptions(),
                timeout: 30000 // 30 seconds timeout for slower RPC nodes
            }) :
            webSocket(new URL(this.rpcServer).origin + new URL(this.rpcServer).pathname);

        const chain = defineChain({
            id: this.networkId,
            name: this.name,
            network: this.name,
            rpcUrls: {
                default: provider,
                public: provider
            }
        });

        return createPublicClient({ chain, transport });
    }

    /**
     * Creates a provider connector for RPC interactions.
     * @returns {ProviderConnector} Provider connector instance
     */
    getProvider() {
        return new ProviderConnector(this.rpcServer);
    }

    /**
     * Safely creates an Orbit chain configuration.
     * @param {Object} params - Configuration parameters
     * @param {string} params.parentChainRpcServer - Parent chain RPC URL
     * @param {string} params.rollupContract - Rollup contract address
     * @returns {Promise<OrbitChainConfig>} Created config
     * @throws {Error} If parent chain network not supported
     */
    async safeCreateOrbitConfig(params, userId) {
        const allowedParams = [
            'parentChainRpcServer',
            'parentChainExplorer',
            'rollupContract',
            'bridgeContract',
            'inboxContract',
            'sequencerInboxContract',
            'outboxContract',
            'l1GatewayRouter',
            'l1Erc20Gateway',
            'l1WethGateway',
            'l1CustomGateway',
            'l2GatewayRouter',
            'l2Erc20Gateway',
            'l2WethGateway',
            'l2CustomGateway',
            'challengeManagerContract',
            'validatorWalletCreatorContract',
            'stakeToken',
            'parentMessageCountShift'
        ];

        let parentWorkspace;

        // Support both parentWorkspaceId (new, for custom L1 parents) and parentChainId (legacy, for public L1s)
        if (params.parentWorkspaceId) {
            // Custom L1 parent specified by workspace ID
            parentWorkspace = await sequelize.models.Workspace.findOne({
                where: {
                    id: params.parentWorkspaceId,
                    [Op.or]: [
                        { isTopL1Parent: true },
                        { isCustomL1Parent: true, userId: userId }
                    ]
                }
            });
            if (!parentWorkspace) {
                throw new Error('Selected parent workspace is not a valid L1 parent.');
            }
        } else if (params.parentChainId) {
            // Public L1 parent specified by network ID (legacy behavior)
            const supportedParentChains = await sequelize.models.Workspace.getAvailableTopOrbitParentIds();
            const supportedParentChainIds = supportedParentChains.map(chain => chain.networkId);
            if (!supportedParentChainIds.includes(params.parentChainId)) {
                throw new Error(`Parent chain network is not supported yet. Available networks: ${supportedParentChainIds.join(', ')}`);
            }
            parentWorkspace = supportedParentChains.find(chain => chain.networkId === params.parentChainId);
        } else {
            throw new Error('Parent chain is required.');
        }

        const filteredParams = {};
        for (const [key, value] of Object.entries(params)) {
            if (allowedParams.includes(key)) {
              filteredParams[key] = value;
            }
        }

        return sequelize.models.OrbitChainConfig.create({
            ...filteredParams,
            parentWorkspaceId: parentWorkspace.id,
            workspaceId: this.id
        });
    }

    async safeCreateOpConfig(params, userId) {
        const allowedParams = [
            'batchInboxAddress',
            'optimismPortalAddress',
            'l2OutputOracleAddress',
            'disputeGameFactoryAddress',
            'systemConfigAddress',
            'l2ToL1MessagePasserAddress',
            'outputVersion',
            'submissionInterval',
            'finalizationPeriodSeconds',
            'parentChainExplorer'
        ];

        let parentWorkspace;

        // Support both parentWorkspaceId (new, for custom L1 parents) and parentChainId (legacy, for public L1s)
        if (params.parentWorkspaceId) {
            // Check if it's a valid L1 parent (public or user's custom)
            parentWorkspace = await sequelize.models.Workspace.findOne({
                where: {
                    id: params.parentWorkspaceId,
                    [Op.or]: [
                        { isTopL1Parent: true },
                        { isCustomL1Parent: true, userId: userId }
                    ]
                }
            });
            if (!parentWorkspace) {
                throw new Error('Selected parent workspace is not a valid L1 parent.');
            }
        } else if (params.parentChainId) {
            // Public L1 parent specified by network ID (legacy behavior)
            const supportedParentChains = await sequelize.models.Workspace.getAvailableTopOpParent();
            const parentChainIdStr = String(params.parentChainId);
            const supportedParentChainIds = supportedParentChains.map(chain => String(chain.networkId));
            if (!supportedParentChainIds.includes(parentChainIdStr)) {
                throw new Error(`Parent chain network is not supported yet. Available networks: ${supportedParentChainIds.join(', ')}`);
            }
            parentWorkspace = supportedParentChains.find(chain => String(chain.networkId) === parentChainIdStr);
        } else {
            throw new Error('Parent chain is required.');
        }

        const filteredParams = {};
        for (const [key, value] of Object.entries(params)) {
            if (allowedParams.includes(key)) {
                filteredParams[key] = value;
            }
        }

        return sequelize.models.OpChainConfig.create({
            ...filteredParams,
            parentChainId: parentWorkspace.networkId,
            parentWorkspaceId: parentWorkspace.id,
            workspaceId: this.id
        });
    }

    /**
     * Gets the latest confirmed block for Orbit chain.
     * @returns {Promise<Block|null>} The latest confirmed block
     */
    async getOrbitLatestConfirmedBlock() {
        const orbitNode = await sequelize.models.OrbitNode.findOne({
            where: {
                workspaceId: this.id,
                status: 'confirmed'
            },
            limit: 1,
            order: [['nodeNum', 'DESC']]
        });

        const block = await sequelize.models.Block.findOne({
            where: {
                workspaceId: this.id,
                hash: orbitNode.confirmedBlockHash
            },
        });

        return block;
    }

    /**
     * Checks if this workspace is an Orbit parent chain.
     * @returns {Promise<boolean>} True if parent chain with config
     */
    async isOrbitParent() {
        const childConfigs = await this.getOrbitChildConfigs();
        const parentConfig = await this.getOrbitConfig();

        return childConfigs.length > 0 && parentConfig;
    }

    /**
     * Safely creates an Orbit batch and links blocks to it.
     * @param {Object} batch - Batch data
     * @param {Object} [transaction] - Sequelize transaction
     * @returns {Promise<OrbitBatch>} Created batch
     */
    async safeCreateOrbitBatch(batch, transaction) {
        const [createdBatch] = await sequelize.models.OrbitBatch.bulkCreate([batch], {
            ignoreDuplicates: true,
            returning: true,
            transaction
        });

        const batchBlocks = [];
        const blocks = await sequelize.models.Block.findAll({
            where: {
                workspaceId: this.id,
                number: { [Op.between]: [batch.prevMessageCount, batch.newMessageCount - 1] }
            }
        });
        for (const block of blocks) {
            batchBlocks.push({
                blockId: block.id,
                batchId: createdBatch.id
            });
        }
        await sequelize.models.OrbitBatchBlock.bulkCreate(batchBlocks, { transaction });

        return createdBatch;
    }

    /**
     * Gets paginated Orbit batches with transaction counts.
     * @param {number} [page=1] - Page number
     * @param {number} [itemsPerPage=10] - Items per page
     * @param {string} [order='DESC'] - Sort order
     * @returns {Promise<Object>} Paginated batch results
     */
    async getFilteredOrbitBatches(page = 1, itemsPerPage = 10, order = 'DESC') {
        const sanitizedOrder = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';
        const offset = (page - 1) * itemsPerPage;

        const [rows, countResult] = await Promise.all([
            sequelize.query(`
                SELECT 
                    ob.id,
                    ob."confirmationStatus",
                    ob."batchSequenceNumber",
                    ob."parentChainBlockNumber",
                    ob."parentChainTxHash",
                    ob."postedAt",
                    COALESCE(tc.count, 0)::integer AS "transactionCount"
                FROM orbit_batches ob
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS count
                    FROM blocks b
                    JOIN transactions t ON t."blockId" = b.id
                    WHERE b."orbitBatchId" = ob.id
                ) tc ON true
                WHERE ob."workspaceId" = :workspaceId
                ORDER BY ob."batchSequenceNumber" ${sanitizedOrder}
                LIMIT :limit OFFSET :offset;

            `, {
                replacements: {
                    workspaceId: this.id,
                    limit: itemsPerPage,
                    offset: offset
                },
                type: sequelize.QueryTypes.SELECT,
                logging: console.log
            }),
            sequelize.query(`
                SELECT COUNT(*)::integer as count
                FROM orbit_batches ob
                WHERE ob."workspaceId" = :workspaceId
            `, {
                replacements: {
                    workspaceId: this.id
                },
                type: sequelize.QueryTypes.SELECT
            })
        ]);

        return {
            rows: rows,
            count: countResult[0].count
        };
    }

    /**
     * Returns the native token balance for each active address in the workspace.
     * It returns the balance, the share of the total balance, and the transaction count for each address.
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @returns {Promise<Array>} - A list of native token balances.
     */
    async getFilteredNativeAccounts(page = 1, itemsPerPage = 10) {
        return sequelize.query(`
            WITH latest_balances AS (
                SELECT
                    tbc.address,
                    tbc."currentBalance"::numeric AS balance
                FROM (
                    SELECT
                        tbc.*,
                        t."blockNumber",
                        ROW_NUMBER() OVER (
                            PARTITION BY tbc.address
                            ORDER BY t."blockNumber" DESC, tbc."transactionId" DESC
                        ) AS rn
                    FROM token_balance_changes tbc
                    JOIN transactions t ON tbc."transactionId" = t.id
                    WHERE tbc."workspaceId" = :workspaceId
                      AND tbc."token" = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                ) tbc
                WHERE tbc.rn = 1
            ),
            transaction_counts AS (
                SELECT
                    address,
                    COUNT(*) AS transaction_count
                FROM (
                    SELECT te."from" AS address
                    FROM transaction_events te
                    WHERE te."workspaceId" = :workspaceId
                    UNION ALL
                    SELECT te."to" AS address
                    FROM transaction_events te
                    WHERE te."workspaceId" = :workspaceId
                ) all_addresses
                GROUP BY address
            ),
            grand_total AS (
                SELECT SUM(balance) as total_balance
                FROM latest_balances
            )
            SELECT
                lb.address,
                lb.balance::numeric balance,
                ROUND(
                    lb.balance / gt.total_balance,
                    4
                ) AS share,
                COALESCE(tc.transaction_count, 0) AS transaction_count,
                c.name AS "contract.name",
                cv."createdAt" AS "contract.verification.createdAt"
            FROM latest_balances lb
            LEFT JOIN transaction_counts tc ON LOWER(lb.address) = LOWER(tc.address)
            LEFT JOIN contracts c ON LOWER(lb.address) = LOWER(c.address) AND c."workspaceId" = :workspaceId
            LEFT JOIN contract_verifications cv ON c.id = cv."contractId"
            CROSS JOIN grand_total gt
            ORDER BY lb.balance DESC
            LIMIT :itemsPerPage
            OFFSET :offset;
            `, {
                replacements: {
                    workspaceId: this.id,
                    itemsPerPage: itemsPerPage,
                    offset: (page - 1) * itemsPerPage
                },
                type: QueryTypes.SELECT,
                nest: true
            }
        );
    }

    /**
     * Returns the top ERC20 tokens by holders for a workspace.
     * 
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @returns {Promise<Array>} - A list of top ERC20 tokens by holders.
     */
    async getTopNftsByHolders(page = 1, itemsPerPage = 10) {
        return sequelize.query(`
            SELECT
                token,
                COUNT(DISTINCT token_balance_change_events."address") AS holders,
                c.name AS "contract.name",
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName"
            FROM
                token_balance_change_events
            LEFT JOIN contracts c ON
                c.address = token_balance_change_events."address"
                AND c."workspaceId" = :workspaceId
            WHERE
                token_balance_change_events."workspaceId" = :workspaceId
            GROUP BY token, c.name, c."tokenSymbol", c."tokenName"
            ORDER BY holders DESC
            LIMIT :itemsPerPage OFFSET :offset;
        `, {
            replacements: { workspaceId: this.id, itemsPerPage: itemsPerPage, offset: (page - 1) * itemsPerPage },
            type: QueryTypes.SELECT,
            nest: true
        });
    }

    /**
     * Returns a list of token transfers for a workspace.
     * 
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @param {string} orderBy - The field to order by.
     * @param {string} order - The order to sort by.
     * @param {Array} tokenTypes - The types of tokens to return.
     * @returns {Promise<Array>} - A list of token transfers.
     */
    async getFilteredTokenTransfers(page = 1, itemsPerPage = 10, orderBy = 'timestamp', order = 'DESC', tokenTypes = []) {
        const filteredTokenTypes = tokenTypes
            .map(t => t.toLowerCase())
            .filter(t => ['erc20', 'erc721', 'erc1155'].includes(t))
            .map(t => `'${t}'`)
            .join(',');

        let sanitizedOrderBy = orderBy;
        if (!['timestamp', 'amount', 'blockNumber'].includes(orderBy))
            sanitizedOrderBy = ['timestamp'];

        let sanitizedOrder = order;
        if (sanitizedOrder.toLowerCase() !== 'asc' && sanitizedOrder.toLowerCase() !== 'desc')
            sanitizedOrder = 'DESC';

        switch(sanitizedOrderBy) {
            case 'timestamp':
                sanitizedOrderBy = `"t"."timestamp" ${sanitizedOrder}, "t"."transactionIndex" ${sanitizedOrder}`;
                break;
            case 'blockNumber':
                sanitizedOrderBy = `"t"."blockNumber" ${sanitizedOrder}, "t"."transactionIndex" ${sanitizedOrder}`;
                break;
            case 'amount':
                sanitizedOrderBy = '"tte"."amount"::numeric';
                break;
            default:
                sanitizedOrderBy = `"t"."timestamp" ${sanitizedOrder}, "t"."transactionIndex" ${sanitizedOrder}`;
                break;
        }

        let query = `
            SELECT
                tte.*,
                tt."tokenId" AS "tokenId",
                c.name AS "contract.name",
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenDecimals" AS "contract.tokenDecimals",
                c.abi AS "contract.abi",
                c.patterns AS "contract.patterns",
                t.hash AS "transaction.hash",
                t."blockNumber" AS "transaction.blockNumber",
                t.timestamp AS "transaction.timestamp",
                t."data" AS "transaction.data",
                t."transactionIndex" AS "transaction.transactionIndex",
                e.token AS "explorer.token"
            FROM token_transfer_events tte
            LEFT JOIN contracts c ON c."address" = tte.token AND c."workspaceId" = :workspaceId
            LEFT JOIN token_transfers tt ON tte."tokenTransferId" = tt.id 
            LEFT JOIN transactions t ON tt."transactionId" = t.id
            LEFT JOIN explorers e ON e."workspaceId" = :workspaceId
            WHERE tte."workspaceId" = :workspaceId
            AND tte.token != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        `;

        if (tokenTypes.length)
            query += ` AND "tokenType" IN (${filteredTokenTypes})`;

        query += ` ORDER BY ${sanitizedOrderBy} LIMIT :itemsPerPage OFFSET :offset;`;
        const result = await sequelize.query(query, {
            replacements: {
                workspaceId: this.id,
                itemsPerPage: itemsPerPage,
                offset: (page - 1) * itemsPerPage
            },
            type: QueryTypes.SELECT,
            nest: true
        });

        const processedResult = result.map(item => {
            let itemCopy = { ...item };
            if (itemCopy.contract && itemCopy.transaction && itemCopy.transaction.data && itemCopy.contract.abi)
                itemCopy.transaction.methodDetails = getTransactionMethodDetails({ data: itemCopy.transaction.data }, itemCopy.contract.abi);
            if (itemCopy.token == '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
                itemCopy.contract = {
                    tokenSymbol: itemCopy.explorer && itemCopy.explorer.token || 'ETH',
                    tokenName: itemCopy.explorer && itemCopy.explorer.token || 'Ether',
                    tokenDecimals: 18,
                };
            return itemCopy;
        });

        return processedResult;
    }

    /**
     * Returns contract stats for a workspace (displayed on the /contractsVerified page).
     * - Total contracts
     * - Contracts created in the last 24 hours
     * - Verified contracts
     * - Verified contracts created in the last 24 hours
     * 
     * @returns {Promise<Object>} - An object containing the contract stats.
     */
    async getContractStats() {
        const [result] = await sequelize.query(`
            SELECT
                COUNT(*)::integer AS total_contracts,
                COUNT(*) FILTER (WHERE "timestamp" > NOW() - INTERVAL '24 hours')::integer AS contracts_last_24_hours,
                (SELECT COUNT(*) FROM contract_verifications WHERE "workspaceId" = :workspaceId)::integer AS verified_contracts,
                (SELECT COUNT(*) FROM contract_verifications WHERE "workspaceId" = :workspaceId AND "createdAt" > NOW() - INTERVAL '24 hours')::integer AS verified_contracts_last_24_hours
            FROM transaction_events
            WHERE "to" IS NULL AND "workspaceId" = :workspaceId;
        `, {
            replacements: { workspaceId: this.id },
            type: QueryTypes.SELECT
        });

        return result;
    }

    /**
     * Returns a list of verified contracts for a workspace.
     * 
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @returns {Promise<Array>} - A list of verified contracts.
     */
    async getVerifiedContracts(page = 1, itemsPerPage = 10) {
        return sequelize.query(`
            WITH transaction_counts AS (
                SELECT 
                    "to" AS contract_address, 
                    COUNT(*) AS transaction_count
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
                GROUP BY "to"
            )
            SELECT
                c.address,
                c.name,
                c.patterns,
                c.abi,
                cv."id" AS "verification.id",
                cv."createdAt" AS "verification.createdAt",
                cv."evmVersion" AS "verification.evmVersion",
                cv."compilerVersion" AS "verification.compilerVersion",
                cv."constructorArguments" AS "verification.constructorArguments",
                cv."runs" AS "verification.runs",
                COALESCE(tc.transaction_count, 0) AS "transactionCount"
            FROM contracts c
            LEFT JOIN contract_verifications cv ON c.id = cv."contractId"
            LEFT JOIN transaction_counts tc ON c.address = tc.contract_address
            WHERE c."workspaceId" = :workspaceId
                AND cv."createdAt" IS NOT NULL
            ORDER BY cv."createdAt" DESC
            LIMIT :limit OFFSET :offset;

        `, {
            replacements: {
                workspaceId: this.id,
                limit: itemsPerPage,
                offset: (Math.max(page, 1) - 1) * itemsPerPage
            },
            type: QueryTypes.SELECT,
            nest: true
        });
    }

    /**
     * Returns a list of transaction trace steps (internal transactions) for a workspace.
     * 
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @returns {Promise<Array>} - A list of transaction trace steps.
     */
    async getTransactionTraceSteps(page = 1, itemsPerPage = 10) {
        const result = await sequelize.query(`
            WITH step_links AS (
                SELECT 
                    tts.id,
                    tts."transactionId",
                    tts.depth,
                    tts.address,
                    tts."workspaceId",
                    tts.op,
                    tts.input,
                    tts."returnData",
                    tts.value,
                    MAX(tts_prev.id) AS parent_step_id,
                    ARRAY_AGG(tts_next.id ORDER BY tts_next.id) FILTER (WHERE tts_next.id IS NOT NULL) AS children_step_ids
                FROM transaction_trace_steps tts
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps 
                    WHERE "transactionId" = tts."transactionId" 
                    AND depth = tts.depth - 1 
                    AND id < tts.id
                    ORDER BY id DESC
                    LIMIT 1
                ) tts_prev ON true
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps
                    WHERE "transactionId" = tts."transactionId"
                    AND depth = tts.depth + 1
                    AND id > tts.id
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM transaction_trace_steps
                        WHERE "transactionId" = tts."transactionId"
                        AND depth = tts.depth
                        AND id > tts.id
                        AND id < transaction_trace_steps.id
                    )
                    ORDER BY id
                ) tts_next ON true
                WHERE tts."workspaceId" = :workspaceId
                GROUP BY tts.id, tts."transactionId", tts.depth, tts.address, tts."workspaceId", tts.op, tts.input, tts."returnData", tts.value
            ),
            relevant_steps AS (
                -- Self (Main Steps)
                SELECT 
                    sl.*, 
                    'self' AS relation_type
                FROM step_links sl
                
                UNION ALL
                
                -- Parents
                SELECT 
                    ps.id,
                    ps."transactionId",
                    ps.depth,
                    ps.address,
                    ps."workspaceId",
                    ps.op,
                    ps.input,
                    ps."returnData",
                    ps.value,
                    NULL AS parent_step_id,
                    NULL AS children_step_ids,
                    'parent' AS relation_type
                FROM step_links sl 
                JOIN transaction_trace_steps ps
                    ON sl.parent_step_id = ps.id 
                
                UNION ALL
                
                -- Children
                SELECT 
                    cs.id,
                    cs."transactionId",
                    cs.depth,
                    cs.address,
                    cs."workspaceId",
                    cs.op,
                    cs.input,
                    cs."returnData",
                    cs.value,
                    sl.id,
                    NULL AS children_step_ids,
                    'child' AS relation_type
                FROM step_links sl
                CROSS JOIN UNNEST(sl.children_step_ids) AS child_id
                JOIN transaction_trace_steps cs ON cs.id = child_id
            ),
            from_addresses AS (
                SELECT
                    rs.id,
                    rs."transactionId",
                    COALESCE(parent_step.address, t.to) AS from_address
                FROM relevant_steps rs
                JOIN transactions t ON rs."transactionId" = t.id
                LEFT JOIN transaction_trace_steps parent_step ON rs.parent_step_id = parent_step.id
            )
            SELECT DISTINCT ON (t.timestamp, t."transactionIndex", rs.id)
                rs.op,
                rs.input,
                rs."returnData",
                COALESCE(rs.value::numeric, 0) AS value,
                rs.address AS "to.address",
                rs.id AS "stepId",
                t.hash AS "transaction.hash",
                t.timestamp AS "transaction.timestamp",
                rs."workspaceId" AS "workspaceId",
                fa.from_address AS "from.address",
                tc.name AS "to.contract.name",
                tc."tokenSymbol" AS "to.contract.tokenSymbol",
                tc."tokenName" AS "to.contract.tokenName",
                tc.abi AS "to.contract.abi",
                tcv."id" as "to.contract.verification.id",
                fc.name AS "from.contract.name",
                fc."tokenSymbol" AS "from.contract.tokenSymbol",
                fc."tokenName" AS "from.contract.tokenName",
                fc.abi AS "from.contract.abi",
                fcv."id" as "from.contract.verification.id"
            FROM relevant_steps rs
            JOIN transactions t ON rs."transactionId" = t.id
            JOIN from_addresses fa ON rs.id = fa.id AND rs."transactionId" = fa."transactionId"
            LEFT JOIN contracts tc ON rs.address = tc.address AND tc."workspaceId" = :workspaceId
            LEFT JOIN contract_verifications tcv ON tc.id = tcv."contractId"
            LEFT JOIN contracts fc ON fa.from_address = fc.address AND fc."workspaceId" = :workspaceId
            LEFT JOIN contract_verifications fcv ON fc.id = fcv."contractId"
            ORDER BY t.timestamp, t."transactionIndex", rs.id ASC
            LIMIT :itemsPerPage OFFSET :offset;
        `, {
            replacements: { workspaceId: this.id, itemsPerPage: itemsPerPage, offset: (page - 1) * itemsPerPage },
            type: QueryTypes.SELECT,
            nest: true
        });

        const processedResult = result.map(item => {
            let itemCopy = { ...item };
            itemCopy.method = getTransactionMethodDetails({ data: itemCopy.input }, itemCopy.to.contract.abi);
            itemCopy.from.contract.verification = itemCopy.from.contract.verification.id ? itemCopy.from.contract.verification : null;
            itemCopy.to.contract.verification = itemCopy.to.contract.verification.id ? itemCopy.to.contract.verification : null;
            return itemCopy;
        });

        return processedResult;
    }

    /**
     * Returns the number of token transfers for an address in a given time range.
     * @param {string} address - The address to get the token transfer history for
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The number of token transfers for the address in the given time range
     */
    async getAddressTokenTransferHistory(address, from, to) {
        if (!address || !from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        return sequelize.query(`
            WITH date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', TIMESTAMP :from),
                    DATE_TRUNC('day', TIMESTAMP :to),
                    INTERVAL '1 day'
                ) AS day
            )
            SELECT 
                ds.day,
                COALESCE(SUM(CASE WHEN tte.src = :address THEN 1 ELSE 0 END), 0)::integer AS from_count,
                COALESCE(SUM(CASE WHEN tte.dst = :address THEN 1 ELSE 0 END), 0)::integer AS to_count
            FROM date_series ds
            LEFT JOIN token_transfer_events tte
                ON DATE_TRUNC('day', tte.timestamp) = ds.day
                AND (tte.src = :address OR tte.dst = :address)
            WHERE tte."workspaceId" = :workspaceId
            GROUP BY ds.day
            ORDER BY ds.day;

        `, {
            replacements: {
                address: address.toLowerCase(),
                workspaceId: this.id,
                from: earliestTimestamp,
                to: new Date(to)
            },
            type: QueryTypes.SELECT,
            logging: console.log
        });
    }

    /**
     * Returns the amount of transaction fees spent by an address in a given time range.
     * @param {string} address - The address to get the transaction fees for
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The amount of transaction fees spent by the address in the given time range
     */
    async getAddressSpentTransactionFeeHistory(address, from, to) {
        if (!address || !from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);
        
        return sequelize.query(`
            SELECT
                time_bucket('1 day', timestamp) as day,
                sum("transactionFee") as transaction_fees
            FROM
                transaction_events
            WHERE
                "from" = :address
                AND "workspaceId" = :workspaceId
                AND DATE_TRUNC('day', timestamp) >= :from
                AND DATE_TRUNC('day', timestamp) <= :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: {
                address: address.toLowerCase(),
                workspaceId: this.id,
                from: earliestTimestamp,
                to: new Date(to)
            },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Returns the number of transactions for an address in a given time range.
     * @param {string} address - The address to get the number of transactions for
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The number of transactions for the address in the given time range
     */
    async getAddressTransactionHistory(address, from, to) {
        if (!address || !from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        return sequelize.query(`
            SELECT
                time_bucket('1 day', timestamp) as day,
                count(*) as count
            FROM
                transaction_events
            WHERE
                ("to" = :address OR "from" = :address)
                AND "workspaceId" = :workspaceId
                AND DATE_TRUNC('day', timestamp) >= :from
                AND DATE_TRUNC('day', timestamp) <= :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: {
                address: address.toLowerCase(),
                workspaceId: this.id,
                from: earliestTimestamp,
                to: new Date(to)
            },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Returns the number of transaction steps for an address.
     * Based off of getAddressTransactionTraceSteps.
     * @param {string} address - The address to get the number of transaction steps for
     * @returns {Promise<number>} The number of transaction steps for the address
     */
    async countAddressTransactionTraceSteps(address) {
        if (!address)
            throw new Error('Missing parameter');

        const [result] = await sequelize.query(`
            WITH step_links AS (
                SELECT 
                    tts.id,
                    tts."transactionId",
                    tts.depth,
                    tts.address,
                    tts."workspaceId",
                    tts.op,
                    tts.input,
                    tts."returnData",
                    tts.value,
                    MAX(tts_prev.id) AS parent_step_id,
                    ARRAY_AGG(tts_next.id ORDER BY tts_next.id) FILTER (WHERE tts_next.id IS NOT NULL) AS children_step_ids
                FROM transaction_trace_steps tts
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps 
                    WHERE "transactionId" = tts."transactionId" 
                    AND depth = tts.depth - 1 
                    AND id < tts.id
                    ORDER BY id DESC
                    LIMIT 1
                ) tts_prev ON true
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps
                    WHERE "transactionId" = tts."transactionId"
                    AND depth = tts.depth + 1
                    AND id > tts.id
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM transaction_trace_steps
                        WHERE "transactionId" = tts."transactionId"
                        AND depth = tts.depth
                        AND id > tts.id
                        AND id < transaction_trace_steps.id
                    )
                    ORDER BY id
                ) tts_next ON true
                WHERE tts.address = :address
                AND tts."workspaceId" = :workspaceId
                GROUP BY tts.id, tts."transactionId", tts.depth, tts.address, tts."workspaceId", tts.op, tts.input, tts."returnData", tts.value
            ),
            relevant_steps AS (
                -- Self (Main Steps)
                SELECT 
                    sl.*, 
                    'self' AS relation_type
                FROM step_links sl
                
                UNION ALL
                
                -- Parents
                SELECT 
                    ps.id,
                    ps."transactionId",
                    ps.depth,
                    ps.address,
                    ps."workspaceId",
                    ps.op,
                    ps.input,
                    ps."returnData",
                    ps.value,
                    NULL AS parent_step_id,
                    NULL AS children_step_ids,
                    'parent' AS relation_type
                FROM step_links sl 
                JOIN transaction_trace_steps ps
                    ON sl.parent_step_id = ps.id 
                
                UNION ALL
                
                -- Children
                SELECT 
                    cs.id,
                    cs."transactionId",
                    cs.depth,
                    cs.address,
                    cs."workspaceId",
                    cs.op,
                    cs.input,
                    cs."returnData",
                    cs.value,
                    sl.id,
                    NULL AS children_step_ids,
                    'child' AS relation_type
                FROM step_links sl
                CROSS JOIN UNNEST(sl.children_step_ids) AS child_id
                JOIN transaction_trace_steps cs ON cs.id = child_id
            ),
            from_addresses AS (
                SELECT
                    rs.id,
                    rs."transactionId",
                    COALESCE(parent_step.address, t.to) AS from_address
                FROM relevant_steps rs
                JOIN transactions t ON rs."transactionId" = t.id
                LEFT JOIN transaction_trace_steps parent_step ON rs.parent_step_id = parent_step.id
            )
            SELECT COALESCE(COUNT(DISTINCT(rs."transactionId", rs.id))::integer, 0) AS count
            FROM relevant_steps rs
            JOIN transactions t ON rs."transactionId" = t.id
            JOIN from_addresses fa ON rs.id = fa.id AND rs."transactionId" = fa."transactionId"
            WHERE (rs.address = :address OR fa.from_address = :address)
        `, {
            replacements: {
                workspaceId: this.id,
                address: address.toLowerCase()
            },
            type: QueryTypes.SELECT
        });
        
        return result.count
    }

    /**
     * Returns internal transactions involving an address.
     * On top of the transaction_trace_steps rows, it also returns a relation_type column.
     * @param {string} address - The address to get the internal transactions for
     * @param {number} [page=1] - The page number
     * @param {number} [itemsPerPage=50] - The number of items per page
     * @returns {Promise<Array>} Internal transaction results
     */
    async getAddressTransactionTraceSteps(address, page = 1, itemsPerPage = 50) {
        if (!address)
            throw new Error('Missing parameter');

        /*
            This query is a mix of IA generated stuff and my own.
            I'm not proud of it, but it works.
            ^ The sentence above is IA generated (kind of true though).
        */
        const result = await sequelize.query(`
            WITH step_links AS (
                SELECT 
                    tts.id,
                    tts."transactionId",
                    tts.depth,
                    tts.address,
                    tts."workspaceId",
                    tts.op,
                    tts.input,
                    tts."returnData",
                    tts.value,
                    MAX(tts_prev.id) AS parent_step_id,
                    ARRAY_AGG(tts_next.id ORDER BY tts_next.id) FILTER (WHERE tts_next.id IS NOT NULL) AS children_step_ids
                FROM transaction_trace_steps tts
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps 
                    WHERE "transactionId" = tts."transactionId" 
                    AND depth = tts.depth - 1 
                    AND id < tts.id
                    ORDER BY id DESC
                    LIMIT 1
                ) tts_prev ON true
                LEFT JOIN LATERAL (
                    SELECT id FROM transaction_trace_steps
                    WHERE "transactionId" = tts."transactionId"
                    AND depth = tts.depth + 1
                    AND id > tts.id
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM transaction_trace_steps
                        WHERE "transactionId" = tts."transactionId"
                        AND depth = tts.depth
                        AND id > tts.id
                        AND id < transaction_trace_steps.id
                    )
                    ORDER BY id
                ) tts_next ON true
                WHERE tts.address = :address
                AND tts."workspaceId" = :workspaceId
                GROUP BY tts.id, tts."transactionId", tts.depth, tts.address, tts."workspaceId", tts.op, tts.input, tts."returnData", tts.value
            ),
            relevant_steps AS (
                -- Self (Main Steps)
                SELECT 
                    sl.*, 
                    'self' AS relation_type
                FROM step_links sl
                
                UNION ALL
                
                -- Parents
                SELECT 
                    ps.id,
                    ps."transactionId",
                    ps.depth,
                    ps.address,
                    ps."workspaceId",
                    ps.op,
                    ps.input,
                    ps."returnData",
                    ps.value,
                    NULL AS parent_step_id,
                    NULL AS children_step_ids,
                    'parent' AS relation_type
                FROM step_links sl 
                JOIN transaction_trace_steps ps
                    ON sl.parent_step_id = ps.id 
                
                UNION ALL
                
                -- Children
                SELECT 
                    cs.id,
                    cs."transactionId",
                    cs.depth,
                    cs.address,
                    cs."workspaceId",
                    cs.op,
                    cs.input,
                    cs."returnData",
                    cs.value,
                    sl.id,
                    NULL AS children_step_ids,
                    'child' AS relation_type
                FROM step_links sl
                CROSS JOIN UNNEST(sl.children_step_ids) AS child_id
                JOIN transaction_trace_steps cs ON cs.id = child_id
            ),
            from_addresses AS (
                SELECT
                    rs.id,
                    rs."transactionId",
                    COALESCE(parent_step.address, t.to) AS from_address
                FROM relevant_steps rs
                JOIN transactions t ON rs."transactionId" = t.id
                LEFT JOIN transaction_trace_steps parent_step ON rs.parent_step_id = parent_step.id
            )
            SELECT DISTINCT ON (rs."transactionId", rs.id)
                rs.op,
                rs.input,
                rs."returnData",
                COALESCE(rs.value::numeric, 0) AS value,
                rs.address AS "to.address",
                rs.id AS "stepId",
                t.hash AS "transaction.hash",
                t.timestamp AS "transaction.timestamp",
                rs."workspaceId" AS "workspaceId",
                fa.from_address AS "from.address",
                tc.name AS "to.contract.name",
                tc."tokenSymbol" AS "to.contract.tokenSymbol",
                tc."tokenName" AS "to.contract.tokenName",
                tc.abi AS "to.contract.abi",
                tcv."id" as "to.contract.verification.id",
                fc.name AS "from.contract.name",
                fc."tokenSymbol" AS "from.contract.tokenSymbol",
                fc."tokenName" AS "from.contract.tokenName",
                fc.abi AS "from.contract.abi",
                fcv."id" as "from.contract.verification.id"
            FROM relevant_steps rs
            JOIN transactions t ON rs."transactionId" = t.id
            JOIN from_addresses fa ON rs.id = fa.id AND rs."transactionId" = fa."transactionId"
            LEFT JOIN contracts tc ON rs.address = tc.address AND tc."workspaceId" = :workspaceId
            LEFT JOIN contract_verifications tcv ON tc.id = tcv."contractId"
            LEFT JOIN contracts fc ON fa.from_address = fc.address AND fc."workspaceId" = :workspaceId
            LEFT JOIN contract_verifications fcv ON fc.id = fcv."contractId"
            WHERE (rs.address = :address OR fa.from_address = :address)
            ORDER BY rs."transactionId", rs.id ASC
            LIMIT :itemsPerPage OFFSET :offset;
        `, {
            replacements: {
                workspaceId: this.id,
                address: address.toLowerCase(),
                itemsPerPage: itemsPerPage,
                offset: (page - 1) * itemsPerPage
            },
            nest: true,
            type: QueryTypes.SELECT
        });

        const processedResult = result.map(item => {
            let itemCopy = { ...item };
            itemCopy.method = getTransactionMethodDetails({ data: itemCopy.input }, itemCopy.to.contract.abi);
            itemCopy.from.contract.verification = itemCopy.from.contract.verification.id ? itemCopy.from.contract.verification : null;
            itemCopy.to.contract.verification = itemCopy.to.contract.verification.id ? itemCopy.to.contract.verification : null;
            return itemCopy;
        });

        return processedResult;
    }

    /*
        This method is used to get the burnt fees for the last 24 hours for a workspace.

        @returns {number} - The burnt fees for the last 24 hours
    */
    async getLast24hBurntFees() {
        const [queryResult] = await sequelize.query(`
            SELECT
                sum("baseFeePerGas"::numeric * "gasUsed"::numeric) as "burntFees"
            FROM block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
        `, {
            replacements: {
                workspaceId: this.id,
                from: new Date(moment().subtract(1, 'day').toISOString()),
                to: new Date(moment().toISOString())
            },
            type: QueryTypes.SELECT
        });

        return queryResult.burntFees;
    }

    /**
     * Gets the total gas used for the last 24 hours for a workspace.
     * @returns {Promise<number>} The total gas used for the last 24 hours
     */
    async getLast24hTotalGasUsed() {
        const [queryResult] = await sequelize.query(`
            SELECT
                sum("gasUsed"::numeric) as "totalGasUsed"
            FROM transaction_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
        `, {
            replacements: {
                workspaceId: this.id,
                from: new Date(moment().subtract(1, 'day').toISOString()),
                to: new Date(moment().toISOString())
            },
            type: QueryTypes.SELECT
        });

        return queryResult.totalGasUsed;
    }

    /**
     * Gets the gas utilization ratio for the last 24 hours for a workspace.
     * @returns {Promise<number>} The gas utilization ratio for the last 24 hours
     */
    async getLast24hGasUtilisationRatio() {
        const [queryResult] = await sequelize.query(`
            SELECT
                round(avg("gasUsedRatio"::numeric), 2) as "gasUtilizationRatio"
            FROM block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
        `, {
            replacements: {
                workspaceId: this.id,
                from: new Date(moment().subtract(1, 'day').toISOString()),
                to: new Date(moment().toISOString())
            },
            type: QueryTypes.SELECT
        });
        return queryResult.gasUtilizationRatio;

    }

    /**
     * Gets the average transaction fee for the last 24 hours for a workspace.
     * @returns {Promise<number>} The average transaction fee for the last 24 hours
     */
    async getLast24hAverageTransactionFee() {
        const [avgTransactionFee] = await sequelize.query(`
            SELECT
                coalesce(round(avg("transactionFee")), 0) AS avg
            FROM transaction_events
            WHERE timestamp >= timestamp :from
            AND timestamp < timestamp :to
            AND "workspaceId" = :workspaceId
        `, {
            replacements: {
                from: new Date(moment().subtract(1, 'day').toISOString()),
                to: new Date(moment().toISOString()),
                workspaceId: this.id
            },
            type: QueryTypes.SELECT
        });

        return avgTransactionFee.avg;
    }

    /**
     * Gets the total transaction fees for the last 24 hours for a workspace.
     * @returns {Promise<number>} The total transaction fees for the last 24 hours
     */
    async getLast24hTransactionFees() {
        const [transactionFees] = await sequelize.query(`
            SELECT
                coalesce(sum("transactionFee"::numeric), 0) as "transactionFees"
            FROM transaction_events
            WHERE "workspaceId" = :workspaceId
            AND timestamp >= timestamp :from
            AND timestamp <= timestamp :to
        `, {
            replacements: {
                workspaceId: this.id,
                from: new Date(moment().subtract(1, 'day').toISOString()),
                to: new Date(moment().toISOString())
            },
            type: QueryTypes.SELECT
        });

        return transactionFees.transactionFees;
    }

    /**
     * Gets the total transaction fees daily for a workspace.
     * @param {string} from - Start day
     * @param {string} to - End day
     * @returns {Promise<Array>} The transaction fees per day
     */
    async getTransactionFeeHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        return sequelize.query(`
            SELECT
                time_bucket('1 day', timestamp) as day,
                sum("transactionFee"::numeric) as "transactionFees"
            FROM transaction_events
            WHERE "workspaceId" = :workspaceId
            AND timestamp >= timestamp :from
            AND timestamp <= timestamp :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: { workspaceId: this.id, from: new Date(earliestTimestamp), to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Replaces a workspace with a new empty one.
     * Used when resetting an explorer - the old workspace is deleted in background.
     * @returns {Promise<Workspace>} The duplicated (new) workspace
     * @throws {Error} If workspace not marked for pending deletion
     */
    async replace() {
        if (!this.pendingDeletion)
            throw new Error('You can only replace a workspace that needs to be deleted');

        const explorer = await this.getExplorer();
        const user = await this.getUser();

        return sequelize.transaction(async (transaction) => {
            const duplicatedWorkspace = await user.safeCreateWorkspace({ ...this.get() }, transaction);

            await duplicatedWorkspace.update({
                storageEnabled: this.storageEnabled,
                erc721LoadingEnabled: this.erc721LoadingEnabled,
                browserSyncEnabled: this.browserSyncEnabled,
                rpcHealthCheckEnabled: this.rpcHealthCheckEnabled,
                statusPageEnabled: this.statusPageEnabled,
                pollingInterval: this.pollingInterval,
                emitMissedBlocks: this.emitMissedBlocks,
                skipFirstBlock: this.skipFirstBlock,
                rateLimitInterval: this.rateLimitInterval,
                rateLimitMaxInInterval: this.rateLimitMaxInInterval,
                public: this.public
            }, { transaction });
 
            if (explorer)
                await explorer.update({ workspaceId: duplicatedWorkspace.id }, { transaction });

            if (user.currentWorkspaceId == this.id)
                await user.update({ currentWorkspaceId: duplicatedWorkspace.id }, { transaction });

            const orbitConfig = await this.getOrbitConfig({ transaction });
            if (orbitConfig)
                await orbitConfig.update({ workspaceId: duplicatedWorkspace.id }, { transaction });

            const newName = `Pending deletion - (Previously ${this.name} - #${this.id})`;
            await this.update({ name: newName }, { transaction });

            return duplicatedWorkspace;
        });
    }

    /**
     * Gets the block size history for a workspace.
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The block size history per day
     */
    async getBlockSizeHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        return sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) as day,
                round(avg("transactionCount"), 0) as "size"
            FROM block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: { workspaceId: this.id, from: new Date(earliestTimestamp), to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the block time history for a workspace.
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The block time history per day
     */
    async getBlockTimeHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        return sequelize.query(`
            WITH time_difference AS (
                SELECT
                    time_bucket('1 day', timestamp) as bucket,
                    EXTRACT(EPOCH FROM timestamp - LAG(timestamp) OVER (PARTITION BY time_bucket('1 day', timestamp) ORDER BY timestamp)) AS "blockTime"
                FROM block_events
                WHERE "workspaceId" = :workspaceId
                AND "timestamp" >= timestamp :from
                AND "timestamp" < timestamp :to
            ),
            aggregated AS (
                SELECT
                    bucket,
                    ROUND(AVG("blockTime"), 2) AS "blockTime"
                FROM time_difference
                GROUP BY bucket
            ),
            date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', :from::timestamp),
                    DATE_TRUNC('day', :to::timestamp),
                    INTERVAL '1 day'
                ) AS day
            )
            SELECT
                ds.day,
                a."blockTime"
            FROM date_series ds
            LEFT JOIN aggregated a ON ds.day = a.bucket
            ORDER BY ds.day ASC
        `, {
            replacements: { workspaceId: this.id, from: new Date(earliestTimestamp), to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the latest biggest gas spenders for a given interval.
     * @param {number} [intervalInHours=24] - The interval in hours
     * @param {number} [limit=50] - The limit of gas spenders to return
     * @returns {Promise<Array>} The gas spenders with gasUsed, gasCost, percentUsed
     */
    getLatestGasSpenders(intervalInHours = 24, limit = 50) {
        return sequelize.query(`
            WITH total_gas AS (
                SELECT SUM("gasUsed"::numeric) AS totalGasUsed
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
                AND timestamp >= now() - interval '1 hour' * :intervalInHours
            )
            SELECT
                "from",
                SUM("gasUsed"::numeric) AS "gasUsed",
                SUM("gasPrice"::numeric * "gasUsed"::numeric) AS "gasCost",
                SUM("gasUsed"::numeric) / totalGasUsed AS "percentUsed"
            FROM transaction_events, total_gas
            WHERE 
                "workspaceId" = :workspaceId 
                AND timestamp >= now() - interval '1 hour' * :intervalInHours
            GROUP BY "from", totalGasUsed
            ORDER BY "gasUsed" DESC
            LIMIT :limit;
        `, {
            replacements: { workspaceId: this.id, intervalInHours, limit },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the latest biggest gas consumers for a given interval.
     * @param {number} [intervalInHours=24] - The interval in hours
     * @param {number} [limit=50] - The limit of gas consumers to return
     * @returns {Promise<Array>} The gas consumers with gasUsed, gasCost, percentUsed
     */
    getLatestGasConsumers(intervalInHours = 24, limit = 50) {
        return sequelize.query(`
            WITH total_gas AS (
                SELECT SUM("gasUsed"::numeric) AS totalGasUsed
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
                AND timestamp >= now() - interval '1 hour' * :intervalInHours
            )
            SELECT
                "to",
                SUM("gasUsed"::numeric) AS "gasUsed",
                SUM("gasPrice"::numeric * "gasUsed"::numeric) AS "gasCost",
                SUM("gasUsed"::numeric) / totalGasUsed AS "percentUsed"
            FROM transaction_events, total_gas
            WHERE 
                "workspaceId" = :workspaceId 
                AND timestamp >= now() - interval '1 hour' * :intervalInHours
                AND "to" IS NOT NULL
            GROUP BY "to", totalGasUsed
            ORDER BY "gasUsed" DESC
            LIMIT :limit;
        `, {
            replacements: { workspaceId: this.id, intervalInHours, limit },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the gas utilization ratio history for a workspace.
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The gas utilization ratio history per day
     */
    getGasUtilizationRatioHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        return sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) as day,
                round(avg("gasUsedRatio"::numeric) * 100, 2) as "gasUtilizationRatio"
            FROM block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: { workspaceId: this.id, from, to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the gas limit history for a workspace.
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The gas limit history per day
     */
    getGasLimitHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        return sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) as day,
                round(avg("gasLimit"::numeric), 0) as "gasLimit"
            FROM block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: { workspaceId: this.id, from, to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the gas price history for a workspace.
     * @param {string} from - The start date
     * @param {string} to - The end date
     * @returns {Promise<Array>} The gas price history with slow/average/fast metrics per day
     */
    getGasPriceHistory(from, to) {
        if (!from || !to)
            throw new Error('Missing parameter');

        return sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) as day,
                min("baseFeePerGas"::numeric + "priorityFeePerGas"[1]::numeric) as "minSlow",
                round(avg("baseFeePerGas"::numeric + "priorityFeePerGas"[1]::numeric), 0) as "slow",
                max("baseFeePerGas"::numeric + "priorityFeePerGas"[1]::numeric) as "maxSlow",
                min("baseFeePerGas"::numeric + "priorityFeePerGas"[2]::numeric) as "minAverage",
                round(avg("baseFeePerGas"::numeric + "priorityFeePerGas"[2]::numeric), 0) as "average",
                max("baseFeePerGas"::numeric + "priorityFeePerGas"[2]::numeric) as "maxAverage",
                min("baseFeePerGas"::numeric + "priorityFeePerGas"[3]::numeric) as "minFast",
                round(avg("baseFeePerGas"::numeric + "priorityFeePerGas"[3]::numeric), 0) as "fast",
                max("baseFeePerGas"::numeric + "priorityFeePerGas"[3]::numeric) as "maxFast"
            FROM public.block_events
            WHERE "workspaceId" = :workspaceId
            AND "timestamp" >= timestamp :from
            AND "timestamp" < timestamp :to
            GROUP BY day
            ORDER BY day ASC
        `, {
            replacements: { workspaceId: this.id, from, to },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Gets the latest gas stats for a workspace.
     * @param {number} [intervalInMinutes=1] - The interval in minutes
     * @returns {Promise<Object>} Gas stats including block size, utilization, block time, base fee, and priority fees
     */
    async getLatestGasStats(intervalInMinutes = 1) {
        const [latestBlockEvents] = await sequelize.query(`
            SELECT * FROM block_events
            WHERE "workspaceId" = :workspaceId
            ORDER BY "timestamp" DESC
            LIMIT 20
        `, {
            replacements: { workspaceId: this.id }
        });

        const latestBlock = latestBlockEvents[0];

        const averageBlockSize = Math.round(latestBlockEvents.reduce((sum, event) => sum + event.transactionCount, 0) / latestBlockEvents.length);
        const averageUtilization = latestBlockEvents.reduce((sum, event) => sum + event.gasUsedRatio, 0) / latestBlockEvents.length;
        const averageBlockTime = latestBlockEvents.length > 1 ? 
            latestBlockEvents.reduce((sum, event, index) => {
                if (index === latestBlockEvents.length - 1) return sum;
                const timeDiff = new Date(latestBlockEvents[index].timestamp) - new Date(latestBlockEvents[index + 1].timestamp);
                return sum + timeDiff;
            }, 0) / (latestBlockEvents.length - 1) / 1000 : 0;
        const latestBlockNumber = latestBlock.number;
        const priorityFeePerGas = {
            slow: latestBlock.priorityFeePerGas[0],
            average: latestBlock.priorityFeePerGas[1],
            fast: latestBlock.priorityFeePerGas[2]
        };

        return {
            averageBlockSize,
            averageUtilization,
            averageBlockTime,
            latestBlockNumber,
            latestBlockTimestamp: latestBlock.timestamp,
            baseFeePerGas: latestBlock.baseFeePerGas,
            priorityFeePerGas
        };
    }

    /**
     * Gets the latest block where all transactions are ready.
     * @returns {Promise<Object>} The latest ready block with number and timestamp
     */
    async getLatestReadyBlock() {
        const [latestReadyBlock] = await sequelize.query(`
            SELECT number, timestamp
            FROM blocks b
            WHERE ("transactionsCount") IN (
                SELECT count(*) as "transactionsCount" FROM transactions t
                WHERE t."blockNumber" = b.number
                AND t."workspaceId" = :workspaceId
                AND t.state = 'ready'
            )
            AND b."workspaceId" = :workspaceId
            ORDER BY number DESC LIMIT 1
        `, {
            replacements: { workspaceId: this.id },
            type: QueryTypes.SELECT
        });

        return latestReadyBlock;
    }

    getTransactionsWithDuplicateTokenBalanceChanges() {
        return sequelize.query(`
            SELECT"transactionId"
            FROM token_balance_changes
            WHERE "workspaceId" = :workspaceId
            GROUP BY "transactionId", "address", "token"
            HAVING count(*) > 1
        `, {
            replacements: { workspaceId: this.id }
        });
    }

    async safeDelete() {
        const blocks = await this.getBlocks({ limit: getMaxBlockForSyncReset() });
        if (blocks.length == getMaxBlockForSyncReset())
            throw new Error('Please reset this workspace before deleting it.');

        const explorer = await this.getExplorer();
        if (explorer)
            throw new Error(`This workspace has an explorer associated to it. Please delete it or change its associated workspace first.`);

        const transaction = await sequelize.transaction();
        try {
            const user = await this.getUser({ transaction });
            if (user.currentWorkspaceId == this.id) {
                const workspaces = (await user.getWorkspaces({ transaction })).filter(w => w.id != this.id);
                const currentWorkspaceId = workspaces.length ? workspaces[0].id : null;
                await user.update({ currentWorkspaceId }, { transaction });
            }
            await this.reset(null, transaction);
            await sequelize.models.CustomField.destroy({ where: { workspaceId: this.id }, transaction });
            await sequelize.models.TransactionTraceStep.destroy({ where: { workspaceId: this.id }, transaction });
            await this.destroy({ transaction });

            await transaction.commit();
        } catch(error) {
            await transaction.rollback();
            throw error;
        }
    }

    async getContractByAddress(address) {
        if (!address) throw new Error('Missing parameter');

        const contracts = await this.getContracts({
            where: { address }
        });

        return contracts[0];
    }

    findBlockGapsV2(lowerBound, upperBound) {
        if (lowerBound === undefined || lowerBound === null || upperBound === undefined || upperBound === null)
            throw new Error('Missing parameter');

        return sequelize.query(`
            WITH ordered_blocks AS (
                SELECT
                    "number",
                    "number" - row_number() OVER (ORDER BY "number") AS group_id
                FROM blocks
                WHERE "workspaceId" = :workspaceId
                AND "number" >= :lowerBound
                AND "number" <= :upperBound
            ),
            grouped_blocks AS (
                SELECT
                    MIN("number") AS group_start,
                    MAX("number") AS group_end,
                    group_id
                FROM ordered_blocks
                GROUP BY group_id
            ),
            lagged_blocks AS (
                SELECT
                    group_start,
                    group_end,
                    LAG(group_end) OVER (ORDER BY group_id) AS previous_group_end
                FROM grouped_blocks
            )
            SELECT
                previous_group_end + 1 AS "blockStart",
                group_start - 1 AS "blockEnd"
            FROM lagged_blocks
            WHERE previous_group_end + 1 <= group_start - 1;
        `, {
            replacements: { workspaceId: this.id, lowerBound, upperBound },
            type: QueryTypes.SELECT
        });
    }

    findBlockGaps(lowerBound, upperBound) {
        if (lowerBound === undefined || lowerBound === null || upperBound === undefined || upperBound === null)
            throw new Error('Missing parameter');

        return sequelize.query(`
            SELECT * FROM (
                SELECT
                    LAG(MAX("number")) OVER (order by group_id) + 1 AS "blockStart",
                    MIN("number") - 1 AS "blockEnd"
                FROM (  
                    SELECT
                        "workspaceId", "number",
                        "number" - row_number() OVER (ORDER BY "number") as group_id
                    FROM blocks
                    WHERE "workspaceId" = :workspaceId
                    AND number >= :lowerBound
                    AND number <= :upperBound
                ) s
                GROUP BY group_id
            ) q
            WHERE "blockStart" IS NOT NULL;
        `, {
            replacements: {
                workspaceId: this.id,
                lowerBound: lowerBound,
                upperBound: upperBound
            },
            type: QueryTypes.SELECT
        });
    }

    async safeCreateOrUpdateRpcHealthCheck(isReachable) {
        if (isReachable === null || isReachable === undefined)
            throw new Error('Missing parameter');

        try {
            const rpcHealthCheck = await withTimeout(this.getRpcHealthCheck(), 5000);

            if (rpcHealthCheck) {
                // This is necessary otherwise Sequelize won't update the value with no other changes
                rpcHealthCheck.changed('updatedAt', true);

                // If rpc is reachable we reset failed attempts as well
                const fields = isReachable ? { isReachable, failedAttempts: 0, updatedAt: new Date() } : { isReachable, updatedAt: new Date() }
                return rpcHealthCheck.update(fields);
            }
            else
                return this.createRpcHealthCheck({ isReachable });
        } catch (error) {
            if (error.message?.includes('Timed out')) {
                logger.error(`RPC health check query timed out for workspace ${this.id}`, { error });
                // If query times out, create a new record instead of failing the entire job
                return this.createRpcHealthCheck({ isReachable });
            }
            throw error;
        }
    }

    async safeCreateOrUpdateIntegrityCheck({ blockId, status }) {
        if (!blockId && !status) throw new Error('Missing parameter');

        const integrityCheck = await this.getIntegrityCheck();

        if (integrityCheck)
            return integrityCheck.update(sanitize({ blockId, status }));
        else
            return this.createIntegrityCheck(sanitize({ blockId, status }));
    }

    async safeDeleteIntegrityCheck() {
        const integrityCheck = await this.getIntegrityCheck();
        if (integrityCheck)
            return integrityCheck.destroy();
    }

    async getCustomTransactionFunction() {
       const custom_field = await sequelize.models.CustomField.findOne({
           where: {
               workspaceId: this.id,
               location: 'transaction'
           }
       });

       return custom_field ? custom_field.function : null;
    }

    async getExpiredBlocks(ttlInMinutes = 15) {
        const blocks = await sequelize.query(`
            SELECT b.id, b."createdAt"
            FROM blocks b
            LEFT JOIN (
                SELECT "blockNumber", COUNT(*) AS txn_count
                FROM transactions
                WHERE "workspaceId" = :workspaceId
                AND state = 'ready'
                GROUP BY "blockNumber"
            ) t ON b.number = t."blockNumber"
            WHERE b."workspaceId" = :workspaceId
            AND (t.txn_count IS NULL OR t.txn_count <> b."transactionsCount");
        `, {
            model: sequelize.models.Block,
            replacements: { workspaceId: this.id }
        });

        // We do this on purpose here, this avoid creating an index on the table, and we shouldn't have a lot of records to filter through anyway
        return blocks.filter(b => moment().diff(b.createdAt, 'minutes') >= ttlInMinutes);
    }

    getFilteredAddressTokenTransfers(address, page = 1, itemsPerPage = 10, orderBy = 'id', order = 'DESC', tokenTypes = []) {
        if (!address) throw new Error('Missing parameter');

        const filteredTokenTypes = tokenTypes
            .map(t => t.toLowerCase())
            .filter(t => ['erc20', 'erc721', 'erc1155'].includes(t))
            .map(t => `'${t}'`)
            .join(',');

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

        let where = {
            [Op.or]: [
                { src: address.toLowerCase() },
                { dst: address.toLowerCase() }
            ],
            token: { [Op.ne]: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' }
        };

        if (tokenTypes.length)
            where['$contract.patterns$'] = { [Op.overlap]: sequelize.literal(`ARRAY[${filteredTokenTypes}]::character varying[]`) };

        return this.getTokenTransfers({
            where,
            include: [
                {
                    model: sequelize.models.Transaction,
                    as: 'transaction',
                    attributes: ['hash', 'blockNumber', 'timestamp', 'methodDetails', 'data']
                },
                {
                    model: sequelize.models.Contract,
                    as: 'contract',
                    attributes: ['id', 'patterns', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'abi'],
                }
            ],
            attributes: ['id', 'src', 'dst', 'token', 'tokenId', [sequelize.cast(sequelize.col('"TokenTransfer".amount'), 'numeric'), 'amount']],
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[...sanitizedOrderBy, order]]
        })
    }

    async countAddressTokenTransfers(address, tokenTypes = []) {
        if (!address) throw new Error('Missing parameter');

        let query = `
            SELECT COUNT(*)::integer FROM token_transfer_events
        `;

        if (tokenTypes.length) {
            query += ` LEFT JOIN contracts c
                ON token_transfer_events."token" = c."address"
                AND c."workspaceId" = :workspaceId`;
        }

        query += ` WHERE token_transfer_events."workspaceId" = :workspaceId
            AND ("src" = :address OR "dst" = :address)
            AND token_transfer_events.token != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'`;

        if (tokenTypes.length)
            query += ` AND c."patterns"::text[] && ARRAY[:tokenTypes]`;

        const [result] = await sequelize.query(query, {
            replacements: { workspaceId: this.id, address, tokenTypes },
            type: QueryTypes.SELECT
        });

        return result.count;
    }


    async getAddressTransactionStats(address) {
        if (!address) throw new Error('Missing parameter');

        const [result] = await sequelize.query(`
            WITH first_tx AS (
                SELECT te.timestamp, t.hash
                FROM transaction_events te
                JOIN transactions t ON te."transactionId" = t.id
                WHERE te."workspaceId" = :workspaceId
                    AND te."from" = :address
                ORDER BY te.timestamp ASC
                LIMIT 1
            ),
            last_tx AS (
                SELECT te.timestamp, t.hash
                FROM transaction_events te
                JOIN transactions t ON te."transactionId" = t.id
                WHERE te."workspaceId" = :workspaceId
                    AND te."from" = :address
                ORDER BY te.timestamp DESC
                LIMIT 1
            ),
            transaction_stats AS (
                SELECT
                    COUNT(*) AS count
                FROM transaction_events te
                WHERE te."workspaceId" = :workspaceId
                AND (
                    te."from" = :address OR
                    te."to" = :address
                )
            ),
            transfer_stats AS (
                SELECT
                    COUNT(*) AS total_transfers,
                    COUNT(*) FILTER (
                        WHERE c."patterns" && ARRAY['erc20']::varchar[]
                    ) AS erc20_transfer_count,
                    COUNT(*) FILTER (
                        WHERE c."patterns" && ARRAY['erc721']::varchar[]
                    ) AS erc721_transfer_count,
                    COUNT(*) FILTER (
                        WHERE c."patterns" && ARRAY['erc1155']::varchar[]
                    ) AS erc1155_transfer_count
                FROM token_transfer_events tte
                LEFT JOIN contracts c 
                    ON tte."token" = c."address" AND c."workspaceId" = :workspaceId
                WHERE tte."workspaceId" = :workspaceId
                AND (
                    tte."src" = :address OR
                    tte."dst" = :address
                )
            )
            SELECT
                COALESCE(ts.total_transfers, 0)::integer AS "tokenTransferCount",
                COALESCE(tx.count, 0)::integer AS "transactionCount",
                ft.timestamp AS "firstTransactionTimestamp",
                lt.timestamp AS "lastTransactionTimestamp",
                ft.hash AS "firstTransactionHash",
                lt.hash AS "lastTransactionHash",
                COALESCE(ts."erc20_transfer_count", 0)::integer AS "erc20TransferCount",
                COALESCE(ts."erc721_transfer_count", 0)::integer AS "erc721TransferCount",
                COALESCE(ts."erc1155_transfer_count", 0)::integer AS "erc1155TransferCount"
            FROM transaction_stats tx
            LEFT JOIN transfer_stats ts ON true
            LEFT JOIN first_tx ft ON true
            LEFT JOIN last_tx lt ON true;
        `, {
            replacements: {
                workspaceId: this.id,
                address: address.toLowerCase()
            },
            type: QueryTypes.SELECT
        });

        return result;
    }
    async getTransactionCount(since) {
        let query;
        let replacements;

        if (!since) {
            // For total count, skip expensive earliest block lookup and count all transactions
            query = `
                SELECT COUNT(1) AS count
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
            `;
            replacements = { workspaceId: this.id };
        } else {
            // For time-filtered count, use timestamp filter
            query = `
                SELECT COUNT(1) AS count
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
                AND timestamp >= timestamp :since
            `;
            replacements = { workspaceId: this.id, since };
        }

        const [{ count },] = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return parseInt(count);
    }

    async getTransactionVolume(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [transactions,] = await sequelize.query(`
            WITH date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', :from::timestamp),
                    DATE_TRUNC('day', :to::timestamp),
                    INTERVAL '1 day'
                ) AS date
            )
            SELECT
                ds.date,
                coalesce(tvd.count, 0) AS count
            FROM
                date_series ds
            LEFT JOIN
                transaction_volume_daily tvd ON ds.date = tvd.timestamp
            AND
                tvd."workspaceId" = :workspaceId
            ORDER BY
                ds.date ASC;
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return transactions;
    }

    async getDeployedContractCount(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [deployedContractCount,] = await sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) AS date,
                coalesce(count(1), 0) AS count
            FROM transaction_events
            WHERE timestamp >= timestamp :from
                AND timestamp < timestamp :to
                AND "to" IS NULL
                AND "workspaceId" = :workspaceId
            GROUP BY date
            ORDER BY date ASC;
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return deployedContractCount;
    }

    async getCumulativeDeployedContractCount(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            attributes: ['timestamp'],
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [cumulativeDeployedContractCount,] = await sequelize.query(`
            WITH days AS (
                SELECT
                    d::date as day
                FROM generate_series(:from::date, :to::date, interval  '1 day') d
            ),
            counts AS (
                SELECT
                    day::timestamptz AS counts_date,
                    count(1) AS count
                FROM transaction_events, days
                WHERE timestamp <= days.day + interval '1 day'
                    AND "to" IS NULL
                    AND "workspaceId" = :workspaceId
                GROUP BY day
                ORDER BY day ASC
            ),
            filled AS (
                SELECT
                    time_bucket_gapfill('1 day', counts_date) AS date,
                    locf(avg(count))
                FROM counts
                WHERE counts_date >= :from::date and counts_date < :to::date
                GROUP BY date
            )
            SELECT date, coalesce(locf, 0)::integer count FROM filled
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return cumulativeDeployedContractCount;
    }


    async getCumulativeWalletCount(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [cumulativeWalletCount,] = await sequelize.query(`
            WITH days AS (
                SELECT
                    d::date as day
                FROM generate_series(:from::date, :to::date, interval  '1 day') d
            ),
            counts AS (
                SELECT
                    day::timestamptz AS counts_date,
                    count(distinct "from")
                FROM transaction_events, days
                WHERE timestamp <= days.day + interval '1 day' AND "workspaceId" = :workspaceId
                GROUP BY day
                ORDER BY day ASC
            ),
            filled AS (
                SELECT
                    time_bucket_gapfill('1 day', counts_date) AS date,
                    locf(avg(count))
                FROM counts
                WHERE counts_date >= :from::date and counts_date < :to::date
                GROUP BY date
            )
            SELECT date, coalesce(locf, 0)::integer count FROM filled
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return cumulativeWalletCount;
    }

    async getUniqueWalletCount(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [uniqueWalletCount,] = await sequelize.query(`
            WITH date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', :from::timestamp),
                    DATE_TRUNC('day', :to::timestamp),
                    INTERVAL '1 day'
                ) AS date
            )
            SELECT
                ds.date,
                coalesce(awd.count, 0) AS count
            FROM
                date_series ds
            LEFT JOIN
                active_wallets_daily awd ON ds.date = awd.timestamp
            AND
                awd."workspaceId" = :workspaceId
            ORDER BY
                ds.date ASC;
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return uniqueWalletCount;
    } 

    async getAverageGasPrice(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [avgGasPrice,] = await sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) AS date,
                coalesce(round(avg("gasPrice")), 0) AS avg
            FROM transaction_events
            WHERE timestamp >= timestamp :from
                AND timestamp < timestamp :to
                AND "workspaceId" = :workspaceId
            GROUP BY date
            ORDER BY date ASC;
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return avgGasPrice;
    }

    async getAverageTransactionFee(from, to) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        const [avgTransactionFee,] = await sequelize.query(`
            SELECT
                time_bucket_gapfill('1 day', timestamp) AS date,
                coalesce(round(avg("transactionFee")), 0) AS avg
            FROM transaction_events
            WHERE timestamp >= timestamp :from
                AND timestamp < timestamp :to
                AND "workspaceId" = :workspaceId
            GROUP BY date
            ORDER BY date ASC;
        `, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id
            }
        });

        return avgTransactionFee;
    }

    async getTokenTransferVolume(from, to, token, type) {
        if (!from || !to) throw new Error('Missing parameter');

        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });

        if (!earliestBlock && +new Date(from) == 0)
            return [];

        const earliestTimestamp = +new Date(from) == 0 ? earliestBlock.timestamp : new Date(from);

        let query = `
            SELECT
                time_bucket_gapfill('1 day', timestamp) AS date,
                coalesce(count(1), 0) AS count
            FROM token_transfer_events
            WHERE timestamp >= timestamp :from
                AND timestamp < timestamp :to
                AND "workspaceId" = :workspaceId`;

        if (token) {
            query += ` AND token = :token`;
        }

        if (type) {
            query += ` AND "tokenType" = :type`;
        }

        query += ` GROUP BY date
            ORDER BY date ASC;
        `;

        const [transfers,] = await sequelize.query(query, {
            replacements: {
                from: new Date(earliestTimestamp),
                to,
                workspaceId: this.id,
                token, type
            }
        });

        return transfers;
    }

    async countActiveWallets() {
        const [earliestBlock] = await this.getBlocks({
            attributes: ['timestamp'],
            where: {
                timestamp: { [Op.gt]: new Date(0) }
            },
            order: [['number', 'ASC']],
            limit: 1
        });
        const since = earliestBlock ? new Date(earliestBlock.timestamp) : new Date(0);

        const [{ count },] = await sequelize.query(`
            SELECT COUNT(*)
            FROM (
                SELECT "from"
                FROM transaction_events
                WHERE "workspaceId" = :workspaceId
                AND timestamp >= DATE_TRUNC('day', :since::timestamp)
                GROUP BY "from"
            ) wallets
        `, {
            type: QueryTypes.SELECT,
            replacements: {
                workspaceId: this.id,
                since
            }
        });
        return parseInt(count);
    }

    async safeFindLatestTokenBalances(address, tokenPatterns = []) {
        if (!address) return [];

        const allowedTokenPatterns = tokenPatterns.filter(p => ['erc20', 'erc721'].indexOf(p) > -1);

        let tokenFilter = {
            [Op.and]: sequelize.where(
                sequelize.col("tokenContract.workspaceId"),
                Op.eq,
                sequelize.col("TokenBalanceChange.workspaceId")
            ),
            [Op.and]: sequelize.where(
                sequelize.col("tokenContract.address"),
                Op.eq,
                sequelize.col("TokenBalanceChange.token")
            )
        };

        if (allowedTokenPatterns.length) {
            tokenFilter = { patterns: { [Op.contains]: allowedTokenPatterns }, ...tokenFilter };
        }

        const tokenBalanceChanges = await this.getTokenBalanceChanges({
            where: {
                address: address.toLowerCase()
            },
            order: [['token'], ['transaction', 'blockNumber', 'DESC']],
            include: [
                {
                    model: sequelize.models.TokenTransfer,
                    attributes: ['id', 'tokenId'],
                    as: 'tokenTransfer'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['name', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'address', 'workspaceId'],
                    as: 'tokenContract',
                    where: tokenFilter,
                    required: !!allowedTokenPatterns.length
                },
                {
                    model: sequelize.models.Transaction,
                    attributes: ['blockNumber'],
                    as: 'transaction'
                }
            ]
        });

        const result = {};
        tokenBalanceChanges.forEach(item => {
            if (!result[item.token] || result[item.token] && item.blockNumber > result[item.token].blockNumber)
                result[item.token] = item.toJSON();
        });

        return Object.values(result);
    }

    getFilteredImportedAccounts(page = 1, itemsPerPage = 10, orderBy = 'address', order = 'DESC') {
        if (page == -1)
            return this.getAccounts({
                order: [[orderBy, order]],
                attributes: ['workspaceId', 'address', 'balance', 'privateKey']
            });
        else
            return this.getAccounts({
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage,
                order: [[orderBy, order]],
                attributes: ['workspaceId', 'address', 'balance', 'privateKey']
            });
    }

    getFilteredContracts(page = 1, itemsPerPage = 10, orderBy = 'timestamp', order = 'DESC', pattern = null) {
        const allowedPattern = pattern && ['erc20', 'erc721'].indexOf(pattern.toLowerCase()) > -1 ? pattern : null;
        const where = allowedPattern ? { patterns: { [Op.contains]: [allowedPattern] } } : {};
        const sanitizedOrder = `${['ASC', 'DESC'].indexOf(order.toUpperCase()) > - 1 ? order : 'DESC'} NULLS LAST`;

        let sanitizedOrderBy;
        switch(orderBy) {
            case 'name':
            case 'address':
            case 'tokenName':
            case 'tokenSymbol':
                sanitizedOrderBy = [orderBy];
                break;
            case 'tokenTotalSupply':
                sanitizedOrderBy = [sequelize.cast(sequelize.col('"Contract"."tokenTotalSupply'), 'numeric')];
                break
            case 'timestamp':
            default:
                sanitizedOrderBy = ['creationTransaction', 'timestamp'];
                break;
        }

        return this.getContracts({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[...sanitizedOrderBy, sanitizedOrder]],
            attributes: ['address', 'name', 'timestamp', 'patterns', 'workspaceId', 'tokenName', 'tokenSymbol', 'tokenTotalSupply'],
            include: [
                {
                    model: sequelize.models.ContractVerification,
                    as: 'verification',
                    attributes: ['createdAt']
                },
                {
                    model: sequelize.models.Transaction,
                    as: 'creationTransaction',
                    attributes: ['hash', 'timestamp', 'from']
                }
            ]
        });
    }

    getFilteredBlocks(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'number') {
        return this.sequelize.models.Block.findAll({
            where: { workspaceId: this.id },
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]]
        });
    }

    countTransactionsSince(since = 0) {
        return this.countTransactions({
            where: {
                timestamp: { [Op.gte]: since }
            }
        });
    }

    getFilteredTransactions(page = 1, itemsPerPage = 10, order = 'DESC', orderBy = 'blockNumber', address) {
        let where = {};
        if (address)
            where = {
                workspaceId: this.id,
                [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }]
            };

        return this.getTransactions({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId', 'state'],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'cumulativeGasUsed', [sequelize.json('raw.effectiveGasPrice'), 'effectiveGasPrice']],
                    as: 'receipt',
                    include: {
                        model: sequelize.models.Contract,
                        as: 'createdContract',
                        attributes: ['address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'workspaceId', 'patterns'],
                        where: {
                            workspaceId: this.id
                        },
                        required: false,
                        include: {
                            model: sequelize.models.ContractVerification,
                            as: 'verification',
                            attributes: ['createdAt']
                        }
                    }
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['name', 'tokenName', 'tokenSymbol', 'abi'],
                    as: 'contract',
                    where: {
                        workspaceId: this.id
                    },
                    required: false,
                    include: {
                        model: sequelize.models.ContractVerification,
                        attributes: ['createdAt'],
                        as: 'verification'
                    }
                }
            ]
        });
    }

    async canCreateContract() {
        if (this.public)
            return true;

        const user = await this.getUser();
        if (user.isPremium)
            return true;

        const contractCount = await this.countContracts();
        return contractCount < 10;
    }

    async safeCreatePartialBlock(block) {
        return sequelize.transaction(async sequelizeTransaction => {
            try {
                // Pre-load workspace to prevent N+1 queries in block afterCreate hook
                const workspace = await this.reload({
                    attributes: ['id', 'public', 'tracing', 'integrityCheckStartBlockNumber'],
                    transaction: sequelizeTransaction
                });
                const transactions = block.transactions.map(transaction => {
                    const processed = processRawRpcObject(
                        transaction,
                        Object.keys(sequelize.models.Transaction.rawAttributes),
                        ['input', 'index']
                    );

                    return sanitize({
                        workspaceId: this.id,
                        blockHash: processed.blockHash,
                        blockNumber: processed.blockNumber,
                        creates: processed.creates,
                        data: transaction.data || transaction.input,
                        parsedError: processed.parsedError,
                        rawError: processed.rawError,
                        from: processed.from,
                        gasLimit: processed.gasLimit || block.gasLimit,
                        gasPrice: processed.gasPrice || processed.maxFeePerGas || '0',
                        hash: processed.hash,
                        methodLabel: processed.methodLabel,
                        methodName: processed.methodName,
                        methodSignature: processed.methodSignature,
                        nonce: processed.nonce,
                        r: processed.r,
                        s: processed.s,
                        timestamp: block.timestamp,
                        to: processed.to,
                        transactionIndex: transaction.transactionIndex !== undefined && transaction.transactionIndex !== null ? transaction.transactionIndex : transaction.index,
                        type: processed.type,
                        v: processed.v,
                        value: processed.value,
                        state: 'syncing',
                        gas: processed.gas,
                        maxFeePerGas: processed.maxFeePerGas,
                        maxPriorityFeePerGas: processed.maxPriorityFeePerGas,
                        accessList: processed.accessList,
                        yParity: processed.yParity,
                        blobVersionedHashes: processed.blobVersionedHashes,
                        maxFeePerBlobGas: processed.maxFeePerBlobGas,
                        logsBloom: processed.logsBloom,
                        mixHash: processed.mixHash,
                        receiptsRoot: processed.receiptsRoot,
                        sendCount: processed.sendCount,
                        sendRoot: processed.sendRoot,
                        sha3Uncles: processed.sha3Uncles,
                        size: processed.size,
                        stateRoot: processed.stateRoot,
                        transactionsRoot: processed.transactionsRoot,
                        withdrawals: processed.withdrawals,
                        requestId: processed.requestId,
                        raw: processed.raw
                    });
                });

                const [createdBlock] = await sequelize.models.Block.bulkCreate(
                    [
                        sanitize({
                            workspaceId: this.id,
                            baseFeePerGas: block.baseFeePerGas,
                            difficulty: block.difficulty,
                            extraData: block.extraData,
                            gasLimit: block.gasLimit,
                            gasUsed: block.gasUsed,
                            hash: block.hash,
                            miner: block.miner,
                            nonce: block.nonce,
                            number: block.number,
                            parentHash: block.parentHash,
                            timestamp: block.timestamp,
                            transactionsCount: block.transactions ? block.transactions.length : 0,
                            state: 'ready',
                            l1BlockNumber: block.l1BlockNumber,
                            logsBloom: block.logsBloom,
                            mixHash: block.mixHash,
                            receiptsRoot: block.receiptsRoot,
                            sendCount: block.sendCount,
                            sendRoot: block.sendRoot,
                            sha3Uncles: block.sha3Uncles,
                            size: block.size,
                            stateRoot: block.stateRoot,
                            transactionsRoot: block.transactionsRoot,
                            withdrawals: block.withdrawals,
                            raw: block.raw,
                        })
                    ],
                    {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction: sequelizeTransaction,
                        // Pass cached workspace to prevent N+1 queries in afterCreate hook
                        cachedWorkspace: workspace
                    }
                );

                if (!createdBlock.id)
                    return null;

                const transactionsToInsert = transactions.map(t => {
                    return {
                        ...t,
                        blockId: createdBlock.id,
                        // Additional safety check for gasPrice to prevent null constraint violation
                        gasPrice: t.gasPrice || '0'
                    }
                });

                const storedTransactions = await sequelize.models.Transaction.bulkCreate(transactionsToInsert, {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction: sequelizeTransaction
                });

                // Use already-loaded orbitConfig from workspace query to avoid redundant DB lookup
                const orbitConfig = this.orbitConfig;
                if (orbitConfig) {
                    const orbitBatch = await sequelize.models.OrbitBatch.findOne({
                        where: {
                            workspaceId: this.id,
                            prevMessageCount: { [Op.lte]: block.number },
                            newMessageCount: { [Op.gt]: block.number }
                        },
                        transaction: sequelizeTransaction
                    });

                    if (orbitBatch) {
                        await orbitBatch.safeUpdateBlocks({
                            parentMessageCountShift: orbitConfig.parentMessageCountShift,
                            transaction: sequelizeTransaction
                        });
                    }
                }

                return { ...createdBlock, transactions: storedTransactions };
            } catch(error) {
                const blockAlreadyExists = error.errors && error.errors.find(e => e.validatorKey === 'not_unique');
                if (blockAlreadyExists)
                    return null;
                else
                    throw error;
            }
        });
    }

    /*
        It's all or nothing, we make sure we synchronize all the block info, ie:
        - Block
        - Transactions
        - Receipt
        - Logs
        It takes longer, but we avoid inconsistencies, such as a block not displaying all transactions
    */
    async safeCreateFullBlock(data) {
        try {
            return await sequelize.transaction(async sequelizeTransaction => {
                const block = data.block;
                const transactions = data.transactions;

                if (block.transactions.length != transactions.length)
                    throw new Error('Missing transactions in block.');

                const [, [storedBlock]] = await sequelize.models.Block.update(
                    { state: 'ready' },
                    {
                        where: {
                            workspaceId: this.id,
                            number: block.number
                        },
                        individualHooks: true,
                        returning: true,
                        transaction: sequelizeTransaction
                    }
                );

                const explorer = await this.getExplorer({ transaction: sequelizeTransaction });
                const stripeSubscription = explorer
                    ? await explorer.getStripeSubscription({ transaction: sequelizeTransaction })
                    : null;

                for (let i = 0; i < transactions.length; i++) {
                    const transaction = transactions[i];
                    const [, [storedTx]] = await sequelize.models.Transaction.update(
                        { state: 'ready' },
                        {
                            where: {
                                workspaceId: this.id,
                                hash: transaction.hash
                            },
                            individualHooks: true,
                            returning: true,
                            transaction: sequelizeTransaction
                        }
                    );

                    const receipt = transaction.receipt;
                    if (!receipt)
                        throw new Error('Missing transaction receipt.');

                    const storedReceipt = await storedTx.createReceipt(sanitize({
                        workspaceId: storedTx.workspaceId,
                        blockHash: receipt.blockHash,
                        blockNumber: receipt.blockNumber,
                        byzantium: receipt.byzantium,
                        confirmations: receipt.confirmations,
                        contractAddress: receipt.contractAddress,
                        cumulativeGasUsed: receipt.cumulativeGasUsed,
                        from: receipt.from,
                        gasUsed: receipt.gasUsed,
                        logsBloom: receipt.logsBloom,
                        status: receipt.status,
                        to: receipt.to,
                        transactionHash: receipt.transactionHash || receipt.hash || storedTx.hash,
                        transactionIndex: receipt.transactionIndex || receipt.index,
                        type: receipt.type,
                        raw: receipt
                    }), { transaction: sequelizeTransaction });

                    for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        try {
                            await storedReceipt.createLog(sanitize({
                                workspaceId: storedTx.workspaceId,
                                address: log.address,
                                blockHash: log.blockHash,
                                blockNumber: log.blockNumber,
                                data: log.data,
                                logIndex: log.logIndex,
                                topics: log.topics,
                                transactionHash: log.transactionHash,
                                transactionIndex: log.transactionIndex,
                                raw: log
                            }), { transaction: sequelizeTransaction });
                        } catch(error) {
                            logger.error(error.message, { location: 'models.workspaces.safeCreateFullBlock', error: error, data });
                            await storedReceipt.createLog(sanitize({
                                workspaceId: storedTx.workspaceId,
                                raw: log
                            }), { transaction: sequelizeTransaction });
                        }
                    }

                    if (stripeSubscription)
                        await stripeSubscription.increment('transactionQuota', { transaction: sequelizeTransaction });
                }

                return storedBlock;
            });
        } catch(error) {
            await this.safeDestroyPartialBlock(data.block.number);
            throw error;
        }
    }

    async safeDestroyPartialBlock(blockNumber) {
        const [block] = await this.getBlocks({ where: { workspaceId: this.id, number: blockNumber }});

        // No need to throw an error if the block we are trying to destroy does not exist or is not partial
        if (!block || block.state !== 'syncing') return;

        return block.revertIfPartial();
    }

    safeCreateBlock(block) {
        return this.createBlock(sanitize({
            baseFeePerGas: block.baseFeePerGas,
            difficulty: block.difficulty,
            extraData: block.extraData,
            gasLimit: block.gasLimit,
            gasUsed: block.gasUsed,
            hash: block.hash,
            miner: block.miner,
            nonce: block.nonce,
            number: block.number,
            parentHash: block.parentHash,
            timestamp: block.timestamp,
            transactionsCount: block.transactions ? block.transactions.length : 0,
            raw: block
        }));
    }

    async safeCreateTransaction(transaction, blockId) {
        return sequelize.transaction(async (sequelizeTransaction) => {
            const storedTx = await this.createTransaction(sanitize({
                blockHash: transaction.blockHash,
                blockNumber: transaction.blockNumber,
                blockId: blockId,
                creates: transaction.creates,
                data: transaction.data,
                parsedError: transaction.parsedError,
                rawError: transaction.rawError,
                from: transaction.from,
                gasLimit: transaction.gasLimit,
                gasPrice: transaction.gasPrice || transaction.maxFeePerGas || '0',
                hash: transaction.hash,
                methodLabel: transaction.methodLabel,
                methodName: transaction.methodName,
                methodSignature: transaction.methodSignature,
                nonce: transaction.nonce,
                r: transaction.r,
                s: transaction.s,
                timestamp: transaction.timestamp,
                to: transaction.to,
                transactionIndex: transaction.transactionIndex !== undefined && transaction.transactionIndex !== null ? transaction.transactionIndex : transaction.index,
                type_: transaction.type,
                v: transaction.v,
                value: transaction.value,
                gas: transaction.gas,
                maxFeePerGas: transaction.maxFeePerGas,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
                accessList: transaction.accessList,
                yParity: transaction.yParity,
                blobVersionedHashes: transaction.blobVersionedHashes,
                maxFeePerBlobGas: transaction.maxFeePerBlobGas,
                raw: transaction
            }), { transaction: sequelizeTransaction });

            const receipt = transaction.receipt;
            if (receipt) {
                const storedReceipt = await storedTx.createReceipt(sanitize({
                    workspaceId: storedTx.workspaceId,
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber,
                    byzantium: receipt.byzantium,
                    confirmations: receipt.confirmations,
                    contractAddress: receipt.contractAddress,
                    cumulativeGasUsed: receipt.cumulativeGasUsed,
                    from: receipt.from,
                    gasUsed: receipt.gasUsed,
                    logsBloom: receipt.logsBloom,
                    status: receipt.status,
                    to: receipt.to,
                    transactionHash: receipt.transactionHash || receipt.hash || storedTx.hash,
                    transactionIndex: receipt.transactionIndex !== undefined && receipt.transactionIndex !== null ? receipt.transactionIndex : receipt.index,
                    type_: receipt.type,
                    raw: receipt
                }), { transaction: sequelizeTransaction });

                // Bulk create transaction logs to avoid N+1 queries
                if (receipt.logs.length > 0) {
                    const logsData = receipt.logs.map(log => sanitize({
                        workspaceId: storedTx.workspaceId,
                        transactionReceiptId: storedReceipt.id,
                        address: log.address,
                        blockHash: log.blockHash,
                        blockNumber: log.blockNumber,
                        data: log.data,
                        logIndex: log.logIndex,
                        topics: log.topics,
                        transactionHash: log.transactionHash,
                        transactionIndex: log.transactionIndex,
                        raw: log
                    }));

                    try {
                        await sequelize.query('SAVEPOINT bulk_logs_insert', { transaction: sequelizeTransaction });
                        await sequelize.models.TransactionLog.bulkCreate(logsData, { transaction: sequelizeTransaction });
                    } catch(error) {
                        logger.error(error.message, { location: 'models.workspaces.safeCreateTransaction', error: error, transaction: transaction });
                        await sequelize.query('ROLLBACK TO SAVEPOINT bulk_logs_insert', { transaction: sequelizeTransaction });
                        // Fall back to individual creates with minimal data
                        for (const logData of logsData) {
                            try {
                                await sequelize.models.TransactionLog.create(
                                    sanitize({ workspaceId: logData.workspaceId, transactionReceiptId: logData.transactionReceiptId, raw: logData.raw }),
                                    { transaction: sequelizeTransaction }
                                );
                            } catch(innerError) {
                                logger.error(innerError.message, { location: 'models.workspaces.safeCreateTransaction.fallback', error: innerError, transaction: transaction });
                            }
                        }
                    }
                }
            }

            return storedTx;
        });
    }

    async safeCreateOrUpdateContract(contract, transaction) {
        if (contract.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
            return null;

        const contracts = await this.getContracts({
            where: { address: contract.address.toLowerCase() },
            transaction
        });
        const existingContract = contracts[0];

        const newContract = sanitize({
            hashedBytecode: contract.hashedBytecode,
            abi: contract.abi,
            address: contract.address,
            name: contract.name,
            imported: contract.imported,
            patterns: contract.patterns,
            processed: contract.processed,
            proxy: contract.proxy,
            timestamp: contract.timestamp,
            tokenDecimals: contract.tokenDecimals,
            tokenName: contract.tokenName,
            tokenSymbol: contract.tokenSymbol,
            tokenTotalSupply: contract.tokenTotalSupply,
            watchedPaths: contract.watchedPaths,
            has721Metadata: contract.has721Metadata,
            has721Enumerable: contract.has721Enumerable,
            ast: contract.ast,
            bytecode: contract.bytecode,
            asm: contract.asm
        });

        if (existingContract)
            return existingContract.update(newContract, { transaction })
        else {
            const [_contract] = await sequelize.models.Contract.bulkCreate(
                [
                    {
                        ...newContract,
                        workspaceId: this.id,
                        transactionId: contract.transactionId
                    },
                ],
                {
                    ignoreDuplicates: true,
                    individualHooks: true,
                    returning: true,
                    transaction
                }
            );
            return _contract;
        }
    }

    async safeCreateOrUpdateAccount(account) {
        const accounts = await this.getAccounts({ where: { address: account.address.toLowerCase() }});
        const existingAccount = accounts[0];
        const newAccount = sanitize({
            address: account.address,
            balance: account.balance,
            privateKey: account.privateKey
        });

        if (existingAccount)
            return existingAccount.update(newAccount);
        else
            return this.createAccount(newAccount);
    }

    findContractsByText(text) {
        return this.getContracts({
            attributes: ['id', 'address', 'name', 'tokenName', 'tokenSymbol', 'patterns'],
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${text}%` } },
                    { tokenName: { [Op.iLike]: `%${text}%` } },
                    { tokenSymbol: { [Op.iLike]: `%${text}%` } },
                ]
            },
            include: {
                model: sequelize.models.ContractVerification,
                as: 'verification',
                attributes: ['createdAt']
            }
        })
    }

    async findBlockByHash(hash) {
        const blocks = await this.getBlocks({
            where: {
                hash: hash
            }
        });

        return blocks.length ? blocks[0] : null;
    }

    getTransactionLogs(hash, page = 1, itemsPerPage = 20) {
        if (!hash)
            throw new Error('Missing parameter');

        return sequelize.models.TransactionLog.findAndCountAll({
            where: {
                workspaceId: this.id,
                '$receipt.transactionHash$': hash
            },
            include: {
                model: sequelize.models.TransactionReceipt,
                as: 'receipt',
                attributes: ['transactionHash']
            },
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            attributes: ['id', 'address', 'data', 'logIndex', 'topics']
        })
    }

    async findTransaction(hash) {
        const blockAttributes = ['gasLimit', 'timestamp', 'baseFeePerGas'];
        const transactionAttributes = ['id', 'blockNumber', 'data', 'parsedError', 'rawError', 'from', 'formattedBalanceChanges', 'gasLimit', 'gasPrice', 'hash', 'timestamp', 'to', 'value', 'storage', 'workspaceId', 'raw', 'state', 'transactionIndex', 'nonce', 'type', 'methodDetails',
            'gas', 'maxFeePerGas', 'maxPriorityFeePerGas', 'accessList', 'yParity', 'blobVersionedHashes', 'maxFeePerBlobGas',
            [
                Sequelize.literal(`
                    (
                        SELECT COUNT(*)
                        FROM token_transfers
                        WHERE token_transfers."transactionId" = "Transaction".id
                        AND token_transfers."isReward" = false
                    )::int
                `), 'tokenTransferCount'
            ],
            [
                Sequelize.literal(`
                    (
                        SELECT COUNT(*)
                        FROM token_balance_changes
                        WHERE token_balance_changes."transactionId" = "Transaction".id
                    )::int
                `), 'tokenBalanceChangeCount'
            ],
            [
                Sequelize.literal(`
                    (
                        SELECT COUNT(*)
                        FROM transaction_trace_steps
                        WHERE transaction_trace_steps."transactionId" = "Transaction".id
                    )::int
                `), 'internalTransactionCount'
            ]
        ];
        const receiptAttributes = ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'cumulativeGasUsed', 'raw', 'effectiveGasPrice',
            'timeboosted', 'gasUsedForL1', 'blobGasUsed', 'blobGasPrice',
            [Sequelize.literal(`
                (SELECT COUNT(*)
                FROM transaction_logs
                WHERE transaction_logs."transactionReceiptId" = "receipt".id)::int
            `), 'logCount']
        ];
        const blockInclude = [];

        const orbitConfig = await this.getOrbitConfig();
        if (orbitConfig) {
            blockAttributes.push('orbitStatus');
            blockInclude.push({
                model: sequelize.models.OrbitBatch,
                as: 'orbitBatch',
                attributes: ['batchSequenceNumber', 'confirmationStatus', 'parentChainTxHash'],
                include: {
                    model: sequelize.models.OrbitNode,
                    as: 'orbitNode',
                    attributes: ['id']
                }
            });
            receiptAttributes.push('timeboosted', 'gasUsedForL1');
        }

        const transactions = await this.getTransactions({
            where: {
                hash: hash
            },
            attributes: transactionAttributes,
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: receiptAttributes,
                    as: 'receipt',
                    include: {
                        model: sequelize.models.Contract,
                        as: 'createdContract',
                        attributes: ['address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'workspaceId', 'patterns'],
                        where: {
                            workspaceId: this.id
                        },
                        required: false,
                        include: {
                            model: sequelize.models.ContractVerification,
                            as: 'verification',
                            attributes: ['createdAt']
                        }
                    }
                },
                {
                    model: sequelize.models.Block,
                    attributes: blockAttributes,
                    as: 'block',
                    include: blockInclude
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi', 'address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'workspaceId', 'patterns'],
                    as: 'contract',
                    include: {
                        model: sequelize.models.ContractVerification,
                        as: 'verification',
                        attributes: ['createdAt']
                    }
                }
            ]
        });

        return transactions.length ? transactions[0] : null;
    }

    async findBlockByNumber(number, withTransactions = false) {
        const include = withTransactions ? [{
            model: sequelize.models.Transaction,
            attributes: ['id', 'from', 'to', 'hash'],
            as: 'transactions'
        }] : [];
        const blocks = await this.getBlocks({
            where: {
                number: number
            },
            include: include
        });
        return blocks[0];
    }

    async findContractById(contractId) {
        const contracts = await this.getContracts({
            where: {
                id: contractId
            }
        });
        return contracts[0];
    }

    async findContractByAddress(address) {
        const contracts = await this.getContracts({
            attributes: [
                'abi', 'address', 'asm', 'bytecode', 'has721Enumerable', 'has721Metadata', 'hashedBytecode', 'id', 'imported', 'isToken', 'name', 'patterns', 'processed', 'proxy', 'timestamp', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'tokenTotalSupply', 'transactionId', 'verificationStatus', 'workspaceId',
                [Sequelize.literal(`
                    (
                        SELECT COUNT(*)
                        FROM transaction_logs
                        WHERE transaction_logs."workspaceId" = "Contract"."workspaceId"
                        AND transaction_logs."address" = "Contract"."address"
                    )
                `), 'logCount']
            ],
            where: {
                address: address.toLowerCase()
            },
            include: [
                {
                    model: sequelize.models.Contract,
                    attributes: ['name', 'tokenName', 'tokenSymbol', 'tokenDecimals', 'abi', 'address'],
                    as: 'proxyContract',
                    required: false,
                    where: {
                        [Op.and]: sequelize.where(
                            sequelize.col("Contract.workspaceId"),
                            Op.eq,
                            sequelize.col("proxyContract.workspaceId")
                        )
                    }
                },
                {
                    model: sequelize.models.ContractVerification,
                    as: 'verification',
                    include: [
                        {
                            model: sequelize.models.ContractSource,
                            as: 'sources'
                        }
                    ]
                },
                {
                    model: sequelize.models.Transaction,
                    as: 'creationTransaction',
                    attributes: ['hash', 'timestamp', 'from']
                }
            ]
        });

        return contracts[0];
    }

    async findContractByHashedBytecode(hashedBytecode) {
        const contracts = await this.getContracts({
            where: {
                hashedBytecode: hashedBytecode
            }
        });
        return contracts[0];
    }

    addIntegration(integration) {
        if (!INTEGRATION_FIELD_MAPPING[integration])
            throw '[workspace.addIntegration] Unknown integration';

        return this.update({
            [INTEGRATION_FIELD_MAPPING[integration]]: true
        });
    }

    removeIntegration(integration) {
        if (!INTEGRATION_FIELD_MAPPING[integration])
            throw '[workspace.removeIntegration] Unknown integration';

        return this.update({
            [INTEGRATION_FIELD_MAPPING[integration]]: false
        });
    }

    async updateSettings(data) {
        if (data.name) {
            const existing = await sequelize.models.Workspace.findOne({
                where: {
                    userId: this.userId,
                    name: data.name,
                    id: {
                        [Op.not]: this.id
                    }
                }
            });
            if (existing)
                throw new Error('You already have a workspace with this name.');
        }

        return sequelize.transaction(async (transaction) => {
            if (data.rpcServer && data.networkId) {
                const explorer = await this.getExplorer({ transaction });
                if (explorer)
                    await explorer.update({ rpcServer: data.rpcServer, chainId: data.networkId }, { transaction });
            }
            return this.update(sanitize({
                name: data.name,
                statusPageEnabled: data.statusPageEnabled,
                chain: data.chain,
                rpcServer: data.rpcServer,
                networkId: data.networkId,
                tracing: data.advancedOptions && data.advancedOptions.tracing,
                defaultAccount: data.settings && data.settings.defaultAccount,
                gasLimit: data.settings && data.settings.gasLimit,
                gasPrice: data.settings && data.settings.gasPrice
            }), { transaction });
        });
    }

    safeDestroyBlocks(ids) {
        return sequelize.transaction(
            { deferrable: Sequelize.Deferrable.SET_DEFERRED },
            async transaction => {
                // Step 1: Get blocks (simple query, no joins)
                const blocks = await this.getBlocks({
                    where: { id: ids },
                    attributes: ['id']
                });

                // Step 2: Get transactions for these blocks (focused query with workspaceId filter)
                const blockIds = blocks.map(block => block.id);
                const transactions = blockIds.length > 0 ? await sequelize.query(
                    `SELECT id FROM transactions WHERE "blockId" IN (:blockIds) AND "workspaceId" = :workspaceId`,
                    {
                        replacements: { blockIds, workspaceId: this.id },
                        type: QueryTypes.SELECT
                    }
                ) : [];

                // Step 3: Get transaction trace steps
                const transactionIds = transactions.map(t => t.id);
                const traceSteps = transactionIds.length > 0 ? await sequelize.query(
                    `SELECT id FROM transaction_trace_steps WHERE "transactionId" IN (:transactionIds) AND "workspaceId" = :workspaceId`,
                    {
                        replacements: { transactionIds, workspaceId: this.id },
                        type: QueryTypes.SELECT
                    }
                ) : [];

                // Step 4: Get contracts created by these transactions
                const contracts = transactionIds.length > 0 ? await sequelize.query(
                    `SELECT id FROM contracts WHERE "transactionId" IN (:transactionIds) AND "workspaceId" = :workspaceId`,
                    {
                        replacements: { transactionIds, workspaceId: this.id },
                        type: QueryTypes.SELECT
                    }
                ) : [];

                // Step 5: Get transaction receipts
                const receipts = transactionIds.length > 0 ? await sequelize.query(
                    `SELECT id FROM transaction_receipts WHERE "transactionId" IN (:transactionIds) AND "workspaceId" = :workspaceId`,
                    {
                        replacements: { transactionIds, workspaceId: this.id },
                        type: QueryTypes.SELECT
                    }
                ) : [];

                // Step 6: Get transaction logs
                const receiptIds = receipts.map(r => r.id);
                const logs = receiptIds.length > 0 ? await sequelize.query(
                    `SELECT id FROM transaction_logs WHERE "transactionReceiptId" IN (:receiptIds) AND "workspaceId" = :workspaceId`,
                    {
                        replacements: { receiptIds, workspaceId: this.id },
                        type: QueryTypes.SELECT
                    }
                ) : [];

                const entities = {};

                // Store all entities from our focused queries
                entities.blocks = blocks;
                entities.transactions = transactions;
                entities.transaction_trace_steps = traceSteps;
                entities.contracts = contracts;
                entities.transaction_receipts = receipts;
                entities.transaction_logs = logs;
                // Get ALL token_transfers that reference the transactions we're deleting
                // Note: transactionIds already declared at line 3608
                if (transactionIds.length > 0) {
                    const allTokenTransfers = await sequelize.query(
                        `SELECT id FROM token_transfers WHERE "transactionId" IN (:transactionIds) AND "workspaceId" = :workspaceId`,
                        {
                            replacements: { transactionIds, workspaceId: this.id },
                            type: QueryTypes.SELECT
                        }
                    );
                    entities.token_transfers = allTokenTransfers;
                    
                    // Get ALL token_balance_changes that reference these token_transfers
                    const tokenTransferIds = entities.token_transfers.map(tt => tt.id);
                    if (tokenTransferIds.length > 0) {
                        const allTokenBalanceChanges = await sequelize.query(
                            `SELECT id FROM token_balance_changes WHERE "tokenTransferId" IN (:tokenTransferIds) AND "workspaceId" = :workspaceId`,
                            {
                                replacements: { tokenTransferIds, workspaceId: this.id },
                                type: QueryTypes.SELECT
                            }
                        );
                        entities.token_balance_changes = allTokenBalanceChanges;
                    } else {
                        entities.token_balance_changes = [];
                    }
                } else {
                    entities.token_transfers = [];
                    entities.token_balance_changes = [];
                }
                
                // Get v2_dex_pool_reserves that reference the transaction_logs
                const transactionLogIds = entities.transaction_logs.map(log => log.id);
                if (transactionLogIds.length > 0) {
                    const v2DexPoolReserves = await sequelize.query(
                        `SELECT "transactionLogId" FROM v2_dex_pool_reserves WHERE "transactionLogId" IN (:transactionLogIds)`,
                        {
                            replacements: { transactionLogIds },
                            type: QueryTypes.SELECT
                        }
                    );
                    entities.v2_dex_pool_reserves = v2DexPoolReserves;
                } else {
                    entities.v2_dex_pool_reserves = [];
                }

                // Update contracts to unlink from deleted transactions (using raw SQL since entities.contracts contains plain objects)
                if (entities.contracts.length > 0) {
                    await sequelize.query(
                        `UPDATE contracts SET "transactionId" = NULL WHERE "id" IN (:ids) AND "workspaceId" = :workspaceId`,
                        {
                            replacements: { ids: entities.contracts.map(c => c.id), workspaceId: this.id },
                            transaction
                        }
                    );
                }

                if (entities.blocks.length) {
                    await sequelize.query(`DELETE FROM block_events WHERE "blockId" IN (:ids) AND "workspaceId" = :workspaceId`, {
                        replacements: { ids: entities.blocks.map(row => row.id), workspaceId: this.id },
                        transaction
                    });
                }

                if (entities.transactions.length) {
                    await sequelize.query(`DELETE FROM transaction_events WHERE "transactionId" IN (:ids) AND "workspaceId" = :workspaceId`, {
                        replacements: { ids: entities.transactions.map(row => row.id), workspaceId: this.id },
                        transaction
                    });
                }

                if (entities.token_transfers.length) {
                    await sequelize.query(`DELETE FROM token_transfer_events WHERE "tokenTransferId" IN (:ids) AND "workspaceId" = :workspaceId`, {
                        replacements: { ids: entities.token_transfers.map(row => row.id), workspaceId: this.id },
                        transaction
                    });
                }

                if (entities.token_balance_changes.length) {
                    await sequelize.query(`DELETE FROM token_balance_change_events WHERE "tokenBalanceChangeId" IN (:ids) AND "workspaceId" = :workspaceId`, {
                        replacements: { ids: entities.token_balance_changes.map(row => row.id), workspaceId: this.id },
                        transaction
                    });
                }

                // Delete v2_dex_pool_reserves first (they reference transaction_logs)
                if (entities.v2_dex_pool_reserves.length) {
                    const transactionLogIds = entities.v2_dex_pool_reserves.map(reserve => reserve.transactionLogId);
                    await sequelize.query(`DELETE FROM v2_dex_pool_reserves WHERE "transactionLogId" IN (:transactionLogIds)`, {
                        replacements: { transactionLogIds },
                        transaction
                    });
                }

                // Delete in dependency order: child tables first, then parent tables
                // 1. token_balance_changes (references token_transfers)
                // 2. token_transfers (references transactions and transaction_logs)
                // 3. transaction_logs (references transaction_receipts)
                // 4. transaction_receipts (references transactions)
                // 5. transaction_trace_steps (references transactions)
                // 6. transactions (references blocks)
                // 7. blocks
                for (const table of ['token_balance_changes', 'token_transfers', 'transaction_logs', 'transaction_receipts', 'transaction_trace_steps', 'transactions', 'blocks']) {
                    if (entities[table].length) {
                        await sequelize.query(`DELETE FROM ${table} WHERE "id" IN (:ids) AND "workspaceId" = :workspaceId`, {
                            replacements: { ids: entities[table].map(row => row.id), workspaceId: this.id },
                            transaction
                        });
                    }
                }

                return;
            }
        );
    }

    safeDestroyContracts(ids) {
        return sequelize.transaction(
            { deferrable: Sequelize.Deferrable.SET_DEFERRED },
            async transaction => {
                const contracts = await this.getContracts({ where: { id: ids }, transaction });
                for (let i = 0; i < contracts.length; i++)
                    await contracts[i].safeDestroy(transaction);
                return;
            }
        );
    }

    async safeDestroyIntegrityCheck(transaction) {
        const integrityCheck = await this.getIntegrityCheck({ transaction });
        if (integrityCheck)
            await integrityCheck.destroy({ transaction });

        return this.update({ integrityCheckStartBlockNumber: null }, { transaction });
    }

    async safeDestroyRpcHealthCheck(transaction) {
        const rpcHealthCheck = await this.getRpcHealthCheck({ transaction });
        if (rpcHealthCheck)
            return rpcHealthCheck.destroy({ transaction });
    }

    async safeDestroyAccounts() {
        return sequelize.transaction(async transaction => {
            const accounts = await sequelize.models.Account.findAll();
            for (let i = 0; i < accounts.length; i++)
                await accounts[i].destroy({ transaction });
        });
    }

    async safeDestroyOrbitData(transaction) {
        await sequelize.models.OrbitBatch.destroy({
            where: { workspaceId: this.id },
            transaction
        });

        await sequelize.models.OrbitDeposit.destroy({
            where: { workspaceId: this.id },
            transaction
        });

        await sequelize.models.OrbitWithdrawal.destroy({
            where: { workspaceId: this.id },
            transaction
        });

        await sequelize.models.OrbitNode.destroy({
            where: { workspaceId: this.id },
            transaction
        });
    }

    async reset(dayInterval, transaction) {
        const filter = { where: { workspaceId: this.id }};
        if (dayInterval)
            filter['where']['createdAt'] = { [Op.lt]: sequelize.literal(`NOW() - interval '${dayInterval} day'`)};

        const destroyAll = async transaction => {
            await this.safeDestroyIntegrityCheck(transaction);
            await this.safeDestroyRpcHealthCheck(transaction);

            const contracts = await sequelize.models.Contract.findAll(filter);
            for (let i = 0; i < contracts.length; i++)
                await contracts[i].safeDestroy(transaction);

            const blocks = await sequelize.models.Block.findAll(filter);
            for (let i = 0; i < blocks.length; i++)
                await blocks[i].safeDestroy(transaction);

            const accounts = await sequelize.models.Account.findAll(filter);
            for (let i = 0; i < accounts.length; i++)
                await accounts[i].destroy({ transaction });

            await this.safeDestroyOrbitData(transaction);
        };

        return transaction ?
            destroyAll(transaction) :
            sequelize.transaction({ deferrable: Sequelize.Deferrable.SET_DEFERRED }, destroyAll);
    }

    async removeContractByAddress(address) {
        const contracts = await this.getContracts({ where: { address: address.toLowerCase() }});
        if (contracts.length)
            return contracts[0].destroy();
    }

    getUnprocessedContracts() {
        return this.getContracts({
            attributes: ['address', 'abi'],
            where: {
                processed: false
            }
        });
    }

    getFailedProcessableTransactions() {
        return this.getTransactions({
            attributes: ['hash', 'workspaceId', 'rawError', 'parsedError', 'to', 'data', 'blockNumber'],
            where: {
                [Op.and]: [
                    { parsedError: null },
                    { rawError: null },
                    { '$receipt.status$': false }
                ]
            },
            include: [
                {
                    model: sequelize.models.Workspace,
                    as: 'workspace',
                    attributes: ['id', 'public']
                },
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['status'],
                    as: 'receipt'
                }
            ]
        });
    }

    getProcessableTransactions() {
        const tokenTransferCount = `(
            SELECT COUNT(*)
            FROM "token_transfers"
            WHERE
                "token_transfers"."transactionId" = "Transaction"."id"
        )`;
        const tokenBalanceChangeCount = `(
            SELECT COUNT(*)
            FROM "token_balance_changes"
            WHERE
                "token_balance_changes"."transactionId" = "Transaction"."id"
        )`;

        return this.getTransactions({
            attributes: ['blockNumber', 'hash'],
            include: [
                {
                    model: sequelize.models.TokenTransfer,
                    attributes: ['id', 'src', 'dst', 'token'],
                    as: 'tokenTransfers'
                },
            ],
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.literal(tokenTransferCount), { [Op.gt]: 0 }
                    ),
                    sequelize.where(
                        sequelize.literal(tokenBalanceChangeCount), { [Op.eq]: 0 }
                    )
                ]
            },
        })
    }

    async safeCreateExplorer(transaction) {
        const creationFn = async transaction => {
            await this.update({
                storageEnabled: false,
                public: true,
                browserSyncEnabled: false,
                rpcHealthCheckEnabled: true,
                rateLimitInterval: 5000,
                rateLimitMaxInInterval: 25
            }, { transaction });

            const existingExplorer = await sequelize.models.Explorer.findOne({ where: { slug: slugify(this.name) }});
            const slug = existingExplorer ?
                `${slugify(this.name)}-${Math.floor(Math.random() * 100)}` :
                slugify(this.name);

            return this.createExplorer({
                userId: this.userId,
                chainId: this.networkId,
                name: this.name,
                rpcServer: this.rpcServer,
                slug: slug,
                themes: { "default": {}},
                domain: `${slug}.${process.env.APP_DOMAIN}`
            }, { transaction });
        }
        return transaction ? creationFn(transaction) : sequelize.transaction(creationFn);
    }

    /**
     * Returns the top tokens by holders for a workspace filtered by token patterns.
     * 
     * @param {number} page - The page number to return.
     * @param {number} itemsPerPage - The number of items per page to return.
     * @param {string[]} patterns - Array of patterns to filter by. Valid values: 'erc20', 'erc721', 'erc1155'
     * @returns {Promise<Array>} - A list of top tokens by holders.
     * @throws {Error} - If invalid patterns are provided
     */
    async getTopTokensByHolders(page = 1, itemsPerPage = 10, patterns = []) {
        const validPatterns = ['erc20', 'erc721', 'erc1155'];
        const invalidPatterns = patterns.filter(p => !validPatterns.includes(p));
        if (invalidPatterns.length > 0) {
            throw new Error(`Invalid patterns provided: ${invalidPatterns.join(', ')}. Valid patterns are: ${validPatterns.join(', ')}`);
        }

        return sequelize.query(`
            SELECT
                token,
                COUNT(DISTINCT token_balance_change_events."address") AS holders,
                c.name AS "contract.name",
                c."tokenSymbol" AS "contract.tokenSymbol",
                c."tokenName" AS "contract.tokenName",
                c."tokenTotalSupply" AS "contract.tokenTotalSupply",
                c.patterns AS "contract.patterns",
                c."workspaceId" AS "contract.workspaceId"
            FROM
                token_balance_change_events
            LEFT JOIN contracts c ON
                c.address = token_balance_change_events.token
                AND token_balance_change_events."workspaceId" = :workspaceId
            WHERE
                (array_length(ARRAY[:patterns]::text[], 1) IS NULL OR 
                EXISTS (
                    SELECT 1 
                    FROM unnest(c.patterns) pattern 
                    WHERE LOWER(pattern) = ANY(ARRAY(SELECT LOWER(p) FROM unnest(ARRAY[:patterns]::text[]) p))
                ))
                AND c."workspaceId" = :workspaceId
            GROUP BY token, c.name, c."tokenSymbol", c."tokenName", c."tokenTotalSupply", c.patterns, c."workspaceId"
            ORDER BY holders DESC
            LIMIT :itemsPerPage OFFSET :offset;
        `, {
            replacements: { 
                workspaceId: this.id, 
                itemsPerPage: itemsPerPage, 
                offset: (page - 1) * itemsPerPage,
                patterns: patterns
            },
            type: QueryTypes.SELECT,
            nest: true
        });
    }
  }

  Workspace.init({
    name: DataTypes.STRING,
    chain: DataTypes.STRING,
    networkId: DataTypes.STRING,
    public: DataTypes.BOOLEAN,
    rpcServer: DataTypes.STRING,
    defaultAccount: DataTypes.STRING,
    gasLimit: DataTypes.STRING,
    gasPrice: DataTypes.STRING,
    userId: DataTypes.INTEGER,
    tracing: DataTypes.STRING,
    alchemyIntegrationEnabled: DataTypes.BOOLEAN,
    isRemote: DataTypes.BOOLEAN,
    dataRetentionLimit: DataTypes.INTEGER,
    storageEnabled: DataTypes.BOOLEAN,
    erc721LoadingEnabled: DataTypes.BOOLEAN,
    browserSyncEnabled: DataTypes.BOOLEAN,
    rpcHealthCheckEnabled: DataTypes.BOOLEAN,
    statusPageEnabled: DataTypes.BOOLEAN,
    pendingDeletion: DataTypes.BOOLEAN,
    pollingInterval: DataTypes.INTEGER,
    emitMissedBlocks: DataTypes.BOOLEAN,
    skipFirstBlock: DataTypes.BOOLEAN,
    qnEndpointId: DataTypes.STRING,
    integrityCheckStartBlockNumber: {
      type: DataTypes.INTEGER,
      get() {
        const blockNumber = this.getDataValue('integrityCheckStartBlockNumber');
        return blockNumber !== null && blockNumber !== undefined ?
          Math.max(this.getDataValue('integrityCheckStartBlockNumber'), 0) :
          null;
      }
    },
    rateLimitInterval: DataTypes.INTEGER,
    rateLimitMaxInInterval: DataTypes.INTEGER,
    processNativeTokenTransfers: DataTypes.BOOLEAN,
    isTopL1Parent: DataTypes.BOOLEAN,
    isCustomL1Parent: DataTypes.BOOLEAN,
    deleteAfter: DataTypes.DATE
  }, {
    hooks: {
        afterCreate(workspace, options) {
            const afterCreateFn = () => {
                const analytics = new Analytics();
                analytics.track(workspace.userId, 'workspace:workspace_create');
                analytics.shutdown();
            }
            return options.transaction ? options.transaction.afterCommit(afterCreateFn) : afterCreateFn();
        }
    },
    sequelize,
    modelName: 'Workspace',
    tableName: 'workspaces'
  });
  return Workspace;
};