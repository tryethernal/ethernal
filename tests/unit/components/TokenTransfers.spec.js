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
            withTransaction: true,
            withTokenData: false,
            propsData: {
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
                        tokenId: '2',
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

    it('Should display erc20 token transfers', async () => {
        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                withTransaction: false,
                withTokenData: true,
                transfers: [
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' },
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' }
                ]
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display fomatted amounts if info is present on token contract', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValue({ data: { tokenDecimals: 18, tokenSymbol: 'ETL', tokenName: 'Ethernal' }});

        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                withTransaction: false,
                withTokenData: true,
                transfers: [
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' },
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' }
                ]
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
