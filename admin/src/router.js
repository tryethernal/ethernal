import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
    { path: '/login', component: () => import('@/pages/LoginPage.vue') },
    { path: '/prospecting', component: () => import('@/pages/prospecting/QueuePage.vue') },
    { path: '/prospecting/pipeline', component: () => import('@/pages/prospecting/PipelinePage.vue') },
    { path: '/prospecting/:id', component: () => import('@/pages/prospecting/ProspectDetailPage.vue'), props: true },
    { path: '/', redirect: '/prospecting' }
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
    const auth = useAuthStore();
    if (to.path !== '/login' && !auth.isLoggedIn) return '/login';
});

export default router;
