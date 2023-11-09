import posthog from "posthog-js";

export default {
    install(Vue, options) {
        const store = options.store;
        Vue.prototype.$posthog = posthog.init(
            store.getters.postHogApiKey, { api_host: 'https://app.posthog.com' }
        );
    }
};
