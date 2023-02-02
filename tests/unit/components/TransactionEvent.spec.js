import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TransactionEvent from '@/components/TransactionEvent.vue';
import TransactionProp from '../fixtures/TransactionProp.json';
import ABIProp from '../fixtures/ABIProp.json';
import LogProp from '../fixtures/LogProp.json';

describe('TransactionEvent.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display short version', async () => {
        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp,
                short: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load erc20 abi if event is detected', async () => {
        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction event', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({ data: { address: TransactionProp.to, abi: ABIProp }});

        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
            },
            stubs: ['Hash-Link', 'Formatted-Sol-Var']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display transaction event for a proxied contract', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({ data: { address: TransactionProp.to, proxyContract: { address: '0x123', abi: ABIProp }}});

        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
            },
            stubs: ['Hash-Link', 'Formatted-Sol-Var']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display warning if no ABI', () => {
        const wrapper = helper.mountFn(TransactionEvent, {
            propsData: {
                log: LogProp
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });    
});
