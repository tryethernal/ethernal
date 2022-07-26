const ethers = require('ethers');
const {
    sanitize,
    stringifyBns,
    isJson
} = require('../../lib/utils');

describe('sanitize', () => {
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
