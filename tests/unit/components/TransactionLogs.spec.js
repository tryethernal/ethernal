import TransactionLogs from '@/components/TransactionLogs.vue';

const stubs = ['Transaction-Event'];

describe('TransactionLogs.vue', () => {
    beforeEach(() => {
        vi.spyOn(server, 'getTransactionLogs').mockResolvedValueOnce({
            data: {
                logs: [
                    { id: 1, name: 'Test Log 1' },
                    { id: 2, name: 'Test Log 2' }
                ],
                count: 2
            }
        });
    });

    it('Should show loading state initially', async () => {
        const wrapper = mount(TransactionLogs, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show logs after loading', async () => {
        const wrapper = mount(TransactionLogs, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs
            }
        });
        
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show pagination when log count is greater than 10', async () => {
        vi.spyOn(server, 'getTransactionLogs').mockResolvedValueOnce({
            data: {
                logs: Array(11).fill().map((_, i) => ({ id: i, name: `Test Log ${i}` })),
                count: 11
            }
        });

        const wrapper = mount(TransactionLogs, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs
            }
        });
        
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should reload logs when hash changes', async () => {
        const getTransactionLogsSpy = vi.spyOn(server, 'getTransactionLogs').mockResolvedValueOnce({
            data: {
                logs: [{ id: 1, name: 'Test Log 1' }],
                count: 1
            }
        }).mockResolvedValueOnce({
            data: {
                logs: [{ id: 2, name: 'Test Log 2' }],
                count: 1
            }
        });
        
        const wrapper = mount(TransactionLogs, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs
            }
        });
        
        await flushPromises();
        
        await wrapper.setProps({ hash: '0x456' });
        vi.advanceTimersByTime(100); // Advance timer for debounce
        await flushPromises();
        
        expect(getTransactionLogsSpy).toHaveBeenCalledTimes(2);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle page changes', async () => {
        // Mock with more than 10 items to show pagination
        const getTransactionLogsSpy = vi.spyOn(server, 'getTransactionLogs').mockResolvedValueOnce({
            data: {
                logs: Array(11).fill().map((_, i) => ({ id: i, name: `Test Log ${i}` })),
                count: 11
            }
        }).mockResolvedValueOnce({
            data: {
                logs: [{ id: 12, name: 'Test Log 12' }],
                count: 11
            }
        });
        
        const wrapper = mount(TransactionLogs, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs
            }
        });
        
        await flushPromises();
        
        // Trigger pagination change
        await wrapper.vm.pageChanged(2);
        await flushPromises();
        
        expect(getTransactionLogsSpy).toHaveBeenCalledWith('0x123', { page: 2, itemsPerPage: 10 });
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 