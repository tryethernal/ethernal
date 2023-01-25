import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import TokenTransfers from '@/components/TokenTransfers.vue';

describe('TokenTransfers.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display erc721 token transfers', async () => {
        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                headers: [
                    { text: 'Type', value: 'type' },
                    { text: 'From', value: 'src' },
                    { text: 'To', value: 'dst' },
                    { text: 'Token', value: 'token' },
                    { text: 'Amount', value: 'amount' }
                ],
                transfers: [
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        tokenId: 1,
                        transaction: {
                            hash: '0x123',
                            timestamp: 1662409422
                        }

                    },
                    {
                        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        src: '0xC056255e6B1E6001852f9f20587A964cb89418e7',
                        dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279',
                        tokenId: 2,
                        transaction: {
                            hash: '0x124',
                            timestamp: 1662409422
                        }
                    }
                ]
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display fomatted amounts if info is present on token contract', async () => {
        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                headers: [
                    { text: 'From', value: 'src' },
                    { text: 'To', value: 'dst' },
                    { text: 'Amount', value: 'amount' }
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
                ]
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
