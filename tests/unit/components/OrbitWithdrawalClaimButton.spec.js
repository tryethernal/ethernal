import OrbitWithdrawalClaimButton from '@/components/OrbitWithdrawalClaimButton.vue';

const mockCurrentWorkspaceStore = {
    getViemBrowserClient: {
        sendTransaction: vi.fn()
    }
};

const mockWalletStore = {
    connectedAddress: '0x1234567890abcdef1234567890abcdef12345678'
};

vi.mock('@/stores/currentWorkspace', () => ({
    useCurrentWorkspaceStore: vi.fn(() => mockCurrentWorkspaceStore)
}));

vi.mock('@/stores/walletStore', () => ({
    useWalletStore: vi.fn(() => mockWalletStore)
}));

vi.mock('@/lib/chains', () => ({
    default: vi.fn(() => ({ id: 1, name: 'Ethereum' }))
}));

describe('OrbitWithdrawalClaimButton.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Should show the claim button', async () => {
        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show loading state when claiming', async () => {
        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockResolvedValueOnce({
            data: {
                callData: '0x1234567890abcdef',
                to: '0x9876543210fedcba9876543210fedcba98765432',
                l1ChainId: 1,
                l1RpcServer: 'https://eth-mainnet.alchemyapi.io/v2/test'
            }
        });

        mockCurrentWorkspaceStore.getViemBrowserClient.sendTransaction.mockResolvedValueOnce('0xtxhash1234567890abcdef1234567890abcdef12');

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button to trigger loading state
        await wrapper.find('button').trigger('click');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should successfully claim withdrawal', async () => {
        const mockCallData = {
            data: {
                callData: '0x1234567890abcdef',
                to: '0x9876543210fedcba9876543210fedcba98765432',
                l1ChainId: 1,
                l1RpcServer: 'https://eth-mainnet.alchemyapi.io/v2/test'
            }
        };

        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockResolvedValueOnce(mockCallData);
        mockCurrentWorkspaceStore.getViemBrowserClient.sendTransaction.mockResolvedValueOnce('0xtxhash1234567890abcdef1234567890abcdef12');

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button
        await wrapper.find('button').trigger('click');
        await flushPromises();

        // Verify server call was made with correct parameters
        expect(server.getOrbitWithdrawalClaimCallData).toHaveBeenCalledWith(
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            1
        );

        // Verify transaction was sent
        expect(mockCurrentWorkspaceStore.getViemBrowserClient.sendTransaction).toHaveBeenCalledWith({
            data: '0x1234567890abcdef',
            to: '0x9876543210fedcba9876543210fedcba98765432',
            chain: { id: 1, name: 'Ethereum' },
            account: '0x1234567890abcdef1234567890abcdef12345678'
        });

        // Verify success event was emitted
        expect(wrapper.emitted('success')).toBeTruthy();
        expect(wrapper.emitted('success')[0]).toEqual(['0xtxhash1234567890abcdef1234567890abcdef12']);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle server error when getting call data', async () => {
        const serverError = new Error('Server error');
        serverError.shortMessage = 'Failed to get call data';
        
        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockRejectedValueOnce(serverError);

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button
        await wrapper.find('button').trigger('click');
        await flushPromises();

        // Verify error event was emitted
        expect(wrapper.emitted('error')).toBeTruthy();
        expect(wrapper.emitted('error')[0]).toEqual(['Failed to get call data']);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle transaction error', async () => {
        const mockCallData = {
            data: {
                callData: '0x1234567890abcdef',
                to: '0x9876543210fedcba9876543210fedcba98765432',
                l1ChainId: 1,
                l1RpcServer: 'https://eth-mainnet.alchemyapi.io/v2/test'
            }
        };

        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockResolvedValueOnce(mockCallData);
        
        const transactionError = new Error('Transaction failed');
        transactionError.shortMessage = 'User rejected transaction';
        mockCurrentWorkspaceStore.getViemBrowserClient.sendTransaction.mockRejectedValueOnce(transactionError);

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button
        await wrapper.find('button').trigger('click');
        await flushPromises();

        // Verify error event was emitted
        expect(wrapper.emitted('error')).toBeTruthy();
        expect(wrapper.emitted('error')[0]).toEqual(['User rejected transaction']);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error with cause details', async () => {
        const serverError = new Error('Server error');
        serverError.cause = {
            details: 'Detailed error message'
        };
        
        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockRejectedValueOnce(serverError);

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button
        await wrapper.find('button').trigger('click');
        await flushPromises();

        // Verify error event was emitted with cause details
        expect(wrapper.emitted('error')).toBeTruthy();
        expect(wrapper.emitted('error')[0]).toEqual(['Detailed error message']);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle error with fallback to message', async () => {
        const serverError = new Error('Fallback error message');
        
        vi.spyOn(server, 'getOrbitWithdrawalClaimCallData').mockRejectedValueOnce(serverError);

        const wrapper = mount(OrbitWithdrawalClaimButton, {
            props: {
                hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                messageNumber: 1
            }
        });

        // Click the button
        await wrapper.find('button').trigger('click');
        await flushPromises();

        // Verify error event was emitted with fallback message
        expect(wrapper.emitted('error')).toBeTruthy();
        expect(wrapper.emitted('error')[0]).toEqual(['Fallback error message']);

        expect(wrapper.html()).toMatchSnapshot();
    });
});
