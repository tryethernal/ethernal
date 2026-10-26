/**
 * @fileoverview SQL builders for the Etherscan-compatible endpoints.
 * Every query is bounded (no COUNT), leads its workspace-scoped access with `workspaceId`
 * (or an address index that also constrains `workspaceId`), and uses a stable ordering.
 * Builders are pure: they return `{ sql, replacements }` for `sequelize.query`.
 * @module lib/etherscanQueries
 */

/**
 * Raised when Postgres cancels an Etherscan query because it exceeded the statement timeout.
 */
class EtherscanQueryTimeoutError extends Error {
    /**
     * @param {Error} [cause] - The original database error
     */
    constructor(cause) {
        super('Query timed out');
        this.name = 'EtherscanQueryTimeoutError';
        this.cause = cause;
    }
}

/**
 * Converts a sort value to a SQL direction (whitelist).
 * @param {string} sort - 'asc' or 'desc'
 * @returns {string} 'ASC' or 'DESC'
 */
const direction = (sort) => sort === 'desc' ? 'DESC' : 'ASC';

/**
 * Builds the query listing the transactions sent from or to an address.
 * @param {Object} p - Parameters
 * @param {number} p.workspaceId - Workspace id
 * @param {string} p.address - Lowercase address
 * @param {number} p.startBlock - First block (inclusive)
 * @param {number} p.endBlock - Last block (inclusive)
 * @param {string} p.sort - 'asc' or 'desc'
 * @param {number} p.page - 1-based page
 * @param {number} p.offset - Page size
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildTransactionListQuery = ({ workspaceId, address, startBlock, endBlock, sort, page, offset }) => {
    const dir = direction(sort);
    const branch = (column) => `(SELECT id, "blockNumber", "transactionIndex" FROM transactions
            WHERE "workspaceId" = :workspaceId AND "${column}" = :address AND "blockNumber" >= :startBlock AND "blockNumber" <= :endBlock
            ORDER BY "blockNumber" ${dir}, "transactionIndex" ${dir}, id ${dir} LIMIT :window)`;

    return {
        sql: `WITH page AS (
            SELECT u.id, u."blockNumber", u."transactionIndex" FROM (
                ${branch('from')}
                UNION
                ${branch('to')}
            ) u
            ORDER BY u."blockNumber" ${dir}, u."transactionIndex" ${dir}, u.id ${dir}
            LIMIT :limit OFFSET :skip
        )
        SELECT t.hash, t."blockNumber", EXTRACT(EPOCH FROM t.timestamp)::bigint AS "timeStamp", t.nonce, t."blockHash", t."transactionIndex",
            t."from", t."to", t.value, t."gasLimit" AS gas, t."gasPrice", t.data AS input, t."methodSignature",
            r.id AS "receiptId", r.status, r."contractAddress", r."cumulativeGasUsed", r."gasUsed"
        FROM page p
        JOIN transactions t ON t."workspaceId" = :workspaceId AND t.id = p.id
        LEFT JOIN transaction_receipts r ON r."transactionId" = t.id
        ORDER BY t."blockNumber" ${dir}, t."transactionIndex" ${dir}, t.id ${dir}`,
        replacements: { workspaceId, address, startBlock, endBlock, window: page * offset, limit: offset, skip: (page - 1) * offset }
    };
};

/**
 * Builds the query listing the logs emitted by a contract in a block range.
 * @param {Object} p - Parameters
 * @param {number} p.workspaceId - Workspace id
 * @param {string} p.address - Lowercase emitting address
 * @param {number} p.fromBlock - First block (inclusive)
 * @param {number} p.toBlock - Last block (inclusive)
 * @param {Array<string|null>} p.topics - Lowercase topics 0..3 (null = unconstrained)
 * @param {string} p.sort - 'asc' or 'desc'
 * @param {number} p.page - 1-based page
 * @param {number} p.offset - Page size
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildLogListQuery = ({ workspaceId, address, fromBlock, toBlock, topics, sort, page, offset }) => {
    const dir = direction(sort);
    const replacements = { workspaceId, address, fromBlock, toBlock, limit: offset, skip: (page - 1) * offset };
    const topicConditions = [];
    (topics || []).forEach((topic, index) => {
        if (topic) {
            replacements[`topic${index}`] = topic;
            topicConditions.push(`AND l.topics[${index + 1}] = :topic${index}`);
        }
    });

    return {
        sql: `WITH page AS (
            SELECT l.id, l."blockNumber", l."transactionIndex", l."logIndex"
            FROM transaction_logs l
            WHERE l."workspaceId" = :workspaceId AND l.address = :address AND l."blockNumber" >= :fromBlock AND l."blockNumber" <= :toBlock
                ${topicConditions.join(' ')}
            ORDER BY l."blockNumber" ${dir}, l."transactionIndex" ${dir}, l."logIndex" ${dir}
            LIMIT :limit OFFSET :skip
        )
        SELECT l.address, l.topics, l.data, l."blockNumber", l."logIndex", l."transactionHash", l."transactionIndex",
            EXTRACT(EPOCH FROM t.timestamp)::bigint AS "timeStamp", t."gasPrice", r."gasUsed"
        FROM page p
        JOIN transaction_logs l ON l."workspaceId" = :workspaceId AND l.id = p.id
        LEFT JOIN transactions t ON t."workspaceId" = :workspaceId AND t.hash = l."transactionHash"
        LEFT JOIN transaction_receipts r ON r."transactionId" = t.id
        ORDER BY l."blockNumber" ${dir}, l."transactionIndex" ${dir}, l."logIndex" ${dir}`,
        replacements
    };
};

/**
 * Builds the query returning the receipt status and stored error of a transaction.
 * @param {number} workspaceId - Workspace id
 * @param {string} hash - Lowercase transaction hash
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildTransactionStatusQuery = (workspaceId, hash) => ({
    sql: `SELECT t.id, t."parsedError", r.id AS "receiptId", r.status
        FROM transactions t
        LEFT JOIN transaction_receipts r ON r."transactionId" = t.id
        WHERE t."workspaceId" = :workspaceId AND t.hash = :hash
        LIMIT 1`,
    replacements: { workspaceId, hash }
});

/**
 * Builds the query returning the latest indexed block.
 * @param {number} workspaceId - Workspace id
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildLatestBlockQuery = (workspaceId) => ({
    sql: `SELECT number, EXTRACT(EPOCH FROM timestamp)::bigint AS "timeStamp"
        FROM blocks
        WHERE "workspaceId" = :workspaceId AND state = 'ready'
        ORDER BY number DESC LIMIT 1`,
    replacements: { workspaceId }
});

/**
 * Builds the query returning the lowest indexed block.
 * @param {number} workspaceId - Workspace id
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildFirstBlockQuery = (workspaceId) => ({
    sql: `SELECT number, EXTRACT(EPOCH FROM timestamp)::bigint AS "timeStamp"
        FROM blocks
        WHERE "workspaceId" = :workspaceId AND state = 'ready'
        ORDER BY number ASC LIMIT 1`,
    replacements: { workspaceId }
});

/**
 * Builds the point query used by the binary search on block timestamps:
 * the first indexed block whose number is >= the given number.
 * @param {number} workspaceId - Workspace id
 * @param {number} number - Block number lower bound
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildBlockAtOrAfterQuery = (workspaceId, number) => ({
    sql: `SELECT number, EXTRACT(EPOCH FROM timestamp)::bigint AS "timeStamp"
        FROM blocks
        WHERE "workspaceId" = :workspaceId AND state = 'ready' AND number >= :number
        ORDER BY number ASC LIMIT 1`,
    replacements: { workspaceId, number }
});

/**
 * Builds the query returning the last indexed block strictly before a block number.
 * @param {number} workspaceId - Workspace id
 * @param {number} number - Block number upper bound (exclusive)
 * @returns {{sql: string, replacements: Object}} Query
 */
const buildBlockBeforeQuery = (workspaceId, number) => ({
    sql: `SELECT number, EXTRACT(EPOCH FROM timestamp)::bigint AS "timeStamp"
        FROM blocks
        WHERE "workspaceId" = :workspaceId AND state = 'ready' AND number < :number
        ORDER BY number DESC LIMIT 1`,
    replacements: { workspaceId, number }
});

module.exports = {
    EtherscanQueryTimeoutError,
    buildTransactionListQuery,
    buildLogListQuery,
    buildTransactionStatusQuery,
    buildLatestBlockQuery,
    buildFirstBlockQuery,
    buildBlockAtOrAfterQuery,
    buildBlockBeforeQuery
};
