import flushPromises from 'flush-promises';
import ExplorerAnalytics from '@/components/ExplorerAnalytics.vue';

const stubs = [
    'Line-Chart',
];

describe('ExplorerAnalytics.vue', () => {
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
