import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ExplorerAnalytics from '@/components/ExplorerAnalytics.vue';

let helper;
const stubs = [
    'Line-Chart',
];

describe('ExplorerAnalytics.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display charts', async () => {
        jest.spyOn(helper.mocks.server, 'getTransactionVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getAverageGasPrice')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        jest.spyOn(helper.mocks.server, 'getAverageTransactionFee')
            .mockResolvedValueOnce({ data: [
                { date: 0, avg: '200000000000000000' },
                { date: 1, avg: '300000000000000000' }
            ]});

        jest.spyOn(helper.mocks.server, 'getUniqueWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getCumulativeWalletCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getCumulativeDeployedContractCount')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = helper.mountFn(ExplorerAnalytics, { stubs });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
