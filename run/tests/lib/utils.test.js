/* global BigInt */
const ethers = require('ethers');
const {
    sanitize,
    stringifyBns,
    isJson,
    validateBNString,
    avg,
    toInt32OrNull,
    preserveUnstorableInts,
    afterRootCommit,
    isDataUri,
    decodeJsonDataUri
} = require('../../lib/utils');

describe('toInt32OrNull', () => {
    it('Should parse hex strings', () => {
        expect(toInt32OrNull('0x2a')).toEqual(42);
        expect(toInt32OrNull('0X2A')).toEqual(42);
    });

    it('Should parse decimal strings and numbers', () => {
        expect(toInt32OrNull('42')).toEqual(42);
        expect(toInt32OrNull(42)).toEqual(42);
    });

    it('Should preserve zero rather than treating it as absent', () => {
        expect(toInt32OrNull(0)).toEqual(0);
        expect(toInt32OrNull('0x0')).toEqual(0);
    });

    it('Should accept the int4 boundaries', () => {
        expect(toInt32OrNull(2147483647)).toEqual(2147483647);
        expect(toInt32OrNull(-2147483648)).toEqual(-2147483648);
    });

    it('Should return null just past the int4 boundaries', () => {
        expect(toInt32OrNull(2147483648)).toBeNull();
        expect(toInt32OrNull(-2147483649)).toBeNull();
    });

    it('Should return null for a timestamp-style nonce', () => {
        // Observed in production: a chain using epoch milliseconds as the nonce
        expect(toInt32OrNull('0x19ffbdebc88')).toBeNull();
        expect(toInt32OrNull(1786637106312)).toBeNull();
    });

    it('Should return null for a 32 byte value', () => {
        expect(toInt32OrNull(`0x${'ab'.repeat(32)}`)).toBeNull();
    });

    it('Should return null for absent values', () => {
        expect(toInt32OrNull(null)).toBeNull();
        expect(toInt32OrNull(undefined)).toBeNull();
        expect(toInt32OrNull('')).toBeNull();
    });

    it('Should return null for values that are not integers', () => {
        expect(toInt32OrNull('not a number')).toBeNull();
        expect(toInt32OrNull('0xzz')).toBeNull();
        expect(toInt32OrNull(1.5)).toBeNull();
        expect(toInt32OrNull(NaN)).toBeNull();
        expect(toInt32OrNull(Infinity)).toBeNull();
        expect(toInt32OrNull({})).toBeNull();
        expect(toInt32OrNull([])).toBeNull();
    });

    it('Should handle bigints', () => {
        // BigInt() rather than a 42n literal: the lint config parses as ES2017
        expect(toInt32OrNull(BigInt(42))).toEqual(42);
        expect(toInt32OrNull(BigInt('2147483648'))).toBeNull();
    });

    it('Should handle BigNumbers', () => {
        expect(toInt32OrNull(ethers.BigNumber.from(42))).toEqual(42);
        expect(toInt32OrNull(ethers.BigNumber.from('1786637106312'))).toBeNull();
    });
});

