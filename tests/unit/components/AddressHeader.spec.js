import flushPromises from 'flush-promises'

import AddressHeader from '@/components/AddressHeader.vue';

const stubs = ['HashLink'];

describe('AddressHeader.vue', () => {
    it('Should show loading state', async () => {
        const wrapper = mount(AddressHeader, {
            props: {
                loadingBalance: true,
                loadingStats: true,
                balance: 0,
                contract: null
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display contract info', async () => {
        const wrapper = mount(AddressHeader, {
            props: {
                loadingBalance: false,
                loadingStats: false,
                balance: '1000000000000000000',
                contract: {
                    name: 'Test Contract',
                    tokenName: 'Test Token',
                    tokenSymbol: 'TEST',
                    tokenDecimals: 18,
                    creationTransaction: {
                        from: '0x1234567890123456789012345678901234567890',
                        hash: '0x1234567890123456789012345678901234567890'
                    }
                },
                addressTransactionStats: {
                    last_transaction_hash: '0x1234567890123456789012345678901234567890',
                    last_transaction_timestamp: '2021-01-01',
                    first_transaction_hash: '0x1234567890123456789012345678901234567890',
                    first_transaction_timestamp: '2021-01-01'
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: {
                    currentWorkspace: {
                        chain: {
                            token: 'ETH'
                        }
                    }
                }})],
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display address info', async () => {
        const wrapper = mount(AddressHeader, {
            props: {
                loadingBalance: false,
                loadingStats: false,
                balance: '1000000000000000000',
                addressTransactionStats: {
                    last_transaction_hash: '0x1234567890123456789012345678901234567890',
                    last_transaction_timestamp: '2021-01-01',
                    first_transaction_hash: '0x1234567890123456789012345678901234567890',
                    first_transaction_timestamp: '2021-01-01'
                }
            },
            global: {
                plugins: [createTestingPinia({ initialState: {
                    currentWorkspace: {
                        chain: {
                            token: 'ETH'
                        }
                    }
                }})],
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
