export const routes = [
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    { path: '/pricing', name: 'pricing', component: () => import('./pages/PricingPage.vue') },
    { path: '/contact-us', name: 'contact', component: () => import('./pages/ContactPage.vue') },
    { path: '/transaction-tracing', name: 'transaction-tracing', component: () => import('./pages/TransactionTracingPage.vue') },
    { path: '/features', name: 'features', component: () => import('./pages/FeaturesPage.vue') },
    { path: '/developers', name: 'developers', component: () => import('./pages/DevelopersPage.vue') },
    { path: '/teams', name: 'teams', component: () => import('./pages/TeamsPage.vue') },
    { path: '/app-chains', name: 'app-chains', component: () => import('./pages/AppChainsPage.vue') },
    { path: '/hardhat-block-explorer', name: 'hardhat', component: () => import('./pages/HardhatPage.vue') },
    { path: '/anvil-block-explorer', name: 'anvil', component: () => import('./pages/AnvilPage.vue') },
    { path: '/ganache-block-explorer', name: 'ganache', component: () => import('./pages/GanachePage.vue') },
    { path: '/kaleido', name: 'kaleido', component: () => import('./pages/KaleidoPage.vue') },
    { path: '/chainstack', name: 'chainstack', component: () => import('./pages/ChainstackPage.vue') },
    { path: '/github-actions', name: 'github-actions', component: () => import('./pages/GithubActionsPage.vue') },
    { path: '/terms', name: 'terms', component: () => import('./pages/TermsPage.vue') },
    { path: '/privacy', name: 'privacy', component: () => import('./pages/PrivacyPage.vue') },
    { path: '/arbitrum-orbit', name: 'arbitrum-orbit', component: () => import('./pages/OrbitPage.vue') },
    { path: '/op-stack', name: 'op-stack', component: () => import('./pages/OpStackPage.vue') }
];

export const scrollBehavior = () => ({ top: 0 });
