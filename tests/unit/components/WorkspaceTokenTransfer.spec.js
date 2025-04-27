import WorkspaceTokenTransfer from '@/components/WorkspaceTokenTransfer.vue';

const stubs = ['TokenTransfers'];

describe('WorkspaceTokenTransfer.vue', () => {
    const mockTransfers = [
        {
            transactionHash: '0x123',
            methodDetails: 'Transfer',
            timestamp: '2024-03-21',
            blockNumber: '123456',
            src: '0xabc',
            dst: '0xdef',
            amount: '100',
            token: 'TEST'
        }
    ];

    const defaultOptions = {
        page: 1,
        itemsPerPage: 10,
        sortBy: [{ key: 'blockNumber', order: 'desc' }]
    };

    it('Should show the component with loading state', async () => {
        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockResolvedValueOnce({
            data: {
                items: []
            }
        });

        const wrapper = mount(WorkspaceTokenTransfer, {
            global: {
                stubs
            }
        });
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should fetch and display transfers', async () => {
        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockResolvedValueOnce({
            data: {
                items: mockTransfers
            }
        });

        const wrapper = mount(WorkspaceTokenTransfer, {
            global: {
                stubs
            }
        });

        await wrapper.findComponent({ name: 'TokenTransfers' }).vm.$emit('update:options', defaultOptions);
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle fetch error', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockRejectedValueOnce(new Error('Failed to fetch'));

        const wrapper = mount(WorkspaceTokenTransfer, {
            global: {
                stubs
            }
        });

        await wrapper.findComponent({ name: 'TokenTransfers' }).vm.$emit('update:options', defaultOptions);
        await flushPromises();
        
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching token transfers:', expect.any(Error));
        expect(wrapper.html()).toMatchSnapshot();

        consoleSpy.mockRestore();
    });

    it('Should update transfers when options change', async () => {
        const mockOptions = {
            page: 2,
            itemsPerPage: 10,
            sortBy: [{ key: 'blockNumber', order: 'desc' }]
        };

        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockResolvedValueOnce({
            data: {
                items: mockTransfers
            }
        });

        const wrapper = mount(WorkspaceTokenTransfer, {
            global: {
                stubs
            }
        });

        await wrapper.findComponent({ name: 'TokenTransfers' }).vm.$emit('update:options', mockOptions);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 