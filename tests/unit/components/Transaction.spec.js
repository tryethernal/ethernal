import flushPromises from 'flush-promises';

import Transaction from '@/components/Transaction.vue';
import USDCTransferTx from '../fixtures/USDCTransferTx.json';

const stubs = [
    'TransactionOverview',
    'TransactionLogs',
    'TransactionInternalTxns',
    'TransactionState'
];

describe('Transaction.vue', () => {
    it('Should display skeleton loaders', async () => {
        let resolveFn;
        const mockPromise = new Promise(resolve => resolveFn = resolve);
        vi.spyOn(server, 'getTransaction').mockReturnValueOnce(mockPromise);

        const wrapper = mount(Transaction, {
            props: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            global: {
                stubs
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
        resolveFn({ data: {}});
        await flushPromises();
    });

    it('Should display waiting message', async () => {
        vi.spyOn(server, 'getTransaction').mockResolvedValueOnce({ data: {}});

        const wrapper = mount(Transaction, {
            props: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the transaction page', async () => {
        vi.spyOn(server, 'getTransaction').mockResolvedValueOnce({ data: {
            ...USDCTransferTx,
            internalTransactionCount: 2,
            tokenBalanceChangeCount: 2,
            receipt: {
                ...USDCTransferTx.receipt,
                logCount: 2
            }
        }});

        const wrapper = mount(Transaction, {
            props: {
                hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
    // it('Should display the transaction when the receipt is not synced yet', async () => {
    //     vi.spyOn(server, 'getTransaction')
    //         .mockResolvedValue({ data: {
    //             ...USDCTransferTx,
    //             receipt: null,
    //             block: { gasLimit: '1000' },
    //             traceSteps: [],
    //             formattedBalanceChanges: {},
    //             tokenTransferCount: 0,
    //             state: 'syncing'
    //         }});

    //     const wrapper = mount(Transaction, {
    //         props: {
    //             hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
    //         },
    //         global: {
    //             stubs
    //         }
    //     });
    //     await flushPromises();

    //     expect(wrapper.html()).toMatchSnapshot();
    // });

    // it('Should display parsed error messages', async () => {
    //     vi.spyOn(server, 'getTransaction')
    //         .mockResolvedValue({ data: {
    //             ...USDCTransferTx,
    //             block: { gasLimit: '1000' },
    //             traceSteps: [],
    //             receipt: { ...USDCTransferTx.receipt, status: 0 },
    //             formattedBalanceChanges: {},
    //             tokenTransferCount: 0,
    //             parsedError: 'Error',
    //             rawError: null
    //         }});

    //     const wrapper = mount(Transaction, {
    //         props: {
    //             hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
    //         },
    //         global: {
    //             stubs
    //         }
    //     });
    //     await flushPromises();

    //     expect(wrapper.html()).toMatchSnapshot();
    // });

    // it.only('Should display raw error messages', async () => {
    //     vi.spyOn(server, 'getTransaction')
    //         .mockResolvedValue({ data: {
    //             ...USDCTransferTx,
    //             block: { gasLimit: '1000' },
    //             traceSteps: [],
    //             formattedBalanceChanges: {},
    //             tokenTransferCount: 0,
    //             receipt: { ...USDCTransferTx.receipt, status: 0 },
    //             parsedError: null,
    //             rawError: JSON.stringify({ message: 'this is an error'})
    //         }});

    //     const wrapper = mount(Transaction, {
    //         props: {
    //             hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
    //         },
    //         global: {
    //             stubs
    //         }
    //     });
    //     await flushPromises();

    //     expect(wrapper.html()).toMatchSnapshot();
    // });

    // it('Should not display the menu if public explorer', async () => {
    //     vi.spyOn(server, 'getTransaction')
    //         .mockResolvedValue({ data: {
    //             ...USDCTransferTx,
    //             block: { gasLimit: '1000' },
    //             traceSteps: [],
    //             formattedBalanceChanges: {},
    //             tokenTransferCount: 2,
    //             receipt: { ...USDCTransferTx.receipt, status: 1 },
    //         }});

    //     const wrapper = mount(Transaction, {
    //         props: {
    //             hash: '0x05d709954d59bfaa43bcf629b0a415d30e56ab1400d96dc7bd0ed1664a702759'
    //         },
    //         global: {
    //             stubs,
    //             plugins: [createTestingPinia({
    //                 initialState: {
    //                     explorer: { id: 1, token: 'ETL' }
    //                 }
    //             })]
    //         }
    //     });
    //     await flushPromises();

    //     expect(wrapper.html()).toMatchSnapshot();
    // });
});
