const ethers = require('ethers');

import { decodeLog, formatErrorFragment} from '@/lib/abi.js';
import ABIProp from '../fixtures/ABIProp.json';
import LogProp from '../fixtures/LogProp.json';
import DSProxyContract from '../fixtures/DSProxyContract.json';
import LogNoteEventProp from '../fixtures/LogNoteEventProp.json';
import TokenContract from '../fixtures/TokenContract.json';

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
