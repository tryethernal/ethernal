import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Block from '@/components/Block.vue';

describe('Block.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should show the block component', async () => {
        const block = {
            number: 1,
            gasLimit: '1000000000',
            timestamp: '1621548462',
            hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
            transactions: [{ id: 1 }]
        };

        jest.spyOn(helper.mocks.server, 'getBlock')
            .mockResolvedValue({ data: block });

        const wrapper = helper.mountFn(Block, {
            propsData: { number: 1 },
            stubs: ['Transactions-List']
        });
        await flushPromises();

        expect(wrapper.vm.block).toEqual(block);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
