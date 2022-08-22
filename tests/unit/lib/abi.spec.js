const ethers = require('ethers');

import { decodeLog, formatErrorFragment, findAbiForFunction, findAbiForEvent } from '@/lib/abi.js';
import ABIProp from '../fixtures/ABIProp.json';
import ERC_20_ABI from '@/abis/erc20.json';
import LogProp from '../fixtures/LogProp.json';
import DSProxyContract from '../fixtures/DSProxyContract.json';
import LogNoteEventProp from '../fixtures/LogNoteEventProp.json';
import TokenContract from '../fixtures/TokenContract.json';

describe('findAbiForEvent', () => {
    it('Should return erc20 abi if the signature matches one', () => {
        expect(findAbiForEvent('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')).toEqual(ERC_20_ABI);
    })

    it('Should not return anything if it does not match', () => {
        expect(findAbiForEvent('0x1')).toEqual(undefined);
    });
});

describe('findAbiForFunction', () => {
    it('Should return erc20 abi if the signature matches one', () => {
        expect(findAbiForFunction('0x18160ddd')).toEqual(ERC_20_ABI);
    });

    it('Should not return anything if it does not match', () => {
        expect(findAbiForFunction('0x1')).toEqual(undefined);
    });
});

describe('decodeLog', () => {
    it('Should decode the event if it is not anonymous', () => {
        expect(decodeLog(LogProp, ABIProp)).toMatchSnapshot();
    });

    it('Should decode the event if it is anonymous', () => {
        expect(decodeLog(LogNoteEventProp, DSProxyContract.abi)).toMatchSnapshot();
    });
});

describe('formatErrorFragment', () => {
    it('Should format custom solidity exceptions', () => {
        const jsonInterface = new ethers.utils.Interface(TokenContract.abi);
        const returnValue = '0xcf4791810000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b';
        const result = jsonInterface.parseError(returnValue);
        expect(formatErrorFragment(result)).toMatchSnapshot();
    });
});
