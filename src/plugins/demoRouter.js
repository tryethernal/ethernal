import VueRouter from 'vue-router';
import DemoExplorerSetup from '../components/DemoExplorerSetup.vue';

const routes = [
    { path: '/demo', component: DemoExplorerSetup },
    { path: '*', redirect: '/demo' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

export default router;
