import posthog from "posthog-js";
import { useEnvStore } from '../stores/env';

export default {
    install(app) {
        const envStore = useEnvStore();
        const $posthog = envStore.hasAnalyticsEnabled ?
            posthog.init(
                envStore.postHogApiKey, { api_host: envStore.postHogApiHost }
            ) :
            { capture: () => {}, reset: () => {}, identify: () => {} }

        app.config.globalProperties.$posthog = $posthog;
        app.provide('$posthog', $posthog);
    }
};
