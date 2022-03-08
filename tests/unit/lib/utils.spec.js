import { sanitize, getProvider, processMethodCallParam, formatSolidityObject, formatResponse } from '@/lib/utils.js';
const Web3 = require('web3');
const ethers = require('ethers');

describe('sanitize', () => {
    it('Should clear null keys', () => {
        const obj = {
            a: 1,
            b: null,
        };
        expect(sanitize(obj)).toEqual({ a: 1 });
    });
});

describe('getProvider', () => {
    it('Should return a websocket provider when ws url', () => {
        const provider = getProvider('ws://localhost:8545');
        expect(provider instanceof Web3.providers.WebsocketProvider).toBe(true);
    });

    it('Should return a websocket provider when wss url', () => {
        const provider = getProvider('wss://localhost:8545');
        expect(provider instanceof Web3.providers.WebsocketProvider).toBe(true);
    });

    it('Should return a http provider when http url', () => {
        const provider = getProvider('http://localhost:8545');
        expect(provider instanceof Web3.providers.HttpProvider).toBe(true);
    });

    it('Should return a http provider when https url', () => {
        const provider = getProvider('https://localhost:8545');
        expect(provider instanceof Web3.providers.HttpProvider).toBe(true);
    });
});

describe('processMethodCallParam', () => {
    it('Should return a javascript array if input is array of addresses', () => {
        const result = processMethodCallParam('[0xeb4220df353ecf892314f341d36868924221dc6f,0x01c1def3b91672704716159c9041aeca392ddffb]', 'address[]');
        expect(Array.isArray(result)).toBe(true);
    });

    it('Should return a javascript array if input is string and array type', () => {
        const result = processMethodCallParam('[1,2]', 'uint256[]');
        expect(Array.isArray(result)).toBe(true);
    });

    it('Should return the same input type is not known', () => {
        const result = processMethodCallParam('test', 'string');
        expect(result).toBe('test');
    })
});
