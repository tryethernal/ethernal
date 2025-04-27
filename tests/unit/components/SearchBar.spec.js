import SearchBar from '@/components/SearchBar.vue';
import { useRouter } from 'vue-router';

vi.mock('vue-router', () => ({
    useRouter: vi.fn()
}));

describe('SearchBar.vue', () => {
    const mockRouter = {
        push: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
    });

    it('Should show empty search bar', async () => {
        const wrapper = mount(SearchBar);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show compact search bar', async () => {
        const wrapper = mount(SearchBar, {
            props: {
                compact: true
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show loading state while searching', async () => {
        server.search.mockResolvedValueOnce({ data: [] });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('test');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle address search', async () => {
        const mockAddress = '0x1234567890123456789012345678901234567890';
        server.search.mockResolvedValueOnce({
            data: [{
                type: 'address',
                data: { address: mockAddress }
            }]
        });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search(mockAddress);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle transaction search', async () => {
        const mockTx = '0x1234567890123456789012345678901234567890123456789012345678901234';
        server.search.mockResolvedValueOnce({
            data: [{
                type: 'transaction',
                data: {
                    hash: mockTx,
                    blockNumber: 123456
                }
            }]
        });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search(mockTx);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle block search', async () => {
        server.search.mockResolvedValueOnce({
            data: [{
                type: 'block',
                data: {
                    number: 123456,
                    transactionsCount: 100
                }
            }]
        });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('123456');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle contract search', async () => {
        server.search.mockResolvedValueOnce({
            data: [{
                type: 'contract',
                data: {
                    address: '0x1234567890123456789012345678901234567890',
                    name: 'Test Contract',
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    patterns: ['erc20'],
                    verification: {
                        createdAt: '2023-01-01'
                    }
                }
            }]
        });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('test');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should navigate to address page on address selection', async () => {
        const mockAddress = '0x1234567890123456789012345678901234567890';
        server.search.mockResolvedValueOnce({ data: [] });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('test');
        wrapper.vm.searchSelectedItem = {
            type: 'address',
            data: { address: mockAddress }
        };
        await flushPromises();

        expect(mockRouter.push).toHaveBeenCalledWith({
            path: `/address/${mockAddress}`,
            query: { tab: 'transactions' }
        });
    });

    it('Should navigate to transaction page on transaction selection', async () => {
        const mockTx = '0x1234567890123456789012345678901234567890123456789012345678901234';
        server.search.mockResolvedValueOnce({ data: [] });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('test');
        wrapper.vm.searchSelectedItem = {
            type: 'transaction',
            data: { hash: mockTx }
        };
        await flushPromises();

        expect(mockRouter.push).toHaveBeenCalledWith({
            path: `/transaction/${mockTx}`
        });
    });

    it('Should navigate to block page on block selection', async () => {
        server.search.mockResolvedValueOnce({ data: [] });

        const wrapper = mount(SearchBar);

        await wrapper.vm.search('test');
        wrapper.vm.searchSelectedItem = {
            type: 'block',
            data: { number: 123456 }
        };
        await flushPromises();

        expect(mockRouter.push).toHaveBeenCalledWith({
            path: `/block/123456`
        });
    });
}); 