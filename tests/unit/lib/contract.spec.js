const ethers = require('ethers');

import { isErc20 } from '@/lib/contract';
import DSProxyContract from '../fixtures/DSProxyContract';
import ERC20 from '@/abis/erc20.json';

describe('isErc20', () => {
    it('Should return true if the abi is erc20', () => {
        expect(isErc20(ERC20)).toBe(true);
    });

    it('Should return false if the abi is not erc20', () => {
        expect(isErc20(DSProxyContract.abi)).toBe(false);
    });
});
