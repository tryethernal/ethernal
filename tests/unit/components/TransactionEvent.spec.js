import flushPromises from 'flush-promises';

import TransactionEvent from '@/components/TransactionEvent.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';
import LogProp from '../fixtures/LogProp.json';

describe('TransactionEvent.vue', () => {
    it('Should display in raw mode if no topics', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: {
                    ...LogProp,
                    topics: null
                }
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display short version', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp,
                short: true
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load erc20 abi if event is detected', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction event', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValue({ data: { address: TransactionProp.to, abi: ABIProp }});

        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction event for a proxied contract', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValue({ data: { address: TransactionProp.to, proxyContract: { address: '0x123', abi: ABIProp }}});

        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display warning if no ABI', async () => {
        const wrapper = mount(TransactionEvent, {
            props: {
                log: LogProp
            },
            global: {
                stubs: ['Hash-Link', 'Formatted-Sol-Var']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
