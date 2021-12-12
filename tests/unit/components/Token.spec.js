import MockHelper from '../MockHelper';

import Token from '@/components/Token.vue';

import AmalfiContract from '../fixtures/AmalfiContract';

describe('Token.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
        await helper.mocks.admin.collection('accounts').doc('0x1234').set({ address: '0x1234' });
        await helper.mocks.admin.collection('accounts').doc('0x1235').set({ address: '0x1235' });

        helper.mocks.server.callContractReadMethod.mockImplementation(() => {
            return new Promise((resolve) => resolve([10000000000000]));
        });
    });

    it('Should show the balances of tracked addresses', async (done) => {
        const wrapper = helper.mountFn(Token, {
            propsData: {
                contract: AmalfiContract
            }
        })

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
