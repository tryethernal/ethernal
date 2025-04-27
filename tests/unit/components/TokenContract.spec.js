import TokenContract from '@/components/TokenContract.vue';

const stubs = ['ERC20Contract', 'ERC721Collection'];

describe('TokenContract.vue', () => {
    it('Should show loading state', async () => {
        vi.spyOn(server, 'getContract').mockImplementationOnce(() => new Promise(() => {}));

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show not a contract message', async () => {
        vi.spyOn(server, 'getContract').mockResolvedValueOnce({ data: null });

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show ERC20 contract component', async () => {
        vi.spyOn(server, 'getContract').mockResolvedValueOnce({
            data: {
                patterns: ['erc20']
            }
        });

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show ERC721 contract component', async () => {
        vi.spyOn(server, 'getContract').mockResolvedValueOnce({
            data: {
                patterns: ['erc721']
            }
        });

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show ERC1155 contract as ERC721 component', async () => {
        vi.spyOn(server, 'getContract').mockResolvedValueOnce({
            data: {
                patterns: ['erc1155']
            }
        });

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show unknown contract type message', async () => {
        vi.spyOn(server, 'getContract').mockResolvedValueOnce({
            data: {
                patterns: ['unknown']
            }
        });

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show not a contract message when getContract throws error', async () => {
        vi.spyOn(server, 'getContract').mockRejectedValueOnce(new Error('Failed to load contract'));

        const wrapper = mount(TokenContract, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 