import InternalTransactions from '@/components/InternalTransactions.vue';

const stubs = ['Trace-Steps-Table'];

describe('InternalTransactions.vue', () => {
    it('Should show the component in loading state', async () => {
        vi.spyOn(server, 'getWorkspaceTransactionTraceSteps').mockResolvedValueOnce({ 
            data: { 
                items: [] 
            } 
        });

        const wrapper = mount(InternalTransactions, {
            global: {
                stubs
            }
        });
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with data', async () => {
        const mockItems = [
            { id: 1, name: 'Step 1' },
            { id: 2, name: 'Step 2' }
        ];

        vi.spyOn(server, 'getWorkspaceTransactionTraceSteps').mockResolvedValueOnce({ 
            data: { 
                items: mockItems
            } 
        });

        const wrapper = mount(InternalTransactions, {
            global: {
                stubs
            }
        });
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle dense prop', async () => {
        vi.spyOn(server, 'getWorkspaceTransactionTraceSteps').mockResolvedValueOnce({ 
            data: { 
                items: [] 
            } 
        });

        const wrapper = mount(InternalTransactions, {
            props: {
                dense: true
            },
            global: {
                stubs
            }
        });
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error when fetching data', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(server, 'getWorkspaceTransactionTraceSteps').mockRejectedValueOnce(new Error('Failed to fetch'));

        const wrapper = mount(InternalTransactions, {
            global: {
                stubs
            }
        });

        // Trigger the fetchWorkspaceTraceSteps method
        await wrapper.findComponent({ name: 'Trace-Steps-Table' }).vm.$emit('update:options', { page: 1, itemsPerPage: 10 });
        await flushPromises();
        
        expect(wrapper.html()).toMatchSnapshot();
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching trace steps:', expect.any(Error));
        consoleSpy.mockRestore();
    });
}); 