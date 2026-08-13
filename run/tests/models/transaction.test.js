/**
 * @fileoverview Tests for the Transaction model's int4 coercion.
 *
 * These fields are typed as PostgreSQL `integer` but are filled straight from
 * the RPC payload, which does not bound them. A single out-of-range value used
 * to abort the insert of every transaction in the block, so the block was never
 * stored and its sync job retried until it aged out of view.
 *
 * The model is built against an unconnected Sequelize instance: Sequelize does
 * not open a connection until a query runs, and `build`/`bulkBuild` only apply
 * setters in memory.
 */

jest.mock('../../lib/pusher');
jest.mock('../../lib/logger');

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('postgres://user:password@localhost:5432/database', { logging: false });
const Transaction = require('../../models/transaction')(sequelize, DataTypes);

// Epoch milliseconds, observed as a nonce in production
const TIMESTAMP_NONCE = '0x19ffbdebc88';
// A 32 byte value, as Arbitrum-style chains report requestId
const HASH_REQUEST_ID = `0x${'ab'.repeat(32)}`;

describe('Transaction int4 fields', () => {
    it('Should keep values that fit', () => {
        const transaction = Transaction.build({
            nonce: '0x2a',
            requestId: '0x1',
            chainId: '0x2',
            type: '0x0',
            transactionIndex: '0x3'
        });

        expect(transaction.nonce).toEqual(42);
        expect(transaction.requestId).toEqual(1);
        expect(transaction.chainId).toEqual(2);
        expect(transaction.type).toEqual(0);
        expect(transaction.transactionIndex).toEqual(3);
    });

    it('Should null a nonce the column cannot hold', () => {
        expect(Transaction.build({ nonce: TIMESTAMP_NONCE }).nonce).toBeNull();
    });

    it('Should null a requestId the column cannot hold', () => {
        expect(Transaction.build({ requestId: HASH_REQUEST_ID }).requestId).toBeNull();
    });

    it('Should null the remaining chain-supplied int4 fields when out of range', () => {
        const transaction = Transaction.build({
            chainId: TIMESTAMP_NONCE,
            type: TIMESTAMP_NONCE,
            transactionIndex: TIMESTAMP_NONCE
        });

        expect(transaction.chainId).toBeNull();
        expect(transaction.type).toBeNull();
        expect(transaction.transactionIndex).toBeNull();
    });

    it('Should not confuse a zero value with an absent one', () => {
        const transaction = Transaction.build({ nonce: '0x0', type: 0, transactionIndex: 0 });

        expect(transaction.nonce).toEqual(0);
        expect(transaction.type).toEqual(0);
        expect(transaction.transactionIndex).toEqual(0);
    });

    it('Should keep the rest of the transaction intact when one field overflows', () => {
        const transaction = Transaction.build({
            hash: '0xAbC',
            blockNumber: 24746942,
            nonce: TIMESTAMP_NONCE
        });

        expect(transaction.nonce).toBeNull();
        expect(transaction.hash).toEqual('0xAbC');
        expect(transaction.blockNumber).toEqual(24746942);
    });

    it('Should coerce through the bulk path, which is how blocks are stored', () => {
        const [good, bad] = Transaction.bulkBuild([
            { hash: '0x1', nonce: '0x2a' },
            { hash: '0x2', nonce: TIMESTAMP_NONCE }
        ]);

        expect(good.nonce).toEqual(42);
        expect(bad.nonce).toBeNull();
    });
});
