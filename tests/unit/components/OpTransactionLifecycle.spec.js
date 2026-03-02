import OpTransactionLifecycle from '@/components/OpTransactionLifecycle.vue';

describe('OpTransactionLifecycle.vue', () => {
    it('Should not render when no transaction or withdrawal', async () => {
        const wrapper = mount(OpTransactionLifecycle, {
            props: {
                transaction: null,
                withdrawal: null
            }
        });

        await new Promise(process.nextTick);

        // Component should not render anything without transaction or withdrawal
        expect(wrapper.html()).not.toContain('v-stepper');
    });

    it('Should render lifecycle for transaction', async () => {
        const wrapper = mount(OpTransactionLifecycle, {
            props: {
                transaction: {
                    hash: '0x' + 'a'.repeat(64),
                    blockNumber: 1000
                },
                withdrawal: null,
                batch: null,
                output: null
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('Processed');
    });

    it('Should render lifecycle for withdrawal', async () => {
        const wrapper = mount(OpTransactionLifecycle, {
            props: {
                transaction: null,
                withdrawal: {
                    withdrawalHash: '0x' + 'a'.repeat(64),
                    status: 'initiated'
                },
                output: null
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('Initiated');
    });
});
