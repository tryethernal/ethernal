const fs = require('fs');
import { mount, createLocalVue, createWrapper } from '@vue/test-utils';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';

require('./mocks/db');
require('./mocks/server');
require('./mocks/pusher');
const { dbPlugin } = require('@/plugins/firebase');
const { serverPlugin } = require('@/plugins/server');
const { pusherPlugin } = require('@/plugins/pusher');

class MockHelper {

    constructor(initialStoreState = {}, mockDb = true, mockServer = true) {
        this.localVue = createLocalVue();

        this.storeState = {
            user: {},
            publicExplorer: {
                totalSupply: '1000000000000'
            },
            currentWorkspace: {
                storageEnabled: true,
                isAdmin: true,
                chain: 'ethereum',
                networkId: null,
                rpcServer: null,
                name: 'Hardhat',
                settings: {}
            },
            ...initialStoreState
        };
        this.initPlugins();
    }

    mountFn(component, options = { getters: {}}) {
        this.initMockStore();
        const getters = { ...this.getters, ...options.getters };
        const actions = this.actions;
        const store = new Vuex.Store({ getters, actions });

        return mount(component, {
            store,
            localVue: this.localVue,
            vuetify: this.vuetify,
            router: this.router,
            ...options
        });
    }

    initPlugins() {
        this.vuetify = new Vuetify();
        this.router = new VueRouter({ mode: 'abstract' });
        this.localVue.use(VueRouter);
        this.localVue.use(dbPlugin);
        this.localVue.use(serverPlugin);
        this.localVue.use(pusherPlugin);

        this.mocks = {
            db: this.localVue.prototype.db,
            server: this.localVue.prototype.server,
            pusher: this.localVue.prototype.pusher,
            router: this.router
        };
    }

    updateStoreState(key, value) {
        this.storeState[key] = value;
    }

    initMockStore(initialState, overrideGetters) {
        this.localVue.use(Vuex);
        this.getters = {
            mainDomain: jest.fn().mockReturnValue('tryethernal.com'),
            isBillingEnabled: jest.fn().mockReturnValue(true),
            canUseDemoPlan: jest.fn().mockReturnValue(false),
            apiRoot: jest.fn().mockReturnValue('http://localhost:8081'),
            rpcServer: jest.fn().mockReturnValue('http://localhost:8545'),
            accounts: jest.fn().mockReturnValue(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
            theme: jest.fn(),
            blockCount: jest.fn().mockReturnValue(2),
            transactionCount: jest.fn().mockReturnValue(2),
            currentWorkspace: jest.fn().mockReturnValue(this.storeState.currentWorkspace),
            user: jest.fn(() => {
                return { ...this.storeState.user, plan: this.storeState.user.plan || 'free' }
            }),
            nativeToken: jest.fn(() => 'Ether'),
            isPublicExplorer: jest.fn(() => false),
            isUserAdmin: jest.fn(() => true),
            publicExplorer: jest.fn(() => this.storeState.publicExplorer),
            chains: jest.fn(() => {
                return {
                    ethereum: {
                        slug: 'ethereum',
                        name: 'Ethereum',
                        token: 'Ether',
                        scanner: 'Etherscan'
                    }
                };
            }),
            chain: () => ({
                slug: 'ethereum',
                name: 'Ethereum',
                token: 'Ether',
                scanner: 'Etherscan'
            }),
            currentBlock: jest.fn(() => {
                return { number: 2 };
            }),
            ...overrideGetters
        };

        this.actions = {
            updateCurrentWorkspace: jest.fn(),
            updateTransactionCount: jest.fn(),
            updateBlockCount: jest.fn(),
            updateCurrentBlock: jest.fn(),
            updateAccounts: jest.fn()
        };
    }
}

export default MockHelper;
