import MockHelper from '../MockHelper';

import TokenTransfers from '@/components/TokenTransfers.vue';

describe('TokenTransfers.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display token transfers', async (done) => {
        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                transfers: [
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' },
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' }
                ]
            }
        })

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display fomatted amounts if info is present on token contract', async (done) => {
        await helper.mocks.admin
            .collection('contracts')
            .doc('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')
            .set({ token: { decimals: 18, symbol: 'ETL', name: 'Ethernal' }});

        const wrapper = helper.mountFn(TokenTransfers, {
            propsData: {
                transfers: [
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' },
                    { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', src: '0xC056255e6B1E6001852f9f20587A964cb89418e7', dst: '0x4f6742bADB049791CD9A37ea913f2BAC38d01279', amount: '100000000000000000' }
                ]
            }
        })

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(() => helper.clearFirebase());
});
