import TokenHeader from '@/components/TokenHeader.vue';

const stubs = ['Hash-Link'];

describe('TokenHeader.vue', () => {
    it('Should show the component with all data', async () => {
        const wrapper = mount(TokenHeader, {
            props: {
                contract: {
                    address: '0x123',
                    tokenTotalSupply: '1000000000000000000',
                    tokenDecimals: 18,
                    tokenSymbol: 'TEST',
                    creationTransaction: {
                        hash: '0xabc'
                    }
                },
                stats: {
                    tokenHolderCount: 100,
                    tokenTransferCount: 500
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show N/A when no total supply', async () => {
        const wrapper = mount(TokenHeader, {
            props: {
                contract: {
                    address: '0x123',
                    tokenDecimals: 18,
                    tokenSymbol: 'TEST'
                },
                stats: {
                    tokenHolderCount: 100,
                    tokenTransferCount: 500
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show component without creation transaction', async () => {
        const wrapper = mount(TokenHeader, {
            props: {
                contract: {
                    address: '0x123',
                    tokenTotalSupply: '1000000000000000000',
                    tokenDecimals: 18,
                    tokenSymbol: 'TEST'
                },
                stats: {
                    tokenHolderCount: 100,
                    tokenTransferCount: 500
                }
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show zero values when stats are empty', async () => {
        const wrapper = mount(TokenHeader, {
            props: {
                contract: {
                    address: '0x123',
                    tokenTotalSupply: '1000000000000000000',
                    tokenDecimals: 18,
                    tokenSymbol: 'TEST'
                },
                stats: {}
            },
            global: {
                stubs
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 