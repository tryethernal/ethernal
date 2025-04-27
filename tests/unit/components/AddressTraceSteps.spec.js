import flushPromises from 'flush-promises'

import AddressTraceSteps from '@/components/AddressTraceSteps.vue';

const stubs = ['TraceStepsTable'];

describe('AddressTraceSteps.vue', () => {
    it('Should load address trace steps', async () => {
        vi.spyOn(server, 'getAddressInternalTransactions').mockResolvedValueOnce({
            data: {
                items: [
                    {
                        transactionHash: '0x1234567890123456789012345678901234567890',
                        blockNumber: 1,
                        timestamp: '2021-01-01',
                    }
                ]
            }
        });

        const wrapper = mount(AddressTraceSteps, {
            props: {
                address: '0x1234567890123456789012345678901234567890',
                dense: false
            },
            global: {
                stubs
            }
        });
        wrapper.vm.fetchAddressTraceSteps({ page: 1, itemsPerPage: 10 });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
