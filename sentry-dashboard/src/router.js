/**
 * @fileoverview Router for Sentry Dashboard standalone app.
 * @module router
 */

import { createWebHistory, createRouter } from 'vue-router';
import SentryDashboard from './components/SentryDashboard.vue';

const routes = [
    { path: '/', name: 'dashboard', component: SentryDashboard }
];

export default createRouter({
    history: createWebHistory('/sentry-dashboard/'),
    routes
});
