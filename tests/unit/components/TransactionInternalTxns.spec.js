import TransactionInternalTxns from '@/components/TransactionInternalTxns.vue';

const stubs = ['Trace-Step'];

describe('TransactionInternalTxns.vue', () => {
    it('Should show loading state', async () => {
        vi.spyOn(server, 'getTransactionTraceSteps').mockImplementationOnce(() => new Promise(() => {}));

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {
                    hash: '0x123'
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error state when API call fails', async () => {
        vi.spyOn(server, 'getTransactionTraceSteps').mockRejectedValueOnce(new Error('API Error'));

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {
                    hash: '0x123'
                }
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show empty state when no trace steps are found', async () => {
        vi.spyOn(server, 'getTransactionTraceSteps').mockResolvedValueOnce({ data: [] });

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {
                    hash: '0x123'
                }
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show trace steps when data is available', async () => {
        const mockTraceSteps = [
            { id: 1, data: 'step1' },
            { id: 2, data: 'step2' }
        ];
        vi.spyOn(server, 'getTransactionTraceSteps').mockResolvedValueOnce({ data: mockTraceSteps });

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {
                    hash: '0x123'
                }
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should use cached trace steps on subsequent renders', async () => {
        const mockTraceSteps = [
            { id: 1, data: 'step1' }
        ];
        const spy = vi.spyOn(server, 'getTransactionTraceSteps').mockResolvedValueOnce({ data: mockTraceSteps });

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {
                    hash: '0x123'
                }
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        // Update props to trigger re-render
        await wrapper.setProps({
            transaction: {
                hash: '0x123',
                someOtherProp: true
            }
        });

        expect(spy).toHaveBeenCalledTimes(1);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not fetch data when transaction hash is missing', async () => {
        const spy = vi.spyOn(server, 'getTransactionTraceSteps');

        const wrapper = mount(TransactionInternalTxns, {
            props: {
                transaction: {}
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(spy).not.toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 