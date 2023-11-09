jest.mock('@/plugins/posthog', () => ({
    posthogPlugin: {
        install(Vue) {
            Vue.prototype.$posthog = {
                identify: jest.fn(),
                capture: jest.fn(),
                reset: jest.fn()
            }
        }
    }
}));
