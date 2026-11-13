/**
 * @fileoverview PostHog analytics plugin.
 * Provides $posthog client for product analytics tracking.
 * Conditionally enabled based on environment configuration, and optionally
 * restricted to a list of hostnames (VITE_POSTHOG_ALLOWED_HOSTS) because the
 * same bundle is served on every public explorer subdomain and custom domain.
 * @module plugins/posthog
 */

import posthog from "posthog-js";
import { useEnvStore } from '../stores/env';

/**
 * Checks whether analytics may run on a hostname.
 * @param {string} [allowedHosts] - Comma-separated hostnames. Unset/empty means no restriction.
 * @param {string} [hostname] - Hostname to check (typically window.location.hostname).
 * @returns {boolean} True if there is no allowlist, or the hostname is in it (trimmed, case-insensitive).
 */
export const isPostHogHostAllowed = (allowedHosts, hostname) => {
    const hosts = String(allowedHosts || '')
        .split(',')
        .map(host => host.trim().toLowerCase())
        .filter(Boolean);

    if (!hosts.length)
        return true;

    return hosts.includes(String(hostname || '').trim().toLowerCase());
};

export default {
    install(app) {
        const envStore = useEnvStore();
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const enabled = envStore.hasAnalyticsEnabled && isPostHogHostAllowed(envStore.postHogAllowedHosts, hostname);

        const $posthog = enabled ?
            posthog.init(
                envStore.postHogApiKey,
                {
                    api_host: envStore.postHogApiHost,
                    ui_host: 'https://us.posthog.com',
                    person_profiles: 'identified_only',
                    autocapture: true,
                    capture_pageview: true,
                    capture_pageleave: true,
                    ip: true
                }
            ) :
            { capture: () => {}, reset: () => {}, identify: () => {} }

        if (enabled && typeof window !== 'undefined')
            window.posthog = $posthog;

        app.config.globalProperties.$posthog = $posthog;
        app.provide('$posthog', $posthog);
    }
};
