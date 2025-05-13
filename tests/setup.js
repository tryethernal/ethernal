import { config, mount, RouterLinkStub } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing';
import { createVuetify } from 'vuetify';
import flushPromises from 'flush-promises';

import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VStepperVertical, VStepperVerticalItem } from 'vuetify/labs/VStepperVertical'

import $server from './unit/mocks/server';
import $posthog from './unit/mocks/posthog';
import FromWei from '@/filters/FromWei';
import dt from '@/filters/dt';
import { vi } from 'vitest';

const ethernal = {
    colors: {
        primary: '#3D95CE',
        secondary: '#424242',
        accent: '#29648E',
        error: '#E72732',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#E78227',
        background: '#F5F5F5'
    }
};

const vuetify = createVuetify({
    components: {
        ...components,
        VStepperVertical,
        VStepperVerticalItem
    },
    directives,
    theme: {
        themes: {
            ethernal,
            light: ethernal,
            dark: ethernal
        }
    },
    display: {
        mobileBreakpoint: 'xs',
        thresholds: {
            xs: 0
        }
    }
});

const customMount = (component, options = {}) => {
    const global = options.global || {};
    const provide = options.global?.provide || {};
    const plugins = global.plugins || [createTestingPinia()];
    let stubs = {};

    if (Array.isArray(global.stubs))
        global.stubs.forEach(s => stubs[s] = true);
    else
        stubs = global.stubs || {};

    stubs['RouterLink'] = RouterLinkStub;

    plugins.push(vuetify);
    stubs['VDialog'] = {
        name: 'VDialog',
        template: '<div class="v-dialog-stub"><slot /></div>',
        props: ['modelValue']
    }

    global.plugins = plugins;
    global.stubs = stubs;
    global.provide = {
        $server,
        $posthog,
        $fromWei: FromWei,
        $dt: dt,
        $pusher,
        ...provide
    };

    return mount(component, { ...options, global });
};

const $router = {
    push: vi.fn(),
    replace: vi.fn().mockResolvedValue({})
};

const $pusher = {
    onUpdatedAccount: vi.fn(),
    onNewFailedTransactions: vi.fn(),
    onNewProcessableTransactions: vi.fn(),
    onNewBlock: vi.fn(),
    onNewContract: vi.fn(),
    onNewContractLog: vi.fn(),
    onNewTransaction: vi.fn(),
    onNewToken: vi.fn(),
    onNewNft: vi.fn(),
    onUserUpdated: vi.fn(),
    onDestroyedContract: vi.fn(),
    onNewBlockEvent: vi.fn()
};

vi.stubGlobal('server', $server);
vi.stubGlobal('pusher', $pusher);
vi.stubGlobal('router', $router);
vi.stubGlobal('posthog', $posthog);
vi.stubGlobal('fromWei', FromWei);
vi.stubGlobal('mount', customMount);
vi.stubGlobal('flushPromises', flushPromises);
vi.stubGlobal('createTestingPinia', createTestingPinia);
vi.useFakeTimers();
vi.setSystemTime(new Date('2022-08-07T12:33:37.000Z'));

config.global.mocks = {
    $server,
    $router,
    $pusher,
    $fromWei: FromWei,
    $dt: dt,
    $route: {
        query: {}
    }
};

class ResizeObserverStub {
    observe () { }
    unobserve () { }
    disconnect () { }
}

window.ResizeObserver ??= ResizeObserverStub;

// https://stackoverflow.com/a/53449595
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
