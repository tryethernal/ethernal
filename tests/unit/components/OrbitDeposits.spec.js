import OrbitDeposits from '@/components/OrbitDeposits.vue';

const stubs = ['HashLink'];

const mockCurrentWorkspaceStore = {
    orbitConfig: {
        parentChainExplorer: 'https://etherscan.io'
    }
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

describe('OrbitDeposits.vue', () => {
    vi.spyOn(server, 'getOrbitDeposits').mockResolvedValueOnce({
        data: {
            items: [
                {
                    l1Block: 12345,
                    messageIndex: 1,
                    l2TransactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
                    timestamp: '2024-01-15T10:30:00Z',
                    status: 'confirmed',
                    l1TransactionHash: '0x1234567890abcdef1234567890abcdef12345678'
                },
                {
                    l1Block: 12346,
                    messageIndex: 2,
                    l2TransactionHash: null,
                    timestamp: '2024-01-15T11:00:00Z',
                    status: 'pending',
                    l1TransactionHash: '0x9876543210fedcba9876543210fedcba98765432'
                },
                {
                    l1Block: 12347,
                    messageIndex: 3,
                    l2TransactionHash: '0xfedcba0987654321fedcba0987654321fedcba09',
                    timestamp: '2024-01-15T11:30:00Z',
                    status: 'failed',
                    l1TransactionHash: '0x5555555555555555555555555555555555555555'
                }
            ],
            total: 3
        }
    });

    it('Should show the deposits component with data', async () => {
        const wrapper = mount(OrbitDeposits, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show no data message when no deposits', async () => {
        vi.spyOn(server, 'getOrbitDeposits').mockResolvedValueOnce({
            data: {
                items: [],
                total: 0
            }
        });

        const wrapper = mount(OrbitDeposits, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle server error gracefully', async () => {
        vi.spyOn(server, 'getOrbitDeposits').mockRejectedValueOnce(new Error('Server error'));

        const wrapper = mount(OrbitDeposits, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
