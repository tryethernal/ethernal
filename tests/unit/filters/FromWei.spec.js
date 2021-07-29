import FromWei from '@/filters/FromWei.js';

describe('FromWei', () => {
    it('Convert to eth & format when no to argument', () => {
        const result = FromWei(1000000000000000000)
        expect(result).toEqual('1 ether');
    });

    it('Convert to given unit & format', () => {
        const result = FromWei(1000000000000000000, 'gwei')
        expect(result).toEqual('1000000000 gwei');
    });
});
