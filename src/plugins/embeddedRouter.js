import VueRouter from 'vue-router';
import DemoExplorerSetupEmbedded from '../components/DemoExplorerSetupEmbedded.vue';
import TransactionTraceEmbedded from '../components/TransactionTraceEmbedded.vue';

const routes = [
    { path: '/embedded/demoSetup', component: DemoExplorerSetupEmbedded },
    { path: '/embedded/transactionTrace/:hash', props: true, component: TransactionTraceEmbedded },
    { path: '*', redirect: '/embedded/demo' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

export default router;
