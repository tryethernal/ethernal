import VueRouter from 'vue-router';
import DemoExplorerSetup from '../components/DemoExplorerSetup.vue';
import DemoExplorerUpgrade from '../components/DemoExplorerUpgrade.vue';

const routes = [
    { path: '/demo', component: DemoExplorerSetup },
    { path: '/demo/upgradeExplorer', component: DemoExplorerUpgrade },
    { path: '*', redirect: '/demo' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

export default router;
