import OrbitWithdrawal from '@/components/OrbitWithdrawal.vue';

const stubs = ['HashLink', 'OrbitWithdrawalClaimButton'];

const mockCurrentWorkspaceStore = {
    orbitConfig: {
        parentChainExplorer: 'https://etherscan.io'
    }
};

const mockExplorerStore = {
    token: 'ETH'
};

const mockRoute = {
    query: {}
};

const mockRouter = {
    push: vi.fn()
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

vi.mock('@/stores/explorer', () => ({
    useExplorerStore: vi.fn(() => mockExplorerStore)
}));

vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => mockRoute),
    useRouter: vi.fn(() => mockRouter)
}));

describe('OrbitWithdrawal.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRoute.query = {};
    });

    it('Should show the withdrawal component with empty state', async () => {
        vi.spyOn(server, 'getL2TransactionWithdrawals').mockResolvedValueOnce({
            data: {
                items: [],
                total: 0
            }
        });

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the withdrawal component with data', async () => {
        // Set the route query before creating the component
        mockRoute.query = { search: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
        
        // Update the mock to return the correct route
        const { useRoute } = await import('vue-router');
        useRoute.mockReturnValue(mockRoute);
        
        const mockData = {
            data: {
                items: [
                    {
                        messageNumber: 1,
                        to: '0x1234567890abcdef1234567890abcdef12345678',
                        amount: '1000000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'ETH',
                        l1TokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
                        status: 'ready'
                    },
                    {
                        messageNumber: 2,
                        to: '0x9876543210fedcba9876543210fedcba98765432',
                        amount: '2000000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'USDC',
                        l1TokenAddress: '0x9876543210fedcba9876543210fedcba98765432',
                        status: 'waiting'
                    },
                    {
                        messageNumber: 3,
                        to: '0x5555555555555555555555555555555555555555',
                        amount: '500000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'DAI',
                        l1TokenAddress: '0x5555555555555555555555555555555555555555',
                        status: 'relayed'
                    },
                    {
                        messageNumber: 4,
                        to: '0x6666666666666666666666666666666666666666',
                        amount: '1000000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'ETH',
                        l1TokenAddress: null,
                        status: 'failed'
                    }
                ],
                total: 4
            }
        };
        
        vi.spyOn(server, 'getL2TransactionWithdrawals').mockResolvedValueOnce(mockData);

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        // Verify the server function was called
        expect(server.getL2TransactionWithdrawals).toHaveBeenCalledWith('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle server error gracefully', async () => {
        mockRoute.query = { search: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
        
        vi.spyOn(server, 'getL2TransactionWithdrawals').mockRejectedValueOnce(new Error('Server error'));

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not make request with invalid hash length', async () => {
        mockRoute.query = { search: '0x123' };

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(server.getL2TransactionWithdrawals).not.toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show success message after claim success', async () => {
        mockRoute.query = { search: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
        
        vi.spyOn(server, 'getL2TransactionWithdrawals').mockResolvedValueOnce({
            data: {
                items: [
                    {
                        messageNumber: 1,
                        to: '0x1234567890abcdef1234567890abcdef12345678',
                        amount: '1000000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'ETH',
                        l1TokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
                        status: 'ready'
                    }
                ],
                total: 1
            }
        });

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        // Simulate claim success by calling the onClaimSuccess method directly
        await wrapper.vm.onClaimSuccess('0xclaimhash1234567890abcdef1234567890abcdef12');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error message after claim error', async () => {
        mockRoute.query = { search: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' };
        
        vi.spyOn(server, 'getL2TransactionWithdrawals').mockResolvedValueOnce({
            data: {
                items: [
                    {
                        messageNumber: 1,
                        to: '0x1234567890abcdef1234567890abcdef12345678',
                        amount: '1000000000000000000',
                        tokenDecimals: 18,
                        tokenSymbol: 'ETH',
                        l1TokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
                        status: 'ready'
                    }
                ],
                total: 1
            }
        });

        const wrapper = mount(OrbitWithdrawal, {
            global: {
                stubs
            }
        });
        await flushPromises();

        // Simulate claim error by calling the onClaimError method directly
        await wrapper.vm.onClaimError('Transaction failed');

        expect(wrapper.html()).toMatchSnapshot();
    });
});
