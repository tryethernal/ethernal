/**
 * @fileoverview Router for Sentry Dashboard standalone app.
 * Three routes: live view, session history, and session detail.
 * @module router
 */

import { createWebHistory, createRouter } from 'vue-router';

const routes = [
    { path: '/', name: 'live', component: () => import('./components/LiveView.vue') },
    { path: '/history', name: 'history', component: () => import('./components/SessionHistory.vue') },
    { path: '/session/:id', name: 'session', component: () => import('./components/SessionDetail.vue') }
];

export default createRouter({
    history: createWebHistory('/sentry-dashboard/'),
    routes
});
