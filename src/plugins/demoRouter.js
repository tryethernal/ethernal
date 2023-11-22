import VueRouter from 'vue-router';
import DemoExplorerSetup from '../components/DemoExplorerSetup.vue';
import DemoExplorerSetupEmbedded from '../components/DemoExplorerSetupEmbedded.vue';

const routes = [
    { path: '/demo', component: DemoExplorerSetup },
    { path: '/demoEmbedded', component: DemoExplorerSetupEmbedded },
    { path: '*', redirect: '/demo' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

export default router;
