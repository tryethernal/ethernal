module.exports = {
    root: true,
    env: {
        node: true,
        jest: true
    },
    globals: {
        mount: 'readonly',
        createTestingPinia: 'readonly',
        flushPromises: 'readonly',
        server: 'readonly',
        pusher: 'readonly',
        fromWei: 'readonly',
        vi: 'readonly'
    }
}; 