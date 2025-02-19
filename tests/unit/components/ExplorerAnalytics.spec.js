import flushPromises from 'flush-promises';
import ExplorerAnalytics from '@/components/ExplorerAnalytics.vue';

const stubs = [
    'Line-Chart', 'Multi-Line-Chart'
];

describe('ExplorerAnalytics.vue', () => {
    it('Should display gas analytics', async () => {
        vi.spyOn(server, 'getTransactionVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getAverageGasPrice')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        vi.spyOn(server, 'getAverageTransactionFee')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        vi.spyOn(server, 'getUniqueWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getCumulativeWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getCumulativeDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getBlockSizeHistory')
            .mockResolvedValueOnce({ data: [
                { day: 0, size: 2 },
                { day: 1, size: 2 }
            ]});

        vi.spyOn(server, 'getBlockTimeHistory')
            .mockResolvedValueOnce({ data: [
                { day: 0, blockTime: 2 },
                { day: 1, blockTime: 2 }
            ]});

        vi.spyOn(server, 'getGasPriceHistory')
            .mockResolvedValueOnce({ data: [
                { day: 0, slow: 2, average: 2, fast: 2 },
                { day: 1, slow: 2, average: 2, fast: 2 }
            ]});

        vi.spyOn(server, 'getGasLimitHistory')
            .mockResolvedValueOnce({ data: [
                { day: 0, limit: 2 },
                { day: 1, limit: 2 }
            ]});

        vi.spyOn(server, 'getGasUtilizationRatioHistory')
            .mockResolvedValueOnce({ data: [
                { day: 0, ratio: 2 },
                { day: 1, ratio: 2 }
            ]});

        const wrapper = mount(ExplorerAnalytics, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: {
                            gasAnalyticsEnabled: true
                        }
                    }
                })]
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display charts', async () => {
        vi.spyOn(server, 'getTransactionVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getAverageGasPrice')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        vi.spyOn(server, 'getAverageTransactionFee')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        vi.spyOn(server, 'getUniqueWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getCumulativeWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getCumulativeDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = mount(ExplorerAnalytics, {
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
