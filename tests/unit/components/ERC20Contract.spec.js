import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises';
import ERC20Contract from '@/components/ERC20Contract.vue';

let helper;
const stubs = [
    'Hash-Link',
    'Stat-Number',
    'Transactions-List',
    'Contract-Interaction',
    'ERC-2O-Token-Holders',
    'ERC-2O-Contract-Analytics',
    'ERC-2O-Token-Transfers',
    'Metamask'
];

describe('ERC20Contract.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display contract info', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                tokenName: 'Amalfi',
                patterns: ['erc20'],
                tokenTotalSupply: '1000000000',
                tokenDecimals: 2,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        jest.spyOn(helper.mocks.server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 1,
                tokenTransferCount: 2,
                tokenCirculatingSupply: '1000000000',
            }});

        const wrapper = helper.mountFn(ERC20Contract, {
            propsData: {
                address: '0x123'
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display placeholders', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Amalfi',
                tokenName: null,
                patterns: [],
                tokenTotalSupply: null,
                tokenDecimals: null,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        jest.spyOn(helper.mocks.server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 0,
                tokenTransferCount: 0,
                tokenCirculatingSupply: 0,
            }});

        const wrapper = helper.mountFn(ERC20Contract, {
            propsData: {
                address: '0x123'
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
