import flushPromises from 'flush-promises';
import ERC20Contract from '@/components/ERC20Contract.vue';

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
    it('Should display a message if the address is not a contract', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: null });

        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: null,
                tokenTransferCount: null,
                tokenCirculatingSupply: null,
            }});

        const wrapper = mount(ERC20Contract, {
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
                patterns: ['erc20'],
                tokenTotalSupply: '1000000000',
                tokenDecimals: 2,
                address: '0x123',
                creationTransaction: { hash: '0xabc' }
            }});

        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 1,
                tokenTransferCount: 2,
                tokenCirculatingSupply: '1000000000',
            }});

        const wrapper = mount(ERC20Contract, {
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

        const wrapper = mount(ERC20Contract, {
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
