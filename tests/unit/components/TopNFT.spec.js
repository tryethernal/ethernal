import TopNFT from '@/components/TopNFT.vue';

describe('TopNFT.vue', () => {
    const mockNFTData = {
        items: [
            {
                token: '0x123',
                contract: {
                    tokenName: 'Test NFT',
                    name: 'Test Collection',
                    patterns: ['ERC721'],
                    tokenTotalSupply: '1000'
                },
                holders: 500
            }
        ]
    };

    beforeEach(() => {
        vi.spyOn(server, 'getTopTokensByHolders').mockResolvedValueOnce({ data: mockNFTData });
    });

    it('Should show the component with data', async () => {
        const wrapper = mount(TopNFT, {
            global: {
                stubs: ['router-link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show loading state', async () => {
        vi.spyOn(server, 'getTopTokensByHolders').mockImplementationOnce(() => new Promise(() => {}));
        
        const wrapper = mount(TopNFT, {
            global: {
                stubs: ['router-link']
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error when fetching NFTs', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(server, 'getTopTokensByHolders').mockRejectedValueOnce(new Error('Failed to fetch'));
        
        const wrapper = mount(TopNFT, {
            global: {
                stubs: ['router-link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should update NFTs when options change', async () => {
        const wrapper = mount(TopNFT, {
            global: {
                stubs: ['router-link']
            }
        });
        await flushPromises();

        await wrapper.findComponent({ name: 'v-data-table-server' }).vm.$emit('update:options', {
            page: 2,
            itemsPerPage: 25
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 