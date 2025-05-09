const ethers = require('ethers');
const {
    sanitize,
    stringifyBns,
    isJson,
    validateBNString,
    avg
} = require('../../lib/utils');

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
    })
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
