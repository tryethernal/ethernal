import MockHelper from '../MockHelper';

import OnboardingModal from '@/components/OnboardingModal.vue';

describe('OnboardingModal.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should let the user create a new workspace', async (done) => {
        const name = 'Hardhat';
        const rpcServer = 'https://127.0.0.1';
        const localNetwork = true;

        const wrapper = helper.mountFn(OnboardingModal);

        await wrapper.setData({ dialog: true });

        await wrapper.find('#workspaceName').setValue(name);
        await wrapper.find('#workspaceServer').setValue(rpcServer);

        await wrapper.find('#createWorkspace').trigger('click');

        await wrapper.vm.$nextTick();
        
        expect(helper.actions.updateCurrentWorkspace).toHaveBeenCalledWith(expect.anything(), {
            rpcServer: rpcServer,
            networkId: 1,
            settings: {
                gasLimit: 1234567
            },
            defaultAccount: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
            localNetwork: localNetwork,
            name: name
        });
        
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
