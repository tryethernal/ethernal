import { createWebHistory, createRouter } from 'vue-router';
import DemoExplorerSetupEmbedded from '../components/DemoExplorerSetupEmbedded.vue';
import TransactionTraceEmbedded from '../components/TransactionTraceEmbedded.vue';

const routes = [
    { path: '/embedded/demoSetup', component: DemoExplorerSetupEmbedded },
    { path: '/embedded/transactionTrace/:hash', props: true, component: TransactionTraceEmbedded },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: DemoExplorerSetupEmbedded }
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

export default router;
