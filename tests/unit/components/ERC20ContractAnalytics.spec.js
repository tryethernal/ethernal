import flushPromises from 'flush-promises';
import ERC20ContractAnalytics from '@/components/ERC20ContractAnalytics.vue';

const stubs = [
    'Line-Chart',
];

describe('ERC20ContractAnalytics.vue', () => {

    it('Should display contract analytics with bignumber formatted amounts', async () => {
        vi.spyOn(server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getTokenCirculatingSupply')
            .mockResolvedValueOnce({ data: [
                { date: 0, amount: '200000000000000000' },
                { date: 1, amount: '300000000000000000' }
            ]});

        vi.spyOn(server, 'getTokenHolderHistory')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = mount(ERC20ContractAnalytics, {
            props: {
                address: '0x123',
                tokenDecimals: 18,
                tokenSymbol: 'ETL',
                tokenType: 'erc20'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract analytics without bignumber formatted amount', async () => {
        vi.spyOn(server, 'getTokenTransferVolume')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        vi.spyOn(server, 'getTokenCirculatingSupply')
            .mockResolvedValueOnce({ data: [
                { date: 0, amount: 2 },
                { date: 1, amount: 3 }
            ]});

        vi.spyOn(server, 'getTokenHolderHistory')
            .mockResolvedValueOnce({ data: [
                { date: 0, count: 2 },
                { date: 1, count: 2 }
            ]});

        const wrapper = mount(ERC20ContractAnalytics, {
            props: {
                address: '0x123',
                tokenDecimals: 18,
                tokenSymbol: 'ETL',
                tokenType: 'erc721'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
