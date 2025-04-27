import ERC20TokenHolders from '@/components/ERC20TokenHolders.vue';

describe('ERC20TokenHolders.vue', () => {
    const stubs = ['Hash-Link'];
    const mockFromWei = vi.fn().mockReturnValue('100 TEST');
    const mockAddress = '0x123';
    const mockTokenDecimals = '18';
    const mockTokenSymbol = 'TEST';
    const mockHolders = {
        data: {
            items: [{
                address: '0xabc',
                amount: '1000000000000000000',
                share: 0.5
            }],
            total: 1
        }
    };

    beforeEach(() => {
        vi.spyOn(server, 'getTokenHolders').mockResolvedValueOnce(mockHolders);
    });

    const mountComponent = () => {
        return mount(ERC20TokenHolders, {
            props: {
                address: mockAddress,
                tokenDecimals: mockTokenDecimals,
                tokenSymbol: mockTokenSymbol
            },
            global: {
                stubs,
                provide: {
                    $server: server,
                    $fromWei: mockFromWei
                }
            }
        });
    };

    it('Should show the token holders table', async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should call getTokenHolders with correct parameters', async () => {
        const wrapper = mountComponent();
        await flushPromises();

        expect(server.getTokenHolders).toHaveBeenCalledWith(mockAddress, {
            page: 1,
            itemsPerPage: 10,
            orderBy: 'amount',
            order: 'desc'
        });
    });

    it('Should format small shares correctly', async () => {
        vi.spyOn(server, 'getTokenHolders').mockResolvedValueOnce({
            data: {
                items: [{
                    address: '0xabc',
                    amount: '1000000000000000000',
                    share: 0.00009
                }],
                total: 1
            }
        });

        const wrapper = mountComponent();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle table options update', async () => {
        const wrapper = mountComponent();
        await flushPromises();

        vi.spyOn(server, 'getTokenHolders').mockResolvedValueOnce(mockHolders);

        await wrapper.vm.getHolders({
            page: 2,
            itemsPerPage: 25,
            sortBy: [{ key: 'share', order: 'asc' }]
        });

        expect(server.getTokenHolders).toHaveBeenCalledWith(mockAddress, {
            page: 2,
            itemsPerPage: 25,
            orderBy: 'share',
            order: 'asc'
        });
    });
}); 