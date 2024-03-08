import VueRouter from 'vue-router';
import SSO from '../SSO.vue';

const routes = [
    { path: '/sso', component: SSO },
    { path: '*', redirect: '/sso' }
];

const router = new VueRouter({
    mode: 'history',
    routes: routes
});

export default router;
