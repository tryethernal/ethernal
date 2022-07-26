const ethers = require('ethers');
import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Transaction from '@/components/Transaction.vue';
import USDCTransferTx from '../fixtures/USDCTransferTx.json';

describe('Transaction.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display parsed error messages', async (done) => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                tokenTransfers: [],
                formattedBalanceChanges: {},
                receipt: { ...USDCTransferTx.receipt, status: 0 },
                parsedError: 'Error',
                rawError: null
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: ['Hash-Link', 'Token-Transfers', 'Tokens-Balance-Diff', 'Transaction-Data', 'Trace-Step']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display raw error messages', async (done) => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                tokenTransfers: [],
                formattedBalanceChanges: {},
                receipt: { ...USDCTransferTx.receipt, status: 0 },
                parsedError: null,
                rawError: JSON.stringify({ message: 'this is an error'})
            }});
        
        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: ['Hash-Link', 'Token-Transfers', 'Tokens-Balance-Diff', 'Transaction-Data', 'Trace-Step']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should not display the menu if public explorer', async (done) => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                tokenTransfers: [],
                formattedBalanceChanges: {},
                receipt: { ...USDCTransferTx.receipt, status: 1 },
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: ['Hash-Link', 'Token-Transfers', 'Tokens-Balance-Diff', 'Transaction-Data', 'Trace-Step'],
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});
