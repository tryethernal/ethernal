import flushPromises from 'flush-promises';
import Address from '@/components/Address.vue';

const stubs = [
    'Hash-Link',
    'Address-Transactions-List',
    'Address-Token-Transfers',
    'Token-Balances'
];

describe('Address.vue', () => {
    beforeAll(() => {
        vi.spyOn(server, 'getNativeTokenBalance')
            .mockResolvedValue({ data: { balance: '10000' }});
        vi.spyOn(server, 'getAddressTransactions')
            .mockResolvedValue({ data: { items: [] }});
        vi.spyOn(server, 'getAddressStats')
            .mockResolvedValue({ data: {
                sentTransactionCount: 1,
                receivedTransactionCount: 2,
                sentErc20TokenTransferCount: 3,
                receivedErc20TokenTransferCount: 4
            }});
    });

    it('Should display EOA accounts stats', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: null });
        const wrapper = mount(Address, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        query: {
                            tab: 'transactions'
                        }
                    }
                }
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ERC20 contract stats', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'ERC20 Contract',
                patterns: ['erc20'],
                tokenName: 'ERC20 Token',
                tokenSymbol: 'ERC',
                tokenDecimals: 18,
                address: '0x123',
                creationTransaction: '0xabc'
            }});

        const wrapper = mount(Address, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        query: {
                            tab: 'transactions'
                        }
                    }
                }
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display ERC721 contract stats', async () => {
        vi.spyOn(server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'ERC721 Contract',
                patterns: ['erc721'],
                tokenName: 'ERC721 Token',
                tokenSymbol: 'ERC',
                tokenDecimals: 18,
                address: '0x123',
                creationTransaction: '0xabc'
            }});

        const wrapper = mount(Address, {
            props: {
                hash: '0x123'
            },
            global: {
                stubs,
                mocks: {
                    $route: {
                        query: {
                            tab: 'transactions'
                        }
                    }
                }
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
