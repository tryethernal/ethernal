import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex';
import Vuetify from 'vuetify';

import OnboardingModal from '@/components/OnboardingModal.vue';
import CreateWorkspace from '@/components/CreateWorkspace.vue'

describe('OnboardingModal.vue', () => {
    let store;
    let getters;
    let vuetify;

    const localVue = createLocalVue();
    localVue.use(Vuex);

    let currentWorkspace = {
        networkId: null,
        rpcServer: null,
        localNetwork: true,
        name: null,
        settings: {}
    };

    beforeEach(() => {

        getters = {
            currentWorkspace: () => currentWorkspace
        }

        vuetify = new Vuetify();

        store = new Vuex.Store({
            getters
        });
    });

    it('Should let the user create a new workspace', async () => {

        const wrapper = mount(OnboardingModal, {
            store,
            localVue,
            vuetify
        });

        await wrapper.setData({ dialog: true });

        expect(wrapper.text()).toContain('Create a new workspace');

        await wrapper.find('input[label=Name*]').setValue('Hardhat');
        await wrapper.find('input[label=RPC Server*]').setValue('http://127.0.0.1:8545');

        await wrapper.find('button').trigger('click');
    })
});
