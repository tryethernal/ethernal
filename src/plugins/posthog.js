/**
 * @fileoverview PostHog analytics plugin.
 * Provides $posthog client for product analytics tracking.
 * Conditionally enabled based on environment configuration.
 * @module plugins/posthog
 */

import posthog from "posthog-js";
import { useEnvStore } from '../stores/env';

export default {
    install(app) {
        const envStore = useEnvStore();
        const $posthog = envStore.hasAnalyticsEnabled ?
            posthog.init(
                envStore.postHogApiKey,
                {
                    api_host: envStore.postHogApiHost,
                    person_profiles: 'identified_only',
                    autocapture: true,
                    capture_pageview: true,
                    capture_pageleave: true,
                    ip: true
                }
            ) :
            { capture: () => {}, reset: () => {}, identify: () => {} }

        if (envStore.hasAnalyticsEnabled && typeof window !== 'undefined')
            window.posthog = $posthog;

        app.config.globalProperties.$posthog = $posthog;
        app.provide('$posthog', $posthog);
    }
};
