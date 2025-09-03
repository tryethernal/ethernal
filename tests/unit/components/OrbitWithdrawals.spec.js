import OrbitWithdrawals from '@/components/OrbitWithdrawals.vue';

const stubs = ['HashLink'];

const mockCurrentWorkspaceStore = {
    orbitConfig: {
        parentChainExplorer: 'https://etherscan.io'
    }
};

const mockExplorerStore = {
    token: 'ETH'
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

vi.mock('@/stores/explorer', () => ({
    useExplorerStore: vi.fn(() => mockExplorerStore)
}));

describe('OrbitWithdrawals.vue', () => {
    vi.spyOn(server, 'getOrbitWithdrawals').mockResolvedValueOnce({
        data: {
            items: [
                {
                    messageNumber: 1,
                    from: '0x1234567890123456789012345678901234567890',
                    l2TransactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                    timestamp: '2024-01-01T00:00:00Z',
                    amount: '1000000000000000000',
                    tokenDecimals: 18,
                    tokenSymbol: 'ETH',
                    l1TokenAddress: '0x1111111111111111111111111111111111111111',
                    status: 'ready',
                    l1TransactionHash: null
                },
                {
                    messageNumber: 2,
                    from: '0x0987654321098765432109876543210987654321',
                    l2TransactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    timestamp: '2024-01-02T00:00:00Z',
                    amount: '2000000000000000000',
                    tokenDecimals: 18,
                    tokenSymbol: 'USDC',
                    l1TokenAddress: '0x2222222222222222222222222222222222222222',
                    status: 'relayed',
                    l1TransactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333'
                }
            ],
            total: 2
        }
    });

    it('Should show the component with withdrawals data', async () => {
        const wrapper = mount(OrbitWithdrawals, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show empty state when no withdrawals', async () => {
        vi.spyOn(server, 'getOrbitWithdrawals').mockResolvedValueOnce({
            data: {
                items: [],
                total: 0
            }
        });

        const wrapper = mount(OrbitWithdrawals, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle server error gracefully', async () => {
        vi.spyOn(server, 'getOrbitWithdrawals').mockRejectedValueOnce(new Error('Server error'));

        const wrapper = mount(OrbitWithdrawals, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
