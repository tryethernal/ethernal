import ERC721TokenTransfers from '@/components/ERC721TokenTransfers.vue';

const stubs = ['Token-Transfers'];

describe('ERC721TokenTransfers.vue', () => {
    const mockServer = {
        getErc721TokenTransfers: vi.fn(),
        getTokenTransfers: vi.fn()
    };

    const defaultProps = {
        address: '0x123',
        headers: [
            { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
            { title: 'Method', key: 'methodDetails', sortable: false },
            { title: 'Block', key: 'blockNumber', sortable: true },
            { title: 'Age', key: 'timestamp', sortable: true },
            { title: 'From', key: 'src', sortable: false },
            { title: 'To', key: 'dst', sortable: false },
            { title: 'Token', key: 'token', sortable: false },
            { title: 'Amount', key: 'amount', sortable: false }
        ]
    };

    const mountComponent = (props = {}) => {
        return mount(ERC721TokenTransfers, {
            props: { ...defaultProps, ...props },
            global: {
                stubs,
                provide: {
                    $server: mockServer
                }
            }
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should render the component with default props', async () => {
        const wrapper = mountComponent();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should fetch token transfers when options are updated without tokenId', async () => {
        const mockData = {
            items: [{ id: 1 }, { id: 2 }],
            total: 2
        };
        mockServer.getTokenTransfers.mockResolvedValueOnce({ data: mockData });

        const wrapper = mountComponent();
        await wrapper.findComponent({ name: 'Token-Transfers' }).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        });
        await flushPromises();

        expect(mockServer.getTokenTransfers).toHaveBeenCalledWith(
            '0x123',
            {
                page: 1,
                itemsPerPage: 10,
                orderBy: 'blockNumber',
                order: 'desc'
            }
        );
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should fetch ERC721 token transfers when options are updated with tokenId', async () => {
        const mockData = {
            items: [{ id: 1 }, { id: 2 }],
            total: 2
        };
        mockServer.getErc721TokenTransfers.mockResolvedValueOnce({ data: mockData });

        const wrapper = mountComponent({ tokenId: '123' });
        await wrapper.findComponent({ name: 'Token-Transfers' }).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        });
        await flushPromises();

        expect(mockServer.getErc721TokenTransfers).toHaveBeenCalledWith('0x123', '123');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error when fetching transfers', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error');
        mockServer.getTokenTransfers.mockRejectedValueOnce(new Error('API Error'));

        const wrapper = mountComponent();
        await wrapper.findComponent({ name: 'Token-Transfers' }).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        });
        await flushPromises();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching transfers:', expect.any(Error));
        expect(wrapper.html()).toMatchSnapshot();
        consoleErrorSpy.mockRestore();
    });

    it('Should not fetch transfers when options are incomplete', async () => {
        const wrapper = mountComponent();
        await wrapper.findComponent({ name: 'Token-Transfers' }).vm.$emit('update:options', {
            page: 1,
            itemsPerPage: 10
        });
        await flushPromises();

        expect(mockServer.getTokenTransfers).not.toHaveBeenCalled();
        expect(mockServer.getErc721TokenTransfers).not.toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 