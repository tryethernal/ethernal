import BlockTransactionList from '@/components/BlockTransactionList.vue';

describe('BlockTransactionList', () => {
    it('should render block transactions list', () => {
        const wrapper = mount(BlockTransactionList, {
            props: {
                blockNumber: '12345678'
            },
            global: {
                stubs: ['Transactions-List']
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
