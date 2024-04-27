import posthog from "posthog-js";

export default {
    install(Vue, options) {
        const store = options.store;
        Vue.prototype.$posthog = store.getters.hasAnalyticsEnabled ?
            posthog.init(
                store.getters.postHogApiKey, { api_host: store.getters.postHogApiHost }
            ) :
            { capture: () => {}, reset: () => {}, identify: () => {} }
    }
};
