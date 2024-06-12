import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Transaction from '@/components/Transaction.vue';
import USDCTransferTx from '../fixtures/USDCTransferTx.json';

const stubs = [
    'HashLink',
    'TransactionData',
    'TraceStep',
    'TransactionTokenTransfers',
    'TokensBalanceDiff'
];

describe('Transaction.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
        jest.spyOn(Date, 'now').mockImplementation(() => new Date('2022-08-07T12:33:37.000Z'));
    });

    it('Should display waiting message', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction').mockResolvedValueOnce({ data: {}});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the transaction when the receipt is not synced yet', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                receipt: null,
                block: { gasLimit: '1000' },
                traceSteps: [],
                formattedBalanceChanges: {},
                tokenTransferCount: 0,
                state: 'syncing'
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the transaction when the receipt is not synced yet for contract creation', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                receipt: null,
                to: null,
                block: { gasLimit: '1000' },
                traceSteps: [],
                formattedBalanceChanges: {},
                tokenTransferCount: 0,
                state: 'syncing'
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display parsed error messages', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                receipt: { ...USDCTransferTx.receipt, status: 0 },
                formattedBalanceChanges: {},
                tokenTransferCount: 0,
                parsedError: 'Error',
                rawError: null
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display raw error messages', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                formattedBalanceChanges: {},
                tokenTransferCount: 0,
                receipt: { ...USDCTransferTx.receipt, status: 0 },
                parsedError: null,
                rawError: JSON.stringify({ message: 'this is an error'})
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: stubs
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display the menu if public explorer', async () => {
        jest.spyOn(helper.mocks.server, 'getTransaction')
            .mockResolvedValue({ data: {
                ...USDCTransferTx,
                block: { gasLimit: '1000' },
                traceSteps: [],
                formattedBalanceChanges: {},
                tokenTransferCount: 2,
                receipt: { ...USDCTransferTx.receipt, status: 1 },
            }});

        const wrapper = helper.mountFn(Transaction, {
            propsData: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            stubs: stubs,
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
