import TransactionOverview from '@/components/TransactionOverview.vue';

vi.mock('@/stores/explorer', () => ({
    useExplorerStore: vi.fn(() => ({
        l1Explorer: null
    }))
}));

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => ({
        chain: {
            token: 'ETH'
        },
        currentBlock: {
            number: 105
        }
    }))
}));

describe('TransactionOverview.vue', () => {
    const stubs = [
        'Hash-Link',
        'Expandable-Text',
        'Custom-Field',
        'Compact-Transaction-Token-Transfers',
        'Transaction-Function-Call'
    ];

    const mockTransaction = {
        hash: '0x123',
        from: '0x456',
        to: '0x789',
        value: '1000000000000000000',
        gasPrice: '20000000000',
        gasLimit: '21000',
        nonce: 1,
        blockNumber: 100,
        timestamp: Date.now(),
        receipt: {
            status: true,
            gasUsed: '21000',
            contractAddress: null,
            baseFeePerGas: '10000000000'
        },
        type: 2,
        maxFeePerGas: '30000000000',
        maxPriorityFeePerGas: '2000000000',
        block: {
            baseFeePerGas: '10000000000',
            number: 105
        },
        tokenTransferCount: 2,
        extraFields: [
            {
                name: 'Test Field',
                value: 'Test Value',
                type: 'string',
                title: 'Test Title'
            }
        ],
        raw: {
            maxFeePerGas: '30000000000'
        }
    };

    const mockFromWei = vi.fn((value) => `${value} ETH`);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should render successful transaction', async () => {
        const wrapper = mount(TransactionOverview, {
            props: {
                transaction: mockTransaction
            },
            global: {
                stubs,
                provide: {
                    $fromWei: mockFromWei,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('2024-03-21'),
                        fromNow: vi.fn().mockReturnValue('a few seconds ago')
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render failed transaction', async () => {
        const failedTransaction = {
            ...mockTransaction,
            receipt: {
                ...mockTransaction.receipt,
                status: false
            },
            parsedError: 'Transaction failed'
        };

        const wrapper = mount(TransactionOverview, {
            props: {
                transaction: failedTransaction
            },
            global: {
                stubs,
                provide: {
                    $fromWei: mockFromWei,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('2024-03-21'),
                        fromNow: vi.fn().mockReturnValue('a few seconds ago')
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render pending transaction', async () => {
        const pendingTransaction = {
            ...mockTransaction,
            receipt: null,
            blockNumber: null,
            timestamp: null
        };

        const wrapper = mount(TransactionOverview, {
            props: {
                transaction: pendingTransaction
            },
            global: {
                stubs,
                provide: {
                    $fromWei: mockFromWei,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('2024-03-21'),
                        fromNow: vi.fn().mockReturnValue('a few seconds ago')
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render contract creation transaction', async () => {
        const contractCreationTransaction = {
            ...mockTransaction,
            to: null,
            receipt: {
                ...mockTransaction.receipt,
                contractAddress: '0xabc'
            },
            data: '0x123456'
        };

        const wrapper = mount(TransactionOverview, {
            props: {
                transaction: contractCreationTransaction
            },
            global: {
                stubs,
                provide: {
                    $fromWei: mockFromWei,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('2024-03-21'),
                        fromNow: vi.fn().mockReturnValue('a few seconds ago')
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit error when error is caught', async () => {
        const errorFromWei = vi.fn(() => {
            throw new Error('Test error');
        });

        const wrapper = mount(TransactionOverview, {
            props: {
                transaction: {
                    ...mockTransaction,
                    receipt: undefined
                }
            },
            global: {
                stubs,
                provide: {
                    $fromWei: errorFromWei,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('2024-03-21'),
                        fromNow: vi.fn().mockReturnValue('a few seconds ago')
                    }
                }
            }
        });
        await flushPromises();

        expect(wrapper.emitted().error).toBeTruthy();
    });
}); 