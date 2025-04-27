import flushPromises from 'flush-promises';

import Block from '@/components/Block.vue';

describe('Block.vue', () => {
    it('Should show a message if the block does not exist', async () => {
        vi.spyOn(server, 'getBlock')
            .mockResolvedValue({ data: null });

        const wrapper = mount(Block, {
            props: { number: 1 },
            global: {
                stubs: ['Transactions-List', 'Block-Overview']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a message if the block is syncing', async() => {
        const block = {
            number: 1,
            gasLimit: '1000000000',
            timestamp: '2022-10-18T18:28:41.000Z',
            hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
            transactions: [{ id: 1 }],
            transactionsCount: 5,
            syncedTransactionCount: 3
        };

        vi.spyOn(server, 'getBlock')
            .mockResolvedValue({ data: block });

        const wrapper = mount(Block, {
            props: { number: 1 },
            global: {
                stubs: ['Transactions-List', 'Block-Overview']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the block component', async () => {
        const block = {
            number: 1,
            gasLimit: '1000000000',
            timestamp: '2022-10-18T18:28:41.000Z',
            hash: '0x98c6edb3bb1124680a97661c1f5794d60617abb57bd1e611d81fc5b941f36d30',
            transactions: [{ id: 1 }],
            transactionsCount: 5,
            syncedTransactionCount: 5
        };

        vi.spyOn(server, 'getBlock')
            .mockResolvedValue({ data: block });

        const wrapper = mount(Block, {
            props: { number: 1 },
            global: {
                stubs: ['Transactions-List', 'Block-Overview']
            }
        });
        await flushPromises();

        expect(wrapper.vm.block).toEqual(block);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
