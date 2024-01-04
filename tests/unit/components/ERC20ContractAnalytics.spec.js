import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ERC20ContractAnalytics from '@/components/ERC20ContractAnalytics.vue';

let helper;
const stubs = [
    'Line-Chart',
];

describe('ERC20ContractAnalytics.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display contract analytics', async () => {
        jest.spyOn(helper.mocks.server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { timestamp: 0, count: 2 },
                { timestamp: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenCumulativeSupply')
            .mockResolvedValueOnce({ data: [
                { timestamp: 0, supply: 2 },
                { timestamp: 1, supply: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenHolderHistory')
            .mockResolvedValueOnce({ data: [
                { timestamp: 0, count: 2 },
                { timestamp: 1, count: 2 }
            ]});

        const wrapper = helper.mountFn(ERC20ContractAnalytics, {
            propsData: {
                address: '0x123',
                tokenDecimals: 1,
                tokenSymbol: 'ETL'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
