import flushPromises from 'flush-promises';

import TokenTransfers from '@/components/TokenTransfers.vue';

describe('TokenTransfers.vue', () => {
    it('Should display erc721 token transfers', async () => {
        const wrapper = mount(TokenTransfers, {
            props: {
                headers: [
                    { title: 'Type', key: 'type' },
                    { title: 'From', key: 'src' },
                    { title: 'To', key: 'dst' },
                    { title: 'Token', key: 'token' },
                    { title: 'Amount', key: 'amount' }
                ],
                transfers: [
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        tokenId: "1",
                        amount: 1

                    },
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        tokenId: "2",
                        amount: 1
                    }
                ],
                count: 2
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display fomatted amounts if info is present on token contract', async () => {
        const wrapper = mount(TokenTransfers, {
            props: {
                headers: [
                    { title: 'From', key: 'src' },
                    { title: 'To', key: 'dst' },
                    { title: 'Amount', key: 'amount' }
                ],
                transfers: [
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        amount: '100000000000000000',
                        contract: { tokenDecimals: 18, tokenSymbol: 'ETL', tokenName: 'Ethernal', patterns: ['erc20'] }
                    },
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        amount: '100000000000000000',
                        contract: { tokenDecimals: 18, tokenSymbol: 'ETL', tokenName: 'Ethernal', patterns: ['erc20'] }
                    }
                ],
                count: 2
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
