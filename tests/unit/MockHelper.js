const fs = require('fs');
import { mount, createLocalVue } from '@vue/test-utils';
const firebase = require("@firebase/rules-unit-testing");
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import { firestorePlugin } from 'vuefire';

import { dbPlugin } from '@/plugins/firebase';
import { serverPlugin } from '@/plugins/server';
import dbMocks from './mocks/db';
import serverMocks from './mocks/server';

class MockHelper {

    constructor(initialStoreState = {}, mockDb = true, mockServer = true) {
        this.projectId = `ethernal-${Math.floor(Math.random() * 10000000)}`;

        this.localVue = createLocalVue();

        this.mockFirebase();
        this.initMockStore(initialStoreState);
        this.initPlugins();
        this.initMocks(mockDb, mockServer);
    }

    mountFn(component, options = {}) {
        return mount(component, {
            store: this.store,
            localVue: this.localVue,
            vuetify: this.vuetify,
            mocks: this.mocks,
            router: this.router,
            ...options
        });
    }

    initMocks(mockDb, mockServer) {
        this.mocks = {}
        if (mockDb) this.mocks['db'] = dbMocks.init(this.firebase);
        if (mockServer) this.mocks['server'] = serverMocks;
        this.mocks['admin'] = dbMocks.init(this.admin);
    }

    initPlugins() {
        this.vuetify = new Vuetify();
        this.router = new VueRouter();
        this.localVue.use(VueRouter);
        this.localVue.use(dbPlugin, { store: this.store });
        this.localVue.use(serverPlugin, { store: this.store });
        this.localVue.use(firestorePlugin);
    }

    updateStoreState(key, value) {
        this.storeState[key] = value;
    }

    initMockStore(initialState) {
        this.localVue.use(Vuex);
        this.storeState = {
            user: {},
            currentWorkspace: {
                chain: 'ethereum',
                networkId: null,
                rpcServer: null,
                localNetwork: true,
                name: 'Hardhat',
                settings: {}
            },
            ...initialState
        };

        this.getters = {
            currentWorkspace: jest.fn(() => this.storeState.currentWorkspace),
            user: jest.fn(() => {
                return { ...this.storeState.user, plan: this.storeState.user.plan || 'free' }
            }),
            nativeToken: jest.fn(() => 'Ether')
        };

        this.actions = {
            updateCurrentWorkspace: jest.fn()
        };

        this.store = new Vuex.Store({ getters: this.getters, actions: this.actions });
    }

    mockFirebase() {
        this.firebase = firebase.initializeTestApp({
            projectId: this.projectId,
            databaseName: `rtdb-${this.projectId}`,
            auth: { uid: '123' }
        });
        firebase.loadFirestoreRules({
            projectId: this.projectId,
            rules: fs.readFileSync('./firestore.rules.test', 'utf8')
        })
        this.admin = firebase.initializeAdminApp({
            projectId: this.projectId,
            databaseName: `rtdb-${this.projectId}`,
        });
        this.firebase.auth = jest.fn(() => {
            return {
                currentUser: {
                    uid: '123',
                    metadata: {
                        creationTime: new Date()
                    }
                }
            }
        });
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
