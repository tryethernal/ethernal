/**
 * @fileoverview Tests for the Etherscan-compatible SQL query builders and data access helpers (transaction/log lists, point queries, closest block lookup).
 */

require('../mocks/models');
require('../mocks/lib/env');
require('../mocks/lib/utils');
require('../mocks/lib/logger');
jest.mock('../../lib/redis', () => ({ get: jest.fn(), set: jest.fn() }));

const Sequelize = require('sequelize');
const models = require('../../models');
const queries = require('../../lib/etherscanQueries');
const db = require('../../lib/firebase');

describe('etherscanQueries', () => {
    const base = { workspaceId: 7, address: '0xabc', startBlock: 10, endBlock: 20, page: 3, offset: 50 };

    describe('buildTransactionListQuery', () => {
        it('Should be scoped to the workspace, bounded and never count', () => {
            const { sql, replacements } = queries.buildTransactionListQuery({ ...base, sort: 'asc' });

            expect(sql).toContain('"workspaceId" = :workspaceId');
            expect(sql).toContain('"from" = :address');
            expect(sql).toContain('"to" = :address');
            expect(sql).toContain('UNION');
            expect(sql).not.toMatch(/count\s*\(/i);
            expect(sql).toContain('LIMIT :window');
            expect(sql).toContain('LIMIT :limit OFFSET :skip');
            expect(replacements).toEqual({ workspaceId: 7, address: '0xabc', startBlock: 10, endBlock: 20, window: 150, limit: 50, skip: 100 });
        });

        it('Should order by block, transaction index then id, in the requested direction', () => {
            const asc = queries.buildTransactionListQuery({ ...base, sort: 'asc' }).sql;
            const desc = queries.buildTransactionListQuery({ ...base, sort: 'desc' }).sql;

            expect(asc).toContain('ORDER BY t."blockNumber" ASC, t."transactionIndex" ASC, t.id ASC');
            expect(desc).toContain('ORDER BY t."blockNumber" DESC, t."transactionIndex" DESC, t.id DESC');
            expect(desc).not.toContain(' ASC');
        });

        it('Should whitelist the sort direction', () => {
            const { sql } = queries.buildTransactionListQuery({ ...base, sort: 'desc; DROP TABLE transactions' });

            expect(sql).not.toContain('DROP');
            expect(sql).toContain('ORDER BY t."blockNumber" ASC');
        });
    });

    describe('buildLogListQuery', () => {
        it('Should be scoped to the workspace and the emitting address', () => {
            const { sql, replacements } = queries.buildLogListQuery({ workspaceId: 7, address: '0xabc', fromBlock: 1, toBlock: 2, topics: [], sort: 'desc', page: 1, offset: 10 });

            expect(sql).toContain('l."workspaceId" = :workspaceId AND l.address = :address');
            expect(sql).not.toMatch(/count\s*\(/i);
            expect(sql).toContain('ORDER BY l."blockNumber" DESC, l."transactionIndex" DESC, l."logIndex" DESC');
            expect(sql).not.toContain('topics[');
            expect(replacements).toEqual({ workspaceId: 7, address: '0xabc', fromBlock: 1, toBlock: 2, limit: 10, skip: 0 });
        });

        it('Should AND the topic filters on their array positions', () => {
            const topics = ['0xt0', null, '0xt2', '0xt3'];
            const { sql, replacements } = queries.buildLogListQuery({ workspaceId: 7, address: '0xabc', fromBlock: 1, toBlock: 2, topics, sort: 'asc', page: 2, offset: 10 });

            expect(sql).toContain('AND l.topics[1] = :topic0');
            expect(sql).not.toContain('l.topics[2]');
            expect(sql).toContain('AND l.topics[3] = :topic2');
            expect(sql).toContain('AND l.topics[4] = :topic3');
            expect(replacements).toMatchObject({ topic0: '0xt0', topic2: '0xt2', topic3: '0xt3', skip: 10 });
            expect(replacements).not.toHaveProperty('topic1');
        });
    });

    describe('point queries', () => {
        it('Should be scoped to the workspace', () => {
            [
                queries.buildTransactionStatusQuery(7, '0xhash'),
                queries.buildLatestBlockQuery(7),
                queries.buildFirstBlockQuery(7),
                queries.buildBlockAtOrAfterQuery(7, 5),
                queries.buildBlockBeforeQuery(7, 5)
            ].forEach(({ sql, replacements }) => {
                expect(sql).toMatch(/"workspaceId" = :workspaceId/);
                expect(sql).toMatch(/LIMIT 1/);
                expect(replacements.workspaceId).toBe(7);
            });
        });
    });
});

describe('getClosestBlockNumber', () => {
    /**
     * Emulates the block probes on an in-memory chain.
     * @param {Array<{number: number, timeStamp: number}>} blocks - Indexed blocks, sorted by number
     */
    const emulate = (blocks) => {
        models.sequelize.transaction = jest.fn(async (work) => work({ id: 'tx' }));
        models.sequelize.query = jest.fn(async (sql, { replacements }) => {
            if (sql.startsWith('SET LOCAL'))
                return [];
            const { number } = replacements;
            let rows;
            if (sql.includes('number >= :number'))
                rows = blocks.filter(b => b.number >= number).slice(0, 1);
            else if (sql.includes('number < :number'))
                rows = [...blocks].reverse().filter(b => b.number < number).slice(0, 1);
            else if (sql.includes('ORDER BY number ASC'))
                rows = blocks.slice(0, 1);
            else if (sql.includes('ORDER BY number DESC'))
                rows = blocks.slice(-1);
            else
                throw new Error(`Unexpected query: ${sql}`);
            return rows.map(b => ({ number: b.number, timeStamp: String(b.timeStamp) }));
        });
    };

    const bruteForce = (blocks, timestamp, closest) => {
        const found = closest === 'before'
            ? [...blocks].reverse().find(b => b.timeStamp <= timestamp)
            : blocks.find(b => b.timeStamp >= timestamp);
        return found ? found.number : null;
    };

    const check = async (blocks, timestamps) => {
        emulate(blocks);
        for (const timestamp of timestamps)
            for (const closest of ['before', 'after'])
                expect([timestamp, closest, await db.getClosestBlockNumber(7, timestamp, closest)]).toEqual([timestamp, closest, bruteForce(blocks, timestamp, closest)]);
    };

    it('Should match a brute force search on a regular chain', async () => {
        const blocks = Array.from({ length: 300 }, (_, i) => ({ number: i + 1, timeStamp: 1000 + i * 2 }));
        await check(blocks, [0, 999, 1000, 1001, 1002, 1003, 1200, 1597, 1598, 1599, 1600, 5000]);
    });

    it('Should match a brute force search with duplicate timestamps and gaps', async () => {
        const numbers = [5, 6, 7, 8, 20, 21, 22, 50, 51, 90, 91, 92, 93, 200];
        const blocks = numbers.map((number, i) => ({ number, timeStamp: 100 + Math.floor(i / 2) * 10 }));
        await check(blocks, [0, 99, 100, 101, 109, 110, 111, 130, 135, 160, 165, 169, 170, 171, 1000]);
    });

    it('Should handle a single block', async () => {
        await check([{ number: 42, timeStamp: 500 }], [0, 499, 500, 501]);
    });

    it('Should return null when no block is indexed', async () => {
        emulate([]);

        expect(await db.getClosestBlockNumber(7, 100, 'before')).toBeNull();
        expect(await db.getClosestBlockNumber(7, 100, 'after')).toBeNull();
    });

    it('Should use a logarithmic number of probes', async () => {
        const blocks = Array.from({ length: 100000 }, (_, i) => ({ number: i, timeStamp: i * 2 }));
        emulate(blocks);

        expect(await db.getClosestBlockNumber(7, 123457, 'before')).toBe(61728);
        expect(models.sequelize.query.mock.calls.length).toBeLessThan(25);
    });

    it('Should run the whole search in one transaction under one SET LOCAL statement_timeout', async () => {
        emulate(Array.from({ length: 1000 }, (_, i) => ({ number: i, timeStamp: i * 2 })));

        await db.getClosestBlockNumber(7, 777, 'before');

        expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
        const calls = models.sequelize.query.mock.calls;
        expect(calls[0][0]).toBe('SET LOCAL statement_timeout = 5000');
        expect(calls.filter(([sql]) => sql.startsWith('SET LOCAL'))).toHaveLength(1);
        expect(calls.length).toBeGreaterThan(5);
        calls.forEach(([, options]) => expect(options.transaction).toEqual({ id: 'tx' }));
    });

    it('Should raise a timeout error when a probe is cancelled by Postgres', async () => {
        emulate([{ number: 1, timeStamp: 1 }, { number: 2, timeStamp: 2 }]);
        const cancelled = Object.assign(new Error('canceling statement due to statement timeout'), { parent: { code: '57014' } });
        models.sequelize.query.mockImplementation(async (sql) => {
            if (sql.startsWith('SET LOCAL'))
                return [];
            throw cancelled;
        });

        await expect(db.getClosestBlockNumber(7, 1, 'before')).rejects.toBeInstanceOf(queries.EtherscanQueryTimeoutError);
    });

    it('Should stop the search once the time budget is spent', async () => {
        emulate(Array.from({ length: 1000 }, (_, i) => ({ number: i, timeStamp: i * 2 })));
        const now = jest.spyOn(Date, 'now');
        now.mockReturnValueOnce(0).mockReturnValue(6000);

        await expect(db.getClosestBlockNumber(7, 777, 'before')).rejects.toBeInstanceOf(queries.EtherscanQueryTimeoutError);

        now.mockRestore();
    });

    it('Should reject invalid parameters', async () => {
        await expect(db.getClosestBlockNumber(7, 1, 'near')).rejects.toThrow('Missing parameter');
        await expect(db.getClosestBlockNumber(null, 1, 'before')).rejects.toThrow('Missing parameter');
    });
});

describe('Etherscan data access', () => {
    beforeEach(() => {
        models.sequelize.transaction = jest.fn(async (work) => work({ id: 'tx' }));
        models.sequelize.query = jest.fn().mockResolvedValue([{ id: 1 }]);
    });

    it('Should issue SET LOCAL statement_timeout first, in the same transaction as the query', async () => {
        await db.getEtherscanLogs(7, { address: '0xabc', fromBlock: 0, toBlock: 9, topics: [], sort: 'asc', page: 1, offset: 10 });

        expect(models.sequelize.transaction).toHaveBeenCalledTimes(1);
        const [setLocal, query] = models.sequelize.query.mock.calls;
        expect(setLocal[0]).toBe('SET LOCAL statement_timeout = 5000');
        expect(setLocal[1].transaction).toEqual({ id: 'tx' });
        expect(query[0]).toContain('FROM transaction_logs');
        expect(query[1].transaction).toEqual({ id: 'tx' });
    });

    it.each([
        ['txlist', () => db.getEtherscanTransactions(7, { address: '0xabc', startBlock: 0, endBlock: 9, sort: 'asc', page: 1, offset: 10 })],
        ['status', () => db.getEtherscanTransactionStatus(7, '0xhash')],
        ['latest block', () => db.getLatestIndexedBlock(7)]
    ])('Should bound the %s query with the statement timeout', async (_name, run) => {
        await run();

        expect(models.sequelize.query.mock.calls[0][0]).toBe('SET LOCAL statement_timeout = 5000');
        expect(models.sequelize.query.mock.calls[1][1].transaction).toEqual({ id: 'tx' });
    });

    it('Should turn a Postgres statement timeout (57014) into a dedicated error', async () => {
        models.sequelize.query.mockResolvedValueOnce([]).mockRejectedValueOnce(Object.assign(new Error('canceling statement due to statement timeout'), { parent: { code: '57014' } }));

        await expect(db.getEtherscanLogs(7, { address: '0xabc', fromBlock: 0, toBlock: 9, topics: [], sort: 'asc', page: 1, offset: 10 }))
            .rejects.toBeInstanceOf(queries.EtherscanQueryTimeoutError);
    });

    it('Should rethrow other database errors untouched', async () => {
        const failure = Object.assign(new Error('boom'), { parent: { code: '23505' } });
        models.sequelize.query.mockResolvedValueOnce([]).mockRejectedValueOnce(failure);

        await expect(db.getEtherscanTransactionStatus(7, '0xhash')).rejects.toBe(failure);
    });

    it('Should run read-only SELECT queries with the named replacements, dropping undefined ones', async () => {
        await db.getEtherscanTransactions(7, { address: '0xabc', startBlock: 0, endBlock: 9, sort: 'asc', page: 1, offset: 10, unused: undefined });

        const [sql, options] = models.sequelize.query.mock.calls[1];
        expect(sql).toContain('FROM transactions');
        expect(options.type).toBe(Sequelize.QueryTypes.SELECT);
        expect(Object.values(options.replacements)).not.toContain(undefined);
        expect(options.replacements.workspaceId).toBe(7);
    });

    it('Should return the first row of the status and latest block lookups', async () => {
        models.sequelize.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 4, status: true }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        expect(await db.getEtherscanTransactionStatus(7, '0xhash')).toEqual({ id: 4, status: true });
        expect(await db.getLatestIndexedBlock(7)).toBeNull();
    });

    it('Should require a workspace and an address', () => {
        expect(() => db.getEtherscanTransactions(null, { address: '0xabc' })).toThrow('Missing parameter');
        expect(() => db.getEtherscanLogs(7, {})).toThrow('Missing parameter');
    });
});
