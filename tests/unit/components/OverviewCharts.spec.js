import OverviewCharts from '@/components/OverviewCharts.vue';

const stubs = ['LineChart', 'BaseChipGroup'];

describe('OverviewCharts.vue', () => {
    beforeEach(() => {
        vi.spyOn(server, 'getTransactionVolume').mockResolvedValueOnce({
            data: [
                { date: '2024-01-01', count: '100' },
                { date: '2024-01-02', count: '200' }
            ]
        });
        vi.spyOn(server, 'getUniqueWalletCount').mockResolvedValueOnce({
            data: [
                { date: '2024-01-01', count: '50' },
                { date: '2024-01-02', count: '75' }
            ]
        });
    });

    it('Should show transaction volume chart by default', async () => {
        const wrapper = mount(OverviewCharts, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should switch to wallet count chart when wallet chip is selected', async () => {
        const wrapper = mount(OverviewCharts, {
            global: {
                stubs
            }
        });
        await flushPromises();

        // Find BaseChipGroup and emit update:modelValue event
        const chipGroup = wrapper.findComponent({ name: 'BaseChipGroup' });
        await chipGroup.vm.$emit('update:modelValue', 'wallets');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should call server methods on mount', async () => {
        mount(OverviewCharts, {
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(server.getTransactionVolume).toHaveBeenCalled();
        expect(server.getUniqueWalletCount).toHaveBeenCalled();
    });
}); 