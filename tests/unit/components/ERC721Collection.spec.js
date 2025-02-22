import flushPromises from 'flush-promises'
import ERC721Collection from '@/components/ERC721Collection.vue';

const stubs = [
    'Hash-Link',
    'Stat-Number',
    'Metamask',
    'Contract-Interaction',
    'ERC-20-Token-Holders',
    'ERC-721-Gallery',
    'ERC-20-Contract-Analytics',
    'ERC-721-Token-Transfers',
    'Address-Transactions-List',
    'Token-Balance-Card'
];

describe('ERC721Collection.vue', () => {

    it('Should display a message if the address is not a contract', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: null });

        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: null,
                tokenTransferCount: null,
                tokenCirculatingSupply: null,
            }});

        const wrapper = mount(ERC721Collection, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract info', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                tokenName: 'Amalfi',
                patterns: ['erc721'],
                tokenTotalSupply: 10000,
                tokenDecimals: null,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 1,
                tokenTransferCount: 2,
                tokenCirculatingSupply: '1000000000',
            }});

        const wrapper = mount(ERC721Collection, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display placeholders', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Amalfi',
                tokenName: null,
                patterns: [],
                tokenTotalSupply: null,
                tokenDecimals: null,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 0,
                tokenTransferCount: 0,
                tokenCirculatingSupply: 0,
            }});

        const wrapper = mount(ERC721Collection, {
            props: {
                address: '0x123'
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
