import TransactionState from '@/components/TransactionState.vue';

const stubs = ['Tokens-Balance-Diff'];

describe('TransactionState.vue', () => {
    const mockTransaction = {
        hash: '0x123',
        blockNumber: 123456,
        tokenBalanceChangeCount: 25
    };

    it('Should show loading state', async () => {
        vi.spyOn(server, 'getTransactionTokenBalanceChanges').mockResolvedValueOnce({ data: [] });
        
        const wrapper = mount(TransactionState, {
            props: {
                transaction: mockTransaction
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show balance changes', async () => {
        const mockBalanceChanges = [
            { id: 1, amount: '100' },
            { id: 2, amount: '200' }
        ];

        vi.spyOn(server, 'getTransactionTokenBalanceChanges').mockResolvedValueOnce({ 
            data: mockBalanceChanges 
        });
        
        const wrapper = mount(TransactionState, {
            props: {
                transaction: mockTransaction
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show no balance changes message', async () => {
        vi.spyOn(server, 'getTransactionTokenBalanceChanges').mockResolvedValueOnce({ 
            data: [] 
        });
        
        const wrapper = mount(TransactionState, {
            props: {
                transaction: mockTransaction
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle pagination', async () => {
        const mockBalanceChanges = [
            { id: 1, amount: '100' },
            { id: 2, amount: '200' }
        ];

        const getBalanceChangesSpy = vi.spyOn(server, 'getTransactionTokenBalanceChanges')
            .mockResolvedValueOnce({ data: mockBalanceChanges })
            .mockResolvedValueOnce({ data: mockBalanceChanges });
        
        const wrapper = mount(TransactionState, {
            props: {
                transaction: mockTransaction
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        // Change page
        await wrapper.findComponent({ name: 'v-pagination' }).vm.$emit('update:modelValue', 2);
        await flushPromises();

        expect(getBalanceChangesSpy).toHaveBeenCalledTimes(2);
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 