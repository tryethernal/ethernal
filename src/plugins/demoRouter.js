/**
 * @fileoverview Demo router plugin.
 * Routes for demo explorer setup flow on demo.tryethernal.com.
 * @module plugins/demoRouter
 */

import { createWebHistory, createRouter } from 'vue-router';
import DemoExplorerSetup from '../components/DemoExplorerSetup.vue';
import DemoExplorerSetupEmbedded from '../components/DemoExplorerSetupEmbedded.vue';

const routes = [
    { path: '/demo', component: DemoExplorerSetup },
    { path: '/demoEmbedded', component: DemoExplorerSetupEmbedded },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: DemoExplorerSetup }
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

export default router;
