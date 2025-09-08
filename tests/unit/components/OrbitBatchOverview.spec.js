import OrbitBatchOverview from '@/components/OrbitBatchOverview.vue';

const stubs = {
    'router-link': {
        template: '<a><slot /></a>',
        props: ['to']
    }
};

const mockCurrentWorkspaceStore = {
    parentChainExplorer: 'https://etherscan.io'
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

describe('OrbitBatchOverview.vue', () => {
    it('Should show the component with confirmed batch data', async () => {
        const mockBatch = {
            batchSequenceNumber: 123,
            confirmationStatus: 'confirmed',
            postedAt: '2024-01-01T12:00:00Z',
            transactionCount: 15,
            blockCount: 3,
            parentChainTxHash: '0x1234567890abcdef1234567890abcdef12345678',
            parentChainBlockNumber: 12345,
            beforeAcc: '0xabcdef1234567890abcdef1234567890abcdef12',
            afterAcc: '0xfedcba0987654321fedcba0987654321fedcba09'
        };

        const wrapper = mount(OrbitBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 1, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with pending batch data', async () => {
        const mockBatch = {
            batchSequenceNumber: 456,
            confirmationStatus: 'pending',
            postedAt: '2024-01-02T15:30:00Z',
            transactionCount: 8,
            blockCount: 2,
            parentChainTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
            parentChainBlockNumber: 54321,
            beforeAcc: '0x1111111111111111111111111111111111111111',
            afterAcc: '0x2222222222222222222222222222222222222222'
        };

        const wrapper = mount(OrbitBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 2, 2024'),
                        fromNow: vi.fn().mockReturnValue('1 hour ago')
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with challenged batch data', async () => {
        const mockBatch = {
            batchSequenceNumber: 789,
            confirmationStatus: 'challenged',
            postedAt: '2024-01-03T09:15:00Z',
            transactionCount: 0,
            blockCount: 0,
            parentChainTxHash: '0x3333333333333333333333333333333333333333',
            parentChainBlockNumber: 98765,
            beforeAcc: '0x4444444444444444444444444444444444444444',
            afterAcc: '0x5555555555555555555555555555555555555555'
        };

        const wrapper = mount(OrbitBatchOverview, {
            props: {
                batch: mockBatch
            },
            global: {
                stubs,
                provide: {
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 3, 2024'),
                        fromNow: vi.fn().mockReturnValue('30 minutes ago')
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
