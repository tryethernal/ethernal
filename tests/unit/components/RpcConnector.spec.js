import MockHelper from '../MockHelper';

import RpcConnector from '@/components/RpcConnector.vue';

describe('RpcConnector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', async (done) => {
        const getAccountsMock = jest.spyOn(helper.mocks.server, 'getAccounts');
        const wrapper = helper.mountFn(RpcConnector);

        expect(getAccountsMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
