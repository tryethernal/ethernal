import flushPromises from 'flush-promises';
import ERC20Contract from '@/components/ERC20Contract.vue';

const stubs = [
    'Base-Chip-Group',
    'Token-Header',
    'ERC20-Token-Holders',
    'ERC20-Contract-Analytics',
    'Address-ERC20-Token-Transfer',
    'Contract-Details'
];

vi.mock('vue-router', () => ({
    useRoute: vi.fn(() => ({
        query: {
            tab: 'transfers'
        }
    })),
    useRouter: vi.fn(() => ({
        replace: vi.fn()
    }))
}));

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

        const wrapper = mount(ERC20Contract, {
            props: {
                address: '0x123',
                contract: {
                    tokenName: 'Amalfi',
                    patterns: ['erc20'],
                    tokenTotalSupply: '1000000000',
                    tokenDecimals: 2,
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

    it('Should display placeholders', async () => {
        vi.spyOn(server, 'getContractStats')
            .mockResolvedValueOnce({ data: {
                tokenHolderCount: 0,
                tokenTransferCount: 0,
                tokenCirculatingSupply: 0,
            }});

        const wrapper = mount(ERC20Contract, {
            props: {
                address: '0x123',
                contract: {},
                loadingContract: true
            },
            global: {
                stubs
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
