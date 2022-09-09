import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ERC721Collections from '@/components/ERC721Collections.vue';

const helper = new MockHelper();

describe('ERC721Collections.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load & display erc721 contracts', async () => {
        jest.spyOn(helper.mocks.server, 'getContracts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123', tokenName: 'Ethernal', tokenSymbol: 'ETL', tokenTotalSupply: 100, patterns: ['erc721'] }]}});
        
        const wrapper = helper.mountFn(ERC721Collections, {
            stubs: ['Hash-Link']
        });
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});
