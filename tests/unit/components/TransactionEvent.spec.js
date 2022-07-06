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

    it('Should display transaction event', async (done) => {
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
        done();
    });

    it('Should display transaction event for a proxied contract', async (done) => {
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
        done();
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
