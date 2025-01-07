import { config, mount, RouterLinkStub } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing';
import { createVuetify } from 'vuetify';
import flushPromises from 'flush-promises';

import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import $server from './unit/mocks/server';
import FromWei from '@/filters/FromWei';
import dt from '@/filters/dt';

const vuetify = createVuetify({
    components,
    directives,
});

const customMount = (component, options = { global: { stubs: {} }}) => {
    const plugins = options.global.plugins || [createTestingPinia()];
    let stubs = {};

    if (Array.isArray(options.global.stubs))
        options.global.stubs.forEach(s => stubs[s] = true);
    else
        stubs = options.global.stubs || {};

    stubs['RouterLink'] = RouterLinkStub;

    plugins.push(vuetify);
    stubs['VDialog'] = {
        name: 'VDialog',
        template: '<div class="v-dialog-stub"><slot /></div>',
        props: ['modelValue']
    }

    options.global.plugins = plugins;
    options.global.stubs = stubs;

    return mount(component, options);
};

vi.stubGlobal('server', $server);
vi.stubGlobal('mount', customMount);
vi.stubGlobal('createTestingPinia', createTestingPinia);
vi.stubGlobal('flushPromises', flushPromises);
vi.stubGlobal('createTestingPinia', createTestingPinia);
vi.useFakeTimers();
vi.setSystemTime(new Date('2022-08-07T12:33:37.000Z'));

config.global.mocks = {
    $server,
    $pusher: {
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
        onDestroyedContract: vi.fn()
    },
    $fromWei: FromWei,
    $dt: dt,
    $route: {
        push: vi.fn()
    }
};

class ResizeObserverStub {
    observe () { }
    unobserve () { }
    disconnect () { }
}
window.ResizeObserver ??= ResizeObserverStub;
