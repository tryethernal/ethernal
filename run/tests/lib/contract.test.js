const { isErc20 } = require('../../lib/contract');
const DSProxyContract = require('../fixtures/DSProxyContract');
const ERC20 = require('../fixtures/ERC20_ABI');
const ERC721 = require('../fixtures/ERC721_ABI');

describe('isErc20', () => {
    it('Should return true if the abi is erc20', () => {
        expect(isErc20(ERC20)).toBe(true);
    });

    it('Should return false if the abi is not erc20', () => {
        expect(isErc20(DSProxyContract.abi)).toBe(false);
    });
});

describe('isErc721', () => {
    it('Should return true if the abi is erc721', () => {
        expect(isErc20(ERC20)).toBe(true);
    });

    it('Should return false if the abi is not erc721', () => {
        expect(isErc20(DSProxyContract.abi)).toBe(false);
    });
});
