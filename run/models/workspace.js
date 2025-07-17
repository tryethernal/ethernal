'use strict';
const {
  Model,
  Sequelize,
  QueryTypes,
} = require('sequelize');
const { defineChain, createPublicClient, http, webSocket } = require('viem');
const moment = require('moment');
const { sanitize, slugify, processRawRpcObject } = require('../lib/utils');
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
    }

    static findPublicWorkspaceById(id) {
        return Workspace.findOne({
            where: {
                public: true,
                id: id
            }
        });
    }

    static findByUserIdAndName(userId, name) {
        return Workspace.findOne({
            where: {
                userId: userId,
                name: name
            }
        });
    }

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
            http(new URL(this.rpcServer).origin + new URL(this.rpcServer).pathname, { fetchOptions: fetchOptions() }) :
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

    getProvider() {
        return new ProviderConnector(this.rpcServer);
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
            type: QueryTypes.SELECT,
            logging: console.log
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

    /*
        Returns the number of token transfers for an address in a given time range.

        @param {string} address (mandatory) - The address to get the token transfer history for
        @param {string} from (mandatory) - The start date
        @param {string} to (mandatory) - The end date
        @returns {Array} - The number of token transfers for the address in the given time range
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

    /*
        Returns the amount of transaction fees spent by an address in a given time range.

        @param {string} address (mandatory) - The address to get the transaction fees for
        @param {string} from (mandatory) - The start date
        @param {string} to (mandatory) - The end date
        @returns {Array} - The amount of transaction fees spent by the address in the given time range
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

    /*
        Returns the number of transactions for an address in a given time range.

        @param {string} address (mandatory) - The address to get the number of transactions for
        @param {string} from (mandatory) - The start date
        @param {string} to (mandatory) - The end date
        @returns {Array} - The number of transactions for the address in the given time range
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

    /*
        Returns the number of transaction steps for an address.

        Based off of getAddressTransactionTraceSteps.
        Probably can be optimized, but performances are still really good now.

        @param {string} address (mandatory) - The address to get the number of transaction steps for
        @returns {number} - The number of transaction steps for the address
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

    /*
        Returns internal transactions involving an address.
        On top of the transaction_trace_steps rows, it also returns a relation_type column, which can be:
            - 'self': The step is the address itself
            - 'parent': A step that called the address
            - 'child': A step that was called by the address
        It also returns a parent_step_id column, which is the id of the parent step.
        When parent_step_id is null, it means the contract "to" address called this step,
        otherwise the step 

        @param {string} address (mandatory) - The address to get the internal transactions for
        @param {number} page (optional, default: 1) - The page number
        @param {number} itemsPerPage (optional, default: 50) - The number of items per page
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

    /*
        This method is used to get the total gas used for the last 24 hours for a workspace.

        @returns {number} - The total gas used for the last 24 hours
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

    /*
        This method is used to get the gas utilization ratio for the last 24 hours for a workspace.

        @returns {number} - The gas utilization ratio for the last 24 hours
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

    /*
        This method is used to get the average transaction fee for the last 24 hours for a workspace.

        @returns {number} - The average transaction fee for the last 24 hours
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

    /*
        This method is used to get the total transaction fees for the last 24 hours for a workspace.

        @returns {number} - The total transaction fees for the last 24 hours
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

    /*
        This method is used to get the total transaction fees daily for a workspace.

        @param {string} from - Start day
        @param {string} to - End day
        @returns {array} - The transaction fees
            - day: The day of the transaction fees
            - transactionFees: The average transaction fees for the day
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

    /*
        This method is used to replace a workspace with a new empty one.
        We use this when we want to reset an explorer.
        Waiting for the data to be deleted can take a long time,
        so we replace the workspace with a new one, and delete the old one in the background.
        We make sure the workspace has been marked for deletion first, in order to avoid
        accidental deletions.

        @returns {object} - The duplicated (new) workspace
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
                rateLimitMaxInInterval: this.rateLimitMaxInInterval
            }, { transaction });

            if (explorer)
                await explorer.update({ workspaceId: duplicatedWorkspace.id }, { transaction });

            if (user.currentWorkspaceId == this.id)
                await user.update({ currentWorkspaceId: duplicatedWorkspace.id }, { transaction });

            const newName = `Pending deletion - (Previously ${this.name} - #${this.id})`;
            await this.update({ name: newName }, { transaction });

            return duplicatedWorkspace;
        });
    }

    /*
        This method is used to get the block size history for a workspace.

        @param {string} from - The start date of the block size history
        @param {string} to - The end date of the block size history
        @returns {array} - The block size history
            - day: The day of the block size history
            - size: The average block size for the day
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

    /*
        This method is used to get the block time history for a workspace.

        @param {string} from - The start date of the block time history
        @param {string} to - The end date of the block time history
        @returns {array} - The block time history
            - day: The day of the block time history
            - blockTime: The average block time for the day
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

    /*
        This method is used to get the latest biggest gas spenders for a workspace
        for a given interval (now - intervalInHours).

        @param {number} intervalInHours - The interval in hours to get the gas spenders for
        @param {number} limit - The limit of gas spenders to return
        @returns {array} - The gas spenders
            - from: The address of the gas spender
            - gasUsed: The total gas used by the gas spender
            - gasCost: Cost of total gas used
            - percentUsed: The percentage of total gas used by the gas spender
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

    /*
        This method is used to get the latest biggest gas consumers for a workspace
        for a given interval (now - intervalInHours).

        @param {number} intervalInHours - The interval in hours to get the gas consumers for
        @param {number} limit - The limit of gas consumers to return
        @returns {array} - The gas consumers
            - to: The address of the gas consumer
            - gasUsed: The total gas used by the gas consumer
            - gasCost: Cost of total gas used
            - percentUsed: The percentage of total gas used by the gas consumer
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

    /*
        This method is used to get the gas utilization ratio history for a workspace.

        @param {string} from - The start date of the gas utilization ratio history
        @param {string} to - The end date of the gas utilization ratio history
        @returns {array} - The gas utilization ratio history
            - day: The day of the gas utilization ratio history
            - gasUtilizationRatio: The average gas utilization ratio for the day
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

    /*
        This method is used to get the gas limit history for a workspace.

        @param {string} from - The start date of the gas limit history
        @param {string} to - The end date of the gas limit history
        @returns {array} - The gas limit history
            - day: The day of the gas limit history
            - gasLimit: The average gas limit for the day
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

    /*
        This method is used to get the gas price history for a workspace.

        @param {string} from - The start date of the gas price history
        @param {string} to - The end date of the gas price history
        @returns {array} - The gas price history
            - day: The day of the gas price history
            - minSlow: The minimum slow gas price
            - slow: The average slow gas price
            - maxSlow: The maximum slow gas price
            - minAverage: The minimum average gas price
            - average: The average average gas price
            - maxAverage: The maximum average gas price
            - minFast: The minimum fast gas price
            - fast: The average fast gas price
            - maxFast: The maximum fast gas price
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

    /*
        This method is used to get the latest gas stats for a workspace.

        @param {number} intervalInMinutes - The interval in minutes to get the gas stats for
        @returns {object} - The gas stats object
            - averageBlockSize: The average block size in transactions
            - averageUtilization: The average quantity of gas used per block
            - averageBlockTime: The average block time in seconds
            - latestBlockNumber: The number of the latest block used for this calculation
            - baseFeePerGas: The base fee per gas for the latest block
            - priorityFeePerGas: The three levels of priority fee per gas for the latest block (slow, average, fast)
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
            const user = await this.getUser();
            if (user.currentWorkspaceId == this.id) {
                const workspaces = (await user.getWorkspaces()).filter(w => w.id != this.id);
                const currentWorkspaceId = workspaces.length ? workspaces[0].id : null;
                await user.update({ currentWorkspaceId });
            }
            await this.reset(null, transaction);
            await sequelize.models.CustomField.destroy({ where: { workspaceId: this.id }}, { transaction });
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

        const rpcHealthCheck = await this.getRpcHealthCheck();

        if (rpcHealthCheck) {
            // This is necessary otherwise Sequelize won't update the value with no other changes
            rpcHealthCheck.changed('updatedAt', true);

            // If rpc is reachable we reset failed attempts as well
            const fields = isReachable ? { isReachable, failedAttempts: 0, updatedAt: new Date() } : { isReachable, updatedAt: new Date() }
            return rpcHealthCheck.update(fields);
        }
        else
            return this.createRpcHealthCheck({ isReachable });
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
            ]
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
            AND ("src" = :address OR "dst" = :address)`;

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
        let query = `
            SELECT COUNT(1) AS count
            FROM transaction_events
            WHERE "workspaceId" = :workspaceId
            AND timestamp >= timestamp :since
        `;

        if (!since) {
            const [earliestBlock] = await this.getBlocks({
                attributes: ['timestamp'],
                where: {
                    timestamp: { [Op.gt]: new Date(0) }
                },
                order: [['number', 'ASC']],
                limit: 1
            });
            since = earliestBlock ? new Date(earliestBlock.timestamp) : new Date(0);
        }

        const [{ count },] = await sequelize.query(query, {
            replacements: {
                workspaceId: this.id,
                since
            },
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

    getFilteredAccounts(page = 1, itemsPerPage = 10, orderBy = 'address', order = 'DESC') {
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
        return this.getBlocks({
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
        const where = address ? { [Op.or]: [{ to: address.toLowerCase() }, { from: address.toLowerCase() }] } : {};
        return this.getTransactions({
            where: where,
            offset: (page - 1) * itemsPerPage,
            limit: itemsPerPage,
            order: [[orderBy, order]],
            attributes: ['blockNumber', 'from', 'gasPrice', 'hash', 'methodDetails', 'data', 'timestamp', 'to', 'value', 'workspaceId', 'state'],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'gasUsed', 'cumulativeGasUsed', [sequelize.json('raw.effectiveGasPrice'), 'effectiveGasPrice']],
                    as: 'receipt'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi', 'name', 'tokenName', 'tokenSymbol'],
                    as: 'contract',
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
                        gasPrice: processed.gasPrice,
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
                            raw: block.raw,
                        })
                    ],
                    {
                        ignoreDuplicates: true,
                        returning: true,
                        transaction: sequelizeTransaction
                    }
                );

                if (!createdBlock.id)
                    return null;

                const transactionsToInsert = transactions.map(t => {
                    return {
                        ...t,
                        blockId: createdBlock.id
                    }
                });

                const storedTransactions = await sequelize.models.Transaction.bulkCreate(transactionsToInsert, {
                    ignoreDuplicates: true,
                    returning: true,
                    transaction: sequelizeTransaction
                });

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

                    const explorer = await this.getExplorer();
                    if (explorer) {
                        const stripeSubscription = await explorer.getStripeSubscription();
                        if (stripeSubscription)
                            await stripeSubscription.increment('transactionQuota', { transaction: sequelizeTransaction });
                    }
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
                gasPrice: transaction.gasPrice,
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
                        logger.error(error.message, { location: 'models.workspaces.safeCreateTransaction', error: error, transaction: transaction });
                        await storedReceipt.createLog(sanitize({
                            workspaceId: storedTx.workspaceId,
                            raw: log
                        }), { transaction: sequelizeTransaction });
                    }
                }
            }

            return storedTx;
        });
    }

    async safeCreateOrUpdateContract(contract, transaction) {
        const contracts = await this.getContracts({ where: { address: contract.address.toLowerCase() }});
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
        const explorer = await this.getExplorer({
            include: {
                model: sequelize.models.StripeSubscription,
                as: 'stripeSubscription',
                include: 'stripePlan'
            }
        });

        if (explorer && await explorer.canUseCapability('l1Explorer')) {
            blockAttributes.push('l1BlockNumber')
        };

        const transactions = await this.getTransactions({
            where: {
                hash: hash
            },
            attributes: ['id', 'blockNumber', 'data', 'parsedError', 'rawError', 'from', 'formattedBalanceChanges', 'gasLimit', 'gasPrice', 'hash', 'timestamp', 'to', 'value', 'storage', 'workspaceId', 'raw', 'state', 'transactionIndex', 'nonce', 'type',
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
            ],
            include: [
                {
                    model: sequelize.models.TransactionReceipt,
                    attributes: ['gasUsed', 'status', 'contractAddress', [sequelize.json('raw.root'), 'root'], 'cumulativeGasUsed', 'raw', [sequelize.json('raw.effectiveGasPrice'), 'effectiveGasPrice'],
                        [Sequelize.literal(`
                            (SELECT COUNT(*)
                            FROM transaction_logs
                            WHERE transaction_logs."transactionReceiptId" = "receipt".id)::int
                        `), 'logCount']
                    ],
                    as: 'receipt'
                },
                {
                    model: sequelize.models.Block,
                    attributes: blockAttributes,
                    as: 'block'
                },
                {
                    model: sequelize.models.Contract,
                    attributes: ['abi', 'address', 'name', 'tokenDecimals', 'tokenName', 'tokenSymbol', 'workspaceId', 'patterns'],
                    as: 'contract'
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
                const explorer = await this.getExplorer();
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
                const blocks = await this.getBlocks({
                    where: { id: ids },
                    attributes: ['id'],
                    include: [
                        {
                            model: sequelize.models.Transaction,
                            attributes: ['id'],
                            as: 'transactions',
                            include: [
                                {
                                    model: sequelize.models.TransactionEvent,
                                    as: 'event'
                                },
                                {
                                    model: sequelize.models.TransactionTraceStep,
                                    attributes: ['id'],
                                    as: 'traceSteps',
                                },
                                {
                                    model: sequelize.models.Contract,
                                    as: 'createdContract',
                                },
                                {
                                    model: sequelize.models.TransactionReceipt,
                                    attributes: ['id'],
                                    as: 'receipt',
                                    include: {
                                        model: sequelize.models.TransactionLog,
                                        attributes: ['id'],
                                        as: 'logs',
                                        include: {
                                            model: sequelize.models.TokenTransfer,
                                            attributes: ['id'],
                                            as: 'tokenTransfer',
                                            include: {
                                                model: sequelize.models.TokenBalanceChange,
                                                attributes: ['id'],
                                                as: 'tokenBalanceChanges'
                                            }
                                        }
                                    }
                                },
                            ]
                        }
                    ]
                });

                const entities = {};

                entities.blocks = blocks;
                entities.transactions = blocks.flatMap(block => block.transactions);
                entities.transaction_trace_steps = entities.transactions.flatMap(transaction => transaction.traceSteps).filter(traceStep => !!traceStep);
                entities.contracts = entities.transactions.flatMap(transaction => transaction.createdContract).filter(contract => !!contract);
                entities.transaction_receipts = entities.transactions.flatMap(transaction => transaction.receipt).filter(receipt => !!receipt && !!receipt.logs);
                entities.transaction_logs = entities.transaction_receipts.flatMap(receipt => receipt.logs).filter(log => !!log);
                entities.token_transfers = entities.transaction_logs.flatMap(log => log.tokenTransfer).filter(tokenTransfer => !!tokenTransfer);
                entities.token_balance_changes = entities.token_transfers.flatMap(tokenTransfer => tokenTransfer.tokenBalanceChanges).filter(tokenBalanceChange => !!tokenBalanceChange);

                for (const contract of entities.contracts)
                    await contract.update({ transactionId: null }, { transaction });

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
                const contracts = await this.getContracts({ where: { id: ids }});
                for (let i = 0; i < contracts.length; i++)
                    await contracts[i].safeDestroy(transaction);
                return;
            }
        );
    }

    async safeDestroyIntegrityCheck(transaction) {
        const integrityCheck = await this.getIntegrityCheck();
        if (integrityCheck)
            await integrityCheck.destroy(transaction);

        return this.update({ integrityCheckStartBlockNumber: null }, { transaction });
    }

    async safeDestroyRpcHealthCheck(transaction) {
        const rpcHealthCheck = await this.getRpcHealthCheck();
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
    rateLimitMaxInInterval: DataTypes.INTEGER
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