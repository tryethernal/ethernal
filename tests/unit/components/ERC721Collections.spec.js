import flushPromises from 'flush-promises'

import ERC721Collections from '@/components/ERC721Collections.vue';

describe('ERC721Collections.vue', () => {
    it('Should load & display erc721 contracts', async () => {
        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { total: 1, items: [{ address: '0x123', tokenName: 'Ethernal', tokenSymbol: 'ETL', tokenTotalSupply: 100, patterns: ['erc721'] }]}});

        const wrapper = mount(ERC721Collections, {
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
