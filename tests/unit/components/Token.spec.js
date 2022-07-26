import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import Token from '@/components/Token.vue';

import AmalfiContract from '../fixtures/AmalfiContract';

describe('Token.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should show the balances of tracked addresses', async (done) => {
        jest.spyOn(helper.mocks.server, 'callContractReadMethod')
            .mockResolvedValue([10000000000000]);

        jest.spyOn(helper.mocks.server, 'getAccounts')
            .mockResolvedValue({ data: { items: [{ address: '0x1234' }, { address: '0x1235' }]}});

        const wrapper = helper.mountFn(Token, {
            propsData: {
                contract: AmalfiContract
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });
});
