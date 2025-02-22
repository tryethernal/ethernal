import flushPromises from 'flush-promises';
import GasTracker from '@/components/GasTracker.vue';

const stubs = ['MultiLineChart', 'LineChart', 'GasConsumers', 'GasSpender'];

describe('GasTracker.vue', () => {
    it('Should display gas tracker', async () => {
        vi.spyOn(server, 'getLatestGasStats')
            .mockResolvedValueOnce({ data: {
                baseFeePerGas: '10000000',
                averageBlockSize: 5,
                averageBlockTime: 12,
                averageUtilization: 0.05,
                latestBlockNumber: 10000000,
                latestBlockTimestamp: "2025-02-17T21:23:26.000Z",
                priorityFeePerGas: { slow: '10000000', average: '10000000', fast: '10000000' }
            }});
        vi.spyOn(server, 'getGasLimitHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', gasLimit: '10000000' },
                { day: '2025-02-16', gasLimit: '10000000' },
                { day: '2025-02-15', gasLimit: '10000000' },
            ]});
        vi.spyOn(server, 'getGasUtilizationRatioHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', gasUtilizationRatio: '0.05' },
                { day: '2025-02-16', gasUtilizationRatio: '0.05' },
                { day: '2025-02-15', gasUtilizationRatio: '0.05' },
            ]});
        vi.spyOn(server, 'getGasPriceHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
                { day: '2025-02-16', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
                { day: '2025-02-15', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
            ]});

        const wrapper = mount(GasTracker, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            explorer: { name: 'Ethernal' }
                        }
                    }
                })],
                provide: {
                    $server: server,
                    $fromWei: fromWei
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display very small gas speeds', async () => {
        vi.spyOn(server, 'getLatestGasStats')
            .mockResolvedValueOnce({ data: {
                baseFeePerGas: '7',
                averageBlockSize: 5,
                averageBlockTime: 12,
                averageUtilization: 0.05,
                latestBlockNumber: 10000000,
                latestBlockTimestamp: "2025-02-17T21:23:26.000Z",
                priorityFeePerGas: { slow: '0', average: '0', fast: '0' }
            }});
        vi.spyOn(server, 'getGasLimitHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', gasLimit: '10000000' },
                { day: '2025-02-16', gasLimit: '10000000' },
                { day: '2025-02-15', gasLimit: '10000000' },
            ]});
        vi.spyOn(server, 'getGasUtilizationRatioHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', gasUtilizationRatio: '0.05' },
                { day: '2025-02-16', gasUtilizationRatio: '0.05' },
                { day: '2025-02-15', gasUtilizationRatio: '0.05' },
            ]});
        vi.spyOn(server, 'getGasPriceHistory')
            .mockResolvedValueOnce({ data: [
                { day: '2025-02-17', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
                { day: '2025-02-16', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
                { day: '2025-02-15', slow: '10000000', average: '10000000', fast: '10000000', maxSlow: '10000000', maxAverage: '10000000', maxFast: '10000000', minSlow: '10000000', minAverage: '10000000', minFast: '10000000' },
            ]});

        const wrapper = mount(GasTracker, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            explorer: { name: 'Ethernal' }
                        }
                    }
                })],
                provide: {
                    $server: server,
                    $fromWei: fromWei
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should only display gas spender & consumers if no data is available', async () => {
        vi.spyOn(server, 'getLatestGasStats').mockResolvedValueOnce({ data: { baseFeePerGas: null }});
        vi.spyOn(server, 'getGasLimitHistory').mockResolvedValueOnce({ data: []});
        vi.spyOn(server, 'getGasUtilizationRatioHistory').mockResolvedValueOnce({ data: []});
        vi.spyOn(server, 'getGasPriceHistory').mockResolvedValueOnce({ data: []});

        const wrapper = mount(GasTracker, {
            global: {
                stubs,
                plugins: [createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            explorer: { name: 'Ethernal' }
                        }
                    }
                })],
                provide: {
                    $server: server,
                    $fromWei: fromWei
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
