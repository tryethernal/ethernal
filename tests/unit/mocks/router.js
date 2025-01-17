vi.mock('@/plugins/router', () => {
    const VueRouter = require('vue-router');
    return new VueRouter({
        mode: 'history',
        routes: []
    });
});
