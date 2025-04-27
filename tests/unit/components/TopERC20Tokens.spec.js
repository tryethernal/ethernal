import TopERC20Tokens from '@/components/TopERC20Tokens.vue';

const stubs = ['HashLink'];

describe('TopERC20Tokens.vue', () => {
    const mockTokens = {
        items: [
            {
                token: '0x123',
                holders: 1000,
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST'
                }
            },
            {
                token: '0x456',
                holders: 2000,
                contract: {
                    name: 'Another Token', // Testing fallback to name
                    tokenSymbol: 'ATK'
                }
            }
        ]
    };

    beforeEach(() => {
        vi.spyOn(server, 'getTopTokensByHolders').mockResolvedValueOnce({ data: mockTokens });
    });

    it('Should show the component with data', async () => {
        const wrapper = mount(TopERC20Tokens, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle loading state', async () => {
        const loadingPromise = new Promise(resolve => setTimeout(() => resolve({ data: mockTokens }), 100));
        vi.spyOn(server, 'getTopTokensByHolders').mockResolvedValueOnce(loadingPromise);

        const wrapper = mount(TopERC20Tokens, {
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
        
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error state', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(server, 'getTopTokensByHolders').mockRejectedValueOnce(new Error('Failed to fetch'));

        const wrapper = mount(TopERC20Tokens, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should update tokens when changing page options', async () => {
        const wrapper = mount(TopERC20Tokens, {
            global: {
                stubs
            }
        });
        await flushPromises();

        const newOptions = { page: 2, itemsPerPage: 25 };
        vi.spyOn(server, 'getTopTokensByHolders').mockResolvedValueOnce({ 
            data: { 
                items: [{ 
                    token: '0x789',
                    holders: 3000,
                    contract: {
                        tokenName: 'Page Two Token',
                        tokenSymbol: 'PTT'
                    }
                }] 
            } 
        });

        await wrapper.findComponent({ name: 'v-data-table-server' }).vm.$emit('update:options', newOptions);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 