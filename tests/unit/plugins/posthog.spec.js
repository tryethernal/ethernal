/**
 * @fileoverview Tests for the PostHog plugin: analytics only initialise with a key, a host
 * and (when VITE_POSTHOG_ALLOWED_HOSTS is set) an allowed hostname.
 */
import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('posthog-js', () => ({
    default: { init: vi.fn(() => ({ capture: vi.fn(), reset: vi.fn(), identify: vi.fn(), __real: true })) }
}));

import posthog from 'posthog-js';
import posthogPlugin, { isPostHogHostAllowed } from '@/plugins/posthog';

/**
 * Stubs window.location.hostname for a test.
 * @param {string} hostname - Hostname to report
 */
const mockHostname = (hostname) => {
    vi.stubGlobal('location', { hostname });
};

/**
 * Installs the plugin on a fake app.
 * @returns {object} The fake app the plugin was installed on
 */
const installPlugin = () => {
    setActivePinia(createPinia());
    const app = { config: { globalProperties: {} }, provide: vi.fn() };
    posthogPlugin.install(app);
    return app;
};

describe('posthog plugin', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_POSTHOG_API_KEY', 'phc_test');
        vi.stubEnv('VITE_POSTHOG_API_HOST', '/ingest');
        vi.stubEnv('VITE_POSTHOG_ALLOWED_HOSTS', '');
        posthog.init.mockClear();
        delete window.posthog;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('initialises with the expected options on an allowed host', () => {
        vi.stubEnv('VITE_POSTHOG_ALLOWED_HOSTS', ' App.Tryethernal.com , other.example.com');
        mockHostname('app.tryethernal.com');

        const app = installPlugin();

        expect(posthog.init).toHaveBeenCalledTimes(1);
        expect(posthog.init).toHaveBeenCalledWith('phc_test', {
            api_host: '/ingest',
            ui_host: 'https://us.posthog.com',
            person_profiles: 'identified_only',
            autocapture: true,
            capture_pageview: true,
            capture_pageleave: true,
            ip: true
        });
        expect(app.config.globalProperties.$posthog.__real).toBe(true);
        expect(window.posthog).toBe(app.config.globalProperties.$posthog);
        expect(app.provide).toHaveBeenCalledWith('$posthog', app.config.globalProperties.$posthog);
    });

    it('does not initialise on a host outside the allowlist', () => {
        vi.stubEnv('VITE_POSTHOG_ALLOWED_HOSTS', 'app.tryethernal.com');
        mockHostname('foo.tryethernal.com');

        const app = installPlugin();

        expect(posthog.init).not.toHaveBeenCalled();
        expect(window.posthog).toBeUndefined();
        expect(app.config.globalProperties.$posthog.__real).toBeUndefined();
        expect(() => {
            app.config.globalProperties.$posthog.capture('x');
            app.config.globalProperties.$posthog.identify('1');
            app.config.globalProperties.$posthog.reset();
        }).not.toThrow();
    });

    it('does not initialise on a custom domain outside the allowlist', () => {
        vi.stubEnv('VITE_POSTHOG_ALLOWED_HOSTS', 'app.tryethernal.com');
        mockHostname('explorer.customer.com');

        installPlugin();

        expect(posthog.init).not.toHaveBeenCalled();
    });

    it('does not initialise without an api key', () => {
        vi.stubEnv('VITE_POSTHOG_API_KEY', '');
        mockHostname('app.tryethernal.com');

        const app = installPlugin();

        expect(posthog.init).not.toHaveBeenCalled();
        expect(window.posthog).toBeUndefined();
        expect(app.config.globalProperties.$posthog.__real).toBeUndefined();
    });

    it('does not initialise without an api host', () => {
        vi.stubEnv('VITE_POSTHOG_API_HOST', '');
        mockHostname('app.tryethernal.com');

        installPlugin();

        expect(posthog.init).not.toHaveBeenCalled();
    });

    it('initialises on any host when the allowlist is unset', () => {
        mockHostname('foo.tryethernal.com');

        installPlugin();

        expect(posthog.init).toHaveBeenCalledTimes(1);
    });
});

describe('isPostHogHostAllowed', () => {
    it('allows everything when the list is empty or unset', () => {
        expect(isPostHogHostAllowed(undefined, 'a.com')).toBe(true);
        expect(isPostHogHostAllowed('', 'a.com')).toBe(true);
        expect(isPostHogHostAllowed(' , ', 'a.com')).toBe(true);
    });

    it('matches hostnames trimmed and case-insensitively', () => {
        expect(isPostHogHostAllowed('a.com, B.com', 'b.COM')).toBe(true);
        expect(isPostHogHostAllowed('a.com,b.com', 'c.com')).toBe(false);
    });

    it('does not match on substrings', () => {
        expect(isPostHogHostAllowed('app.tryethernal.com', 'evilapp.tryethernal.com')).toBe(false);
    });
});
