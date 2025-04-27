import WorkspaceNFTTransfer from '@/components/WorkspaceNFTTransfer.vue';

const stubs = ['TokenTransfers', 'VProgressLinear'];

describe('WorkspaceNFTTransfer.vue', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the component with loading state', async () => {
        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockResolvedValueOnce({
            data: {
                items: [],
                count: 0
            }
        });

        const wrapper = mount(WorkspaceNFTTransfer, {
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render the component with data', async () => {
        const mockTransfers = [
            {
                transactionHash: '0x123',
                methodDetails: 'Transfer',
                timestamp: '2024-01-01',
                blockNumber: '100',
                src: '0xabc',
                dst: '0xdef',
                type: 'ERC721',
                token: 'NFT#1'
            }
        ];

        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockResolvedValueOnce({
            data: {
                items: mockTransfers,
                count: 1
            }
        });

        const wrapper = mount(WorkspaceNFTTransfer, {
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should handle sorting and pagination', async () => {
        const mockOptions = {
            page: 2,
            itemsPerPage: 10,
            sortBy: [{ key: 'timestamp', order: 'desc' }]
        };

        const mockTransfers = [
            {
                transactionHash: '0x123',
                methodDetails: 'Transfer',
                timestamp: '2024-01-01',
                blockNumber: '100',
                src: '0xabc',
                dst: '0xdef',
                type: 'ERC721',
                token: 'NFT#1'
            }
        ];

        const serverSpy = vi.spyOn(server, 'getWorkspaceTokenTransfers')
            .mockResolvedValueOnce({
                data: {
                    items: mockTransfers,
                    count: 1
                }
            });

        const wrapper = mount(WorkspaceNFTTransfer, {
            global: {
                stubs
            }
        });

        await flushPromises();
        await wrapper.findComponent({ name: 'TokenTransfers' }).vm.$emit('update:options', mockOptions);
        await flushPromises();

        expect(serverSpy).toHaveBeenCalledWith({
            page: mockOptions.page,
            limit: mockOptions.itemsPerPage,
            orderBy: mockOptions.sortBy[0].key,
            order: mockOptions.sortBy[0].order,
            tokenTypes: ['erc721', 'erc1155']
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('should handle API errors', async () => {
        vi.spyOn(server, 'getWorkspaceTokenTransfers').mockRejectedValueOnce(new Error('API Error'));

        const wrapper = mount(WorkspaceNFTTransfer, {
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
}); 