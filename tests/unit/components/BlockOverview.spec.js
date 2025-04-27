import BlockOverview from '@/components/BlockOverview.vue';

const stubs = ['HashLink', 'ExpandableText'];

describe('Block.vue', () => {
    it('Should show block details', async () => {
        const mockBlock = {
            number: 12345678,
            timestamp: '2022-08-07T12:33:37.000Z',
            transactionsCount: 150,
            miner: '0x1234567890123456789012345678901234567890',
            difficulty: 12345,
            raw: {
                totalDifficulty: 987654321,
                size: 45678,
                sha3Uncles: '0xd5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5',
                stateRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            },
            gasUsed: '21000',
            gasLimit: '30000000',
            baseFeePerGas: '1000000000',
            extraData: '0x486561646572',
            hash: '0x9876543210987654321098765432109876543210987654321098765432109876',
            parentHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
        };

        const wrapper = mount(BlockOverview, {
            props: {
                block: mockBlock
            },
            global: {
                stubs,
                plugins: [createTestingPinia()]
            }
        });

        await flushPromises();

        // Test UI rendering with snapshot
        expect(wrapper.html()).toMatchSnapshot();

        // Test interaction (this should remain as a specific test)
        const txLink = wrapper.find('a[href="#"]');
        await txLink.trigger('click');
        expect(wrapper.emitted()['change-tab'][0]).toEqual(['transactions']);
    });
});
