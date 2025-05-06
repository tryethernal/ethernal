import { createWebHistory, createRouter } from 'vue-router';
import SelfHostedSetup from '../components/SelfHostedSetup.vue';

const routes = [
    { path: '/', component: SelfHostedSetup },
    { path: '/setup', component: SelfHostedSetup },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: SelfHostedSetup }
];

const setupRouter = createRouter({
    history: createWebHistory(),
    routes
});

export default setupRouter; 