import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import '../mocks/db';
import { auth } from '@/plugins/firebase';

import RpcConnector from '@/components/RpcConnector.vue';

describe('RpcConnector.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display the correct info', async () => {
        auth.mockReturnValue({ currentUser: { id: '1' }});
        jest.spyOn(helper.mocks.server, 'getBlocks').mockResolvedValue({ data: { items: [] }});
        jest.spyOn(helper.mocks.server, 'getRpcAccounts').mockResolvedValue(['0x123']);
        jest.spyOn(helper.mocks.server, 'getAccounts').mockResolvedValue({ data: { items: [{ address: '0x123' }, { address: '0x456' }]}});
        jest.spyOn(helper.mocks.server, 'getAccountBalance').mockResolvedValue('1000000000000000000000');
        const syncBalanceSpy = jest.spyOn(helper.mocks.server, 'syncBalance');

        const onNewContractMock = jest.spyOn(helper.mocks.pusher, 'onNewContract');
        const processContractMock = jest.spyOn(helper.mocks.server, 'processContracts').mockResolvedValue();
        const wrapper = helper.mountFn(RpcConnector);
        await flushPromises();

        expect(onNewContractMock).toHaveBeenCalled();
        expect(processContractMock).toHaveBeenCalled();
        expect(syncBalanceSpy).toHaveBeenNthCalledWith(1, '0x123', '1000000000000000000000');
        expect(syncBalanceSpy).toHaveBeenNthCalledWith(2, '0x456', '1000000000000000000000');
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
