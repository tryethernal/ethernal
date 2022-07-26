import MockHelper from '../MockHelper';
import '../mocks/db';
import { auth } from '@/plugins/firebase';

import RpcConnector from '@/components/RpcConnector.vue';

describe('RpcConnector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', () => {
        auth.mockReturnValue({ currentUser: { id: '1' }});
        jest.spyOn(helper.mocks.server, 'getBlocks').mockResolvedValue({ data: { items: [] }});

        const onNewContractMock = jest.spyOn(helper.mocks.pusher, 'onNewContract');
        const processContractMock = jest.spyOn(helper.mocks.server, 'processContracts').mockResolvedValue();
        const wrapper = helper.mountFn(RpcConnector);

        expect(onNewContractMock).toHaveBeenCalled();
        expect(processContractMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not do private operations when in public explorer mode', () => {
        auth.mockReturnValue({ currentUser: { id: '1' }});
        jest.spyOn(helper.mocks.server, 'getBlocks').mockResolvedValue({ data: { items: [] }});

        const getAccountsMock = jest.spyOn(helper.mocks.server, 'getAccounts');
        const onNewContractMock = jest.spyOn(helper.mocks.pusher, 'onNewContract');
        const processContractMock = jest.spyOn(helper.mocks.server, 'processContracts').mockResolvedValue();
        const wrapper = helper.mountFn(RpcConnector, {
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
            }
        });

        expect(onNewContractMock).not.toHaveBeenCalled();
        expect(processContractMock).not.toHaveBeenCalled();
    });
});
