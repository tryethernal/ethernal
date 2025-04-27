import ContractReadWrite from '@/components/ContractReadWrite.vue';

const stubs = ['Contract-Call-Options', 'Contract-Read-Method', 'Contract-Write-Method'];

describe('ContractReadWrite.vue', () => {
    const mockContract = {
        abi: [
            {
                type: 'function',
                name: 'balanceOf',
                stateMutability: 'view',
                inputs: []
            },
            {
                type: 'function',
                name: 'transfer',
                stateMutability: 'nonpayable',
                inputs: []
            },
            {
                type: 'event',
                name: 'Transfer',
                inputs: []
            }
        ]
    };

    it('Should show read methods when forceTab is read', async () => {
        const wrapper = mount(ContractReadWrite, {
            props: {
                contract: mockContract,
                forceTab: 'read'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show write methods when forceTab is write', async () => {
        const wrapper = mount(ContractReadWrite, {
            props: {
                contract: mockContract,
                forceTab: 'write'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should filter methods based on search input', async () => {
        const wrapper = mount(ContractReadWrite, {
            props: {
                contract: mockContract,
                forceTab: 'read'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        const searchField = wrapper.findComponent({ name: 'v-text-field' });
        await searchField.setValue('balance');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show verification message when contract has no ABI', async () => {
        const wrapper = mount(ContractReadWrite, {
            props: {
                contract: {},
                forceTab: 'read'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit filtered counts when search changes', async () => {
        const wrapper = mount(ContractReadWrite, {
            props: {
                contract: mockContract,
                forceTab: 'read'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        const searchField = wrapper.findComponent({ name: 'v-text-field' });
        await searchField.setValue('balance');
        await flushPromises();

        const emitted = wrapper.emitted('update-filtered-counts');
        expect(emitted).toBeTruthy();
        expect(emitted[emitted.length - 1][0]).toEqual({
            read: 1,
            write: 0
        });
    });
}); 