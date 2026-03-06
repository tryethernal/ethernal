import { createRouter, createWebHistory } from 'vue-router';

const routes = [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/pricing', component: () => import('./pages/PricingPage.vue') },
    { path: '/contact-us', component: () => import('./pages/ContactPage.vue') },
    { path: '/transaction-tracing', component: () => import('./pages/TransactionTracingPage.vue') },
    { path: '/features', component: () => import('./pages/FeaturesPage.vue') },
    { path: '/developers', redirect: '/features' },
    { path: '/teams', component: () => import('./pages/TeamsPage.vue') },
    { path: '/app-chains', component: () => import('./pages/AppChainsPage.vue') },
    { path: '/hardhat-block-explorer', component: () => import('./pages/HardhatPage.vue') },
    { path: '/anvil-block-explorer', component: () => import('./pages/AnvilPage.vue') },
    { path: '/ganache-block-explorer', component: () => import('./pages/GanachePage.vue') },
    { path: '/kaleido', component: () => import('./pages/KaleidoPage.vue') },
    { path: '/chainstack', component: () => import('./pages/ChainstackPage.vue') },
    { path: '/github-actions', component: () => import('./pages/GithubActionsPage.vue') },
    { path: '/terms', component: () => import('./pages/TermsPage.vue') },
    { path: '/privacy', component: () => import('./pages/PrivacyPage.vue') },
    { path: '/arbitrum-orbit', component: () => import('./pages/OrbitPage.vue') },
    { path: '/op-stack', component: () => import('./pages/OpStackPage.vue') }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
        return { top: 0 };
    }
});

export default router;
