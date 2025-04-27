import flushPromises from 'flush-promises'
import ERC721Collection from '@/components/ERC721Collection.vue';

const stubs = [
    'Base-Chip-Group',
    'Token-Header',
    'ERC20-Token-Holders',
    'ERC721-Token-Transfers',
    'Contract-Details',
    'NFT-Gallery'
];

describe('ERC721Collection.vue', () => {
    it('Should display a message if the address is not a contract', async () => {
        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: null,
                tokenTransferCount: null,
                tokenCirculatingSupply: null,
            }});

        const wrapper = mount(ERC721Collection, {
            props: {
                address: '0x123',
                contract: {},
                loadingContract: false
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract info', async () => {
        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 1,
                tokenTransferCount: 2,
                tokenCirculatingSupply: '1000000000',
            }});

        const wrapper = mount(ERC721Collection, {
            props: {
                address: '0x123',
                contract: {
                    tokenName: 'Amalfi',
                    patterns: ['erc721'],
                    tokenTotalSupply: 10000,
                    tokenDecimals: null,
                    address: '0x123',
                    creationTransaction: { hash: '0xabc' }
                },
                loadingContract: false
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
