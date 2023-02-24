import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'
import ERC721Collection from '@/components/ERC721Collection.vue';

const helper = new MockHelper();
const stubs = [
    'Hash-Link',
    'Stat-Number',
    'Metamask',
    'Contract-Interaction',
    'ERC-20-Token-Holders',
    'ERC-721-Gallery',
    'ERC-20-Contract-Analytics',
    'ERC-721-Token-Transfers',
    'Address-Transactions-List'
];

describe('ERC721Collection.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should display contract info', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                tokenName: 'Amalfi',
                patterns: ['erc721'],
                tokenTotalSupply: 10000,
                tokenDecimals: null,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        jest.spyOn(helper.mocks.server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 1,
                tokenTransferCount: 2,
                tokenCirculatingSupply: '1000000000',
            }});

        const wrapper = helper.mountFn(ERC721Collection, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
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
                creationTransaction: { hash: '0xabc' }
            }});

        jest.spyOn(helper.mocks.server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 0,
                tokenTransferCount: 0,
                tokenCirculatingSupply: 0,
            }});

        const wrapper = helper.mountFn(ERC721Collection, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
