import CompactTransactionTokenTransfers from '@/components/CompactTransactionTokenTransfers.vue';

const stubs = ['Compact-Token-Transfers'];

describe('CompactTransactionTokenTransfers.vue', () => {
    let server;

    beforeEach(() => {
        server = vi.spyOn(global.server, 'getTransactionTokenTransfers');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('Should show loading state', async () => {
        server.mockResolvedValueOnce({ data: { items: [] } });
        const wrapper = mount(CompactTransactionTokenTransfers, {
            props: {
                hash: '0x123',
                totalTransfers: 0,
                withTokenData: true
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should fetch and display token transfers', async () => {
        const mockTransfers = [
            {
                id: 1,
                src: '0xsource',
                dst: '0xdest',
                amount: '1000000000000000000',
                token: '0xtoken',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            }
        ];

        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        const wrapper = mount(CompactTransactionTokenTransfers, {
            props: {
                hash: '0x123',
                totalTransfers: 1,
                withTokenData: true
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
        expect(server).toHaveBeenCalledWith('0x123', expect.any(Object));

        // Verify that the transfers are passed to the child component
        const compactTokenTransfers = wrapper.findComponent({ name: 'Compact-Token-Transfers' });
        expect(compactTokenTransfers.props('transfers')).toEqual(mockTransfers);
        expect(compactTokenTransfers.props('count')).toBe(1);
        expect(compactTokenTransfers.props('loading')).toBe(false);
    });

    it('Should handle pagination', async () => {
        const mockTransfers = [
            {
                id: 1,
                src: '0xsource',
                dst: '0xdest',
                amount: '1000000000000000000',
                token: '0xtoken',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            }
        ];

        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        const wrapper = mount(CompactTransactionTokenTransfers, {
            props: {
                hash: '0x123',
                totalTransfers: 10,
                withTokenData: true
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        // Mock the next page of results
        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        // Trigger pagination update
        await wrapper.findComponent({ name: 'Compact-Token-Transfers' }).vm.$emit('pagination', { page: 2, itemsPerPage: 5 });
        
        await flushPromises();
        expect(server).toHaveBeenCalledTimes(2);
        expect(server).toHaveBeenLastCalledWith('0x123', expect.objectContaining({
            page: 2,
            itemsPerPage: 5
        }));

        // Verify that the updated transfers are passed to the child component
        const compactTokenTransfers = wrapper.findComponent({ name: 'Compact-Token-Transfers' });
        expect(compactTokenTransfers.props('transfers')).toEqual(mockTransfers);
    });

    it('Should handle sorting', async () => {
        const mockTransfers = [
            {
                id: 1,
                src: '0xsource',
                dst: '0xdest',
                amount: '1000000000000000000',
                token: '0xtoken',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            }
        ];

        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        const wrapper = mount(CompactTransactionTokenTransfers, {
            props: {
                hash: '0x123',
                totalTransfers: 1,
                withTokenData: true
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        // Mock the sorted results
        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        // Trigger sort update
        await wrapper.findComponent({ name: 'Compact-Token-Transfers' }).vm.$emit('update:options', {
            sortBy: [{ key: 'timestamp', order: 'desc' }],
            itemsPerPage: 5
        });
        
        await flushPromises();
        expect(server).toHaveBeenCalledTimes(2);
        expect(server).toHaveBeenLastCalledWith('0x123', expect.objectContaining({
            orderBy: 'timestamp',
            order: 'desc'
        }));

        // Verify that the sorted transfers are passed to the child component
        const compactTokenTransfers = wrapper.findComponent({ name: 'Compact-Token-Transfers' });
        expect(compactTokenTransfers.props('transfers')).toEqual(mockTransfers);
    });

    it('Should refresh transfers', async () => {
        const mockTransfers = [
            {
                id: 1,
                src: '0xsource',
                dst: '0xdest',
                amount: '1000000000000000000',
                token: '0xtoken',
                contract: {
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    patterns: ['erc20']
                }
            }
        ];

        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        const wrapper = mount(CompactTransactionTokenTransfers, {
            props: {
                hash: '0x123',
                totalTransfers: 1,
                withTokenData: true
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        // Mock the refreshed results
        server.mockResolvedValueOnce({ data: { items: mockTransfers } });
        
        // Trigger refresh
        await wrapper.findComponent({ name: 'Compact-Token-Transfers' }).vm.$emit('refresh');
        
        await flushPromises();
        expect(server).toHaveBeenCalledTimes(2);
        expect(server).toHaveBeenLastCalledWith('0x123', expect.objectContaining({
            page: 1
        }));

        // Verify that the refreshed transfers are passed to the child component
        const compactTokenTransfers = wrapper.findComponent({ name: 'Compact-Token-Transfers' });
        expect(compactTokenTransfers.props('transfers')).toEqual(mockTransfers);
    });
});
