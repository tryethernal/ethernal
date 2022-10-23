import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import OnboardingModal from '@/components/OnboardingModal.vue';

describe('OnboardingModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async () => {
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

        const wrapper = helper.mountFn(OnboardingModal);

        await wrapper.setData({ dialog: true });

        await wrapper.find('#workspaceName').setValue('Hardhat');
        await wrapper.find('#workspaceServer').setValue('https://127.0.0.1');

        await wrapper.find('#createWorkspace').trigger('click');

        await flushPromises();
        
        expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
            workspace: {
                rpcServer: 'https://127.0.0.1',
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
            },
            name: 'Hardhat'
        });
    });
});
