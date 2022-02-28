import MockHelper from '../MockHelper';

import RpcConnector from '@/components/RpcConnector.vue';

describe('RpcConnector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', (done) => {
        const getAccountsMock = jest.spyOn(helper.mocks.server, 'getAccounts');
        const onNewContractMock = jest.spyOn(helper.mocks.db, 'onNewContract');
        const processContractMock = jest.spyOn(helper.mocks.server, 'processContracts');
        const wrapper = helper.mountFn(RpcConnector);

        expect(getAccountsMock).toHaveBeenCalled();
        expect(onNewContractMock).toHaveBeenCalled();
        expect(processContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should not do private operations when in public explorer mode', (done) => {
        helper.getters.isPublicExplorer.mockImplementation(() => true);

        const getAccountsMock = jest.spyOn(helper.mocks.server, 'getAccounts');
        const onNewContractMock = jest.spyOn(helper.mocks.db, 'onNewContract');
        const processContractMock = jest.spyOn(helper.mocks.server, 'processContracts');
        const wrapper = helper.mountFn(RpcConnector);

        expect(getAccountsMock).not.toHaveBeenCalled();
        expect(onNewContractMock).not.toHaveBeenCalled();
        expect(processContractMock).not.toHaveBeenCalled();

        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
