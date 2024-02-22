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

    it('Should display contract analytics with bignumber formatted amounts', async () => {
        jest.spyOn(helper.mocks.server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenCirculatingSupply')
            .mockResolvedValueOnce({ data: [
                { date: 0, amount: '200000000000000000' },
                { date: 1, amount: '300000000000000000' }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenHolderHistory')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = helper.mountFn(ERC20ContractAnalytics, {
            propsData: {
                address: '0x123',
                tokenDecimals: 18,
                tokenSymbol: 'ETL',
                tokenType: 'erc20'
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract analytics without bignumber formatted amount', async () => {
        jest.spyOn(helper.mocks.server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenCirculatingSupply')
            .mockResolvedValueOnce({ data: [
                { date: 0, amount: 2 },
                { date: 1, amount: 3 }
            ]});

        jest.spyOn(helper.mocks.server, 'getTokenHolderHistory')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = helper.mountFn(ERC20ContractAnalytics, {
            propsData: {
                address: '0x123',
                tokenDecimals: 18,
                tokenSymbol: 'ETL',
                tokenType: 'erc721'
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
