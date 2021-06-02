import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import firebase from 'firebase/app';
import { firestorePlugin } from 'vuefire';

import { dbPlugin } from '@/plugins/firebase';
import { serverPlugin } from '@/plugins/server';
import dbMocks from './mocks/db';
import serverMocks from './mocks/server';

class MockHelper {

    constructor(localVue) {
        this.localVue = createLocalVue();
        this.localVue.use(Vuex);

        this.mockFirebase();
        this.initMockStore();
        this.initPlugins();
        this.initMocks();
    }

    mountFn(component, options = {}) {
        return mount(component, {
            store: this.store,
            localVue: this.localVue,
            vuetify: this.vuetify,
            mocks: this.mocks,
            ...options
        });
    }

    initMocks() {
        this.mocks = {
            db: dbMocks,
            server: serverMocks
        }
    }

    initPlugins() {
        this.vuetify = new Vuetify();
        this.localVue.use(dbPlugin, { store: this.store });
        this.localVue.use(serverPlugin, { store: this.store });
        this.localVue.use(firestorePlugin);
    }

    initMockStore() {
        this.getters = {
            currentWorkspace: () => {
                return {
                    networkId: null,
                    rpcServer: null,
                    localNetwork: true,
                    name: null,
                    settings: {}
                };
            }
        };

        this.actions = {
            updateCurrentWorkspace: jest.fn()
        };

        this.store = new Vuex.Store({ getters: this.getters, actions: this.actions });
    }

    mockFirebase() {
        firebase.auth = jest.fn(() => { currentUser: { uid: '123' }});
    }
}

export default MockHelper;
