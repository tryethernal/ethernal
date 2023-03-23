import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import OnboardingModal from '@/components/OnboardingModal.vue';

describe('OnboardingModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async () => {
        jest.spyOn(helper.mocks.server, 'initRpcServer').mockResolvedValue(true);
        jest.spyOn(helper.mocks.server, 'getRpcAccounts')
            .mockResolvedValue(['0x123', '0x456']);

        jest.spyOn(helper.mocks.server, 'createWorkspace').mockResolvedValue({ data: {
            workspace: {
                rpcServer: 'https://127.0.0.1',
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
            },
            name: 'Hardhat'
        }});

        const wrapper = helper.mountFn(OnboardingModal, {
            stubs: ['Create-Workspace']
        });

        await wrapper.setData({ dialog: true });
        await wrapper.find('create-workspace-stub').vm.$emit('workspaceCreated');
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});
