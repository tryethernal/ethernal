import OrbitBatchTransactions from '@/components/OrbitBatchTransactions.vue';

const stubs = ['Transactions-List'];

describe('OrbitBatchTransactions.vue', () => {
    it('Should show the component', async () => {
        const wrapper = mount(OrbitBatchTransactions, {
            props: {
                batchNumber: 123
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