describe('preserveUnstorableInts', () => {
    it('Should copy an out-of-range value into raw', () => {
        const row = preserveUnstorableInts({ hash: '0x1', nonce: '0x19ffbdebc88', raw: { foo: 'bar' } });

        expect(row.raw).toEqual({ foo: 'bar', nonce: '0x19ffbdebc88' });
    });

    it('Should leave the row untouched when everything fits', () => {
        const original = { hash: '0x1', nonce: '0x2a', raw: { foo: 'bar' } };

        expect(preserveUnstorableInts(original)).toBe(original);
    });

    it('Should cover every chain-supplied int4 field', () => {
        const row = preserveUnstorableInts({
            nonce: 1786637106312,
            requestId: 1786637106312,
            chainId: 1786637106312,
            type: 1786637106312,
            transactionIndex: 1786637106312,
            raw: {}
        });

        expect(row.raw).toEqual({
            nonce: 1786637106312,
            requestId: 1786637106312,
            chainId: 1786637106312,
            type: 1786637106312,
            transactionIndex: 1786637106312
        });
    });

    it('Should not add absent fields to raw', () => {
        const row = preserveUnstorableInts({ nonce: null, requestId: undefined, type: '', raw: {} });

        expect(row.raw).toEqual({});
    });

    it('Should not mutate the row it is given', () => {
        const original = { nonce: 1786637106312, raw: {} };

        preserveUnstorableInts(original);

        expect(original.raw).toEqual({});
    });

    it('Should cope with a row that has no raw payload yet', () => {
        expect(preserveUnstorableInts({ nonce: 1786637106312 }).raw).toEqual({ nonce: 1786637106312 });
    });

    it('Should stringify a BigNumber so it survives JSON storage', () => {
        const row = preserveUnstorableInts({ nonce: ethers.BigNumber.from('1786637106312'), raw: {} });

        expect(row.raw.nonce).toEqual('1786637106312');
    });

    it('Should prefer the untouched RPC value over the row\'s rounded copy', () => {
        // sanitize() has already turned the hex string into a number by this
        // point, which rounds anything above 2^53
        const hash = `0x${'ab'.repeat(32)}`;
        const row = preserveUnstorableInts({ requestId: parseInt(hash, 16), raw: {} }, { requestId: hash });

        expect(row.raw.requestId).toEqual(hash);
    });

    it('Should fall back to the row value when the source has no such field', () => {
        const row = preserveUnstorableInts({ nonce: 1786637106312, raw: {} }, { hash: '0x1' });

        expect(row.raw.nonce).toEqual(1786637106312);
    });

    it('Should return a nullish row unchanged', () => {
        expect(preserveUnstorableInts(null)).toBeNull();
        expect(preserveUnstorableInts(undefined)).toBeUndefined();
    });
});

describe('avg', () => {
    it('Should return the average of an array', () => {
        expect(avg([1, 2, 3, 4, 5])).toEqual(3);
    });
});

describe('validateBNString', () => {
    it('Should return true if valid', () => {
        expect(validateBNString('1000000000000000000')).toEqual(true);
    });

    it('Should return false if not BN', () => {
        expect(validateBNString(-5)).toEqual(false);
    });

    it('Should return false if not > 0', () => {
        expect(validateBNString('0')).toEqual(false);
    });
});

describe('sanitize', () => {
    it('Should numberize whitelisted fields', () => {
        const obj = { blockNumber: '0x123' };
        expect(sanitize(obj)).toEqual({ blockNumber: 291 });
    });

    it('Should stringify BigNumber', () => {
        const obj = { blockNumber: ethers.BigNumber.from('123456') };
        expect(sanitize(obj)).toEqual({ blockNumber: '123456' });
    });

    it('Should clear null keys', () => {
        const obj = {
            a: 1,
            b: null,
        };
        expect(sanitize(obj)).toEqual({ a: 1 });
    });

    it('Should only lowercase addresses', () => {
        const obj = {
            a: 'Not An Address',
            b: '0xAd0cf4FE440AdA22AaCf5c2f763D9ab481174BbD'
        }
        expect(sanitize(obj)).toEqual({
            a: 'Not An Address',
            b: '0xad0cf4fe440ada22aacf5c2f763d9ab481174bbd'
        });
    });

    it('Should return null for null input', () => {
        expect(sanitize(null)).toEqual(null);
    });

    it('Should return null for undefined input', () => {
        expect(sanitize(undefined)).toEqual(null);
    });
});

describe('stringifyBns', () => {
    it('Should convert BN in strings in an object', () => {
        const obj = {
            a: 123,
            b: '1234',
            c: ethers.BigNumber.from('123456')
        };
        expect(stringifyBns(obj)).toEqual({
            a: 123,
            b: '1234',
            c: '123456'
        });
    });

    it('Should remove functions', () => {
       const obj = {
            a: 123,
            b: '1234',
            c: ethers.BigNumber.from('123456'),
            d: () => 'Hi'
        };
        expect(stringifyBns(obj)).toEqual({
            a: 123,
            b: '1234',
            c: '123456'
        });
    });
});

describe('isJson', () => {
    it('Should return true for a parsable json string', () => {
        expect(isJson('{ "a": 1 }')).toBe(true);
    });

    it('Should return false for an non parsable json string', () => {
        expect(isJson('not a json')).toBe(false);
    });
});

describe('afterRootCommit', () => {
    it('Should run the callback right away without a transaction', () => {
        const fn = jest.fn().mockReturnValue('done');

        expect(afterRootCommit(undefined, fn)).toEqual('done');
        expect(afterRootCommit(null, fn)).toEqual('done');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('Should register on a root transaction', () => {
        const transaction = { afterCommit: jest.fn() };
        const fn = jest.fn();

        afterRootCommit(transaction, fn);

        expect(transaction.afterCommit).toHaveBeenCalledWith(fn);
        expect(fn).not.toHaveBeenCalled();
    });

    it('Should register on the outermost transaction when nested', () => {
        const root = { afterCommit: jest.fn() };
        const middle = { parent: root, afterCommit: jest.fn() };
        const leaf = { parent: middle, afterCommit: jest.fn() };
        const fn = jest.fn();

        afterRootCommit(leaf, fn);

        expect(root.afterCommit).toHaveBeenCalledWith(fn);
        expect(middle.afterCommit).not.toHaveBeenCalled();
        expect(leaf.afterCommit).not.toHaveBeenCalled();
        expect(fn).not.toHaveBeenCalled();
    });
});

describe('isDataUri', () => {
    it('Should detect data URIs, case-insensitively', () => {
        expect(isDataUri('data:application/json;base64,e30=')).toBe(true);
        expect(isDataUri('DATA:application/json,{}')).toBe(true);
    });

    it('Should reject other values', () => {
        expect(isDataUri('https://example.com/1.json')).toBe(false);
        expect(isDataUri('ipfs://abc')).toBe(false);
        expect(isDataUri(null)).toBe(false);
        expect(isDataUri(undefined)).toBe(false);
    });
});

describe('decodeJsonDataUri', () => {
    const metadata = { name: 'Tést ✓', description: 'On-chain', image: 'data:image/svg+xml;base64,PHN2Zy8+' };

    it('Should decode base64 JSON', () => {
        const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
        expect(decodeJsonDataUri(uri)).toEqual(metadata);
    });

    it('Should decode percent-encoded JSON', () => {
        const uri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
        expect(decodeJsonDataUri(uri)).toEqual(metadata);
    });

    it('Should decode raw JSON with a comma in the payload', () => {
        expect(decodeJsonDataUri('data:application/json,{"a":[1,2]}')).toEqual({ a: [1, 2] });
    });

    it('Should tolerate parameters and uppercase media types', () => {
        const base64 = Buffer.from(JSON.stringify(metadata)).toString('base64');
        expect(decodeJsonDataUri(`data:application/json;charset=utf-8;base64,${base64}`)).toEqual(metadata);
        expect(decodeJsonDataUri(`DATA:Application/JSON;Base64,${base64}`)).toEqual(metadata);
    });

    it('Should return null for malformed URIs', () => {
        expect(decodeJsonDataUri('data:application/json;base64')).toBeNull();
        expect(decodeJsonDataUri('data:application/json;base64,bm90IGpzb24=')).toBeNull();
        expect(decodeJsonDataUri('data:application/json,%E0%A4%A')).toBeNull();
        expect(decodeJsonDataUri('data:application/json,{"a":')).toBeNull();
        expect(decodeJsonDataUri('data:application/json,')).toBeNull();
    });

    it('Should return null for non-JSON media types', () => {
        expect(decodeJsonDataUri('data:text/plain,{"a":1}')).toBeNull();
        expect(decodeJsonDataUri('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
        expect(decodeJsonDataUri('data:,{"a":1}')).toBeNull();
    });

    it('Should return null when the payload is not a JSON object', () => {
        expect(decodeJsonDataUri('data:application/json,[1,2]')).toBeNull();
        expect(decodeJsonDataUri('data:application/json,"text"')).toBeNull();
        expect(decodeJsonDataUri('data:application/json,null')).toBeNull();
    });

    it('Should return null for non data URIs', () => {
        expect(decodeJsonDataUri('https://example.com/1.json')).toBeNull();
        expect(decodeJsonDataUri(null)).toBeNull();
    });
});
