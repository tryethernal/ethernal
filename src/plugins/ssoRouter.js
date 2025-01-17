import { createWebHistory, createRouter } from 'vue-router';
import SSO from '../SSO.vue';

const routes = [
    { path: '/sso', component: SSO },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: SSO }
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

export default router;
