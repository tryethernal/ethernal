import OrbitBatches from '@/components/OrbitBatches.vue';

const stubs = ['router-link'];

const mockCurrentWorkspaceStore = {
    orbitConfig: {
        parentChainExplorer: 'https://etherscan.io'
    }
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

describe('OrbitBatches.vue', () => {
    it('Should show the component with batches data', async () => {
        const mockBatches = {
            data: {
                items: [
                    {
                        batchSequenceNumber: 1,
                        confirmationStatus: 'confirmed',
                        parentChainBlockNumber: 12345,
                        parentChainTxHash: '0x1234567890abcdef1234567890abcdef12345678',
                        postedAt: '2024-01-01T00:00:00Z',
                        transactionCount: 5
                    },
                    {
                        batchSequenceNumber: 2,
                        confirmationStatus: 'pending',
                        parentChainBlockNumber: 12346,
                        parentChainTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
                        postedAt: '2024-01-01T01:00:00Z',
                        transactionCount: 3
                    }
                ],
                total: 2
            }
        };

        vi.spyOn(server, 'getOrbitBatches').mockResolvedValueOnce(mockBatches);

        const wrapper = mount(OrbitBatches, {
            global: {
                stubs,
                provide: {
                    $server: server,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 1, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with no data', async () => {
        const mockBatches = {
            data: {
                items: [],
                total: 0
            }
        };

        vi.spyOn(server, 'getOrbitBatches').mockResolvedValueOnce(mockBatches);

        const wrapper = mount(OrbitBatches, {
            global: {
                stubs,
                provide: {
                    $server: server,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 1, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with challenged status', async () => {
        const mockBatches = {
            data: {
                items: [
                    {
                        batchSequenceNumber: 1,
                        confirmationStatus: 'challenged',
                        parentChainBlockNumber: 12345,
                        parentChainTxHash: '0x1234567890abcdef1234567890abcdef12345678',
                        postedAt: '2024-01-01T00:00:00Z',
                        transactionCount: 0
                    }
                ],
                total: 1
            }
        };

        vi.spyOn(server, 'getOrbitBatches').mockResolvedValueOnce(mockBatches);

        const wrapper = mount(OrbitBatches, {
            global: {
                stubs,
                provide: {
                    $server: server,
                    $dt: {
                        shortDate: vi.fn().mockReturnValue('Jan 1, 2024'),
                        fromNow: vi.fn().mockReturnValue('2 hours ago')
                    }
                }
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
