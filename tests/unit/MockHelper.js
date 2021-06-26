import { mount, createLocalVue } from '@vue/test-utils'
const firebase = require("@firebase/rules-unit-testing");
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import { firestorePlugin } from 'vuefire';

import { dbPlugin } from '@/plugins/firebase';
import { serverPlugin } from '@/plugins/server';
import dbMocks from './mocks/db';
import serverMocks from './mocks/server';

class MockHelper {

    constructor(initialStoreState = {}) {
        this.projectId = `ethernal-${Math.floor(Math.random() * 10000000)}`;
        this.localVue = createLocalVue();
        this.localVue.use(Vuex);

        this.mockFirebase();
        this.initMockStore(initialStoreState);
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
            db: dbMocks.init(this.db),
            server: serverMocks
        }
    }

    initPlugins() {
        this.vuetify = new Vuetify();
        this.localVue.use(dbPlugin, { store: this.store });
        this.localVue.use(serverPlugin, { store: this.store });
        this.localVue.use(firestorePlugin);
    }

    updateStoreState(key, value) {
        this.storeState[key] = value;
    }

    initMockStore(initialState) {
        this.storeState = {
            networkId: null,
            rpcServer: null,
            localNetwork: true,
            name: null,
            settings: {},
            ...initialState
        };

        this.getters = {
            currentWorkspace: () => this.storeState
        };

        this.actions = {
            updateCurrentWorkspace: jest.fn()
        };

        this.store = new Vuex.Store({ getters: this.getters, actions: this.actions });
    }

    mockFirebase() {
        this.db = firebase.initializeTestApp({
            projectId: this.projectId,
            auth: { uid: '123' }
        }).firestore();

        this.db.auth = jest.fn(() => { currentUser: { uid: '123' }});
    }

    clearFirebase() {
        const promises = [];
        promises.push(firebase.clearFirestoreData({ projectId: this.projectId }));
        firebase.apps().map((app) => {
            if (app.options_.projectId == this.projectId)
                promises.push(app.delete());
        });
        return Promise.all(promises);
    }
}

export default MockHelper;
