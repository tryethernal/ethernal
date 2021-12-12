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

describe('formatResponse', () => {
    it('Should return an array of int if an array of BN is passed', () => {
        const data = [
            ethers.BigNumber.from('0x1dcd6500'),
            ethers.BigNumber.from('0x03')
        ];

        const result = formatResponse(data);
        expect(result).toBe('[500000000, 3]')
    });

    it('Should be parsed as BN adn return an int if an object is passed', () => {
        const result = formatResponse(ethers.BigNumber.from('0x03'));
        expect(result).toBe('3');
    });

    it('Should return the parameter if it does not match any pattern', () => {
        const result = formatResponse('hi');
        expect(result).toBe('hi');
    })
});

describe('formatSolidityObject', () => {
    it('Should return a commified number if flag is passed', () => {
        const result = formatSolidityObject(ethers.BigNumber.from('0x1dcd6500'), true);
        expect(result).toBe('0.0000000005');
    });

    it('Should return a string containing an int if a BigNumber is passed', () => {
        const result = formatSolidityObject(ethers.BigNumber.from('0x03'));
        expect(result).toBe('3');
    });

    it('Should return the param if type is unknown', () => {
        const result = formatSolidityObject({ '_type': 'unknown', '_hex': '0x03' });
        expect(result).toEqual({ '_type': 'unknown', '_hex': '0x03' });
    });

   it('Should return the param if no type', () => {
        const result = formatSolidityObject(3);
        expect(result).toBe(3);
    });
})