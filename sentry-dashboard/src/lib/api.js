/**
 * @fileoverview API client for Sentry Pipeline Dashboard.
 * Uses axios with Basic Auth credentials provided by the browser's native dialog.
 * @module lib/api
 */

import axios from 'axios';

const client = axios.create({
    baseURL: '/api/sentryPipeline'
});

export function getRuns(params) {
    return client.get('/runs', { params });
}

export function getRun(id) {
    return client.get(`/runs/${id}`);
}

export function getActiveRuns() {
    return client.get('/runs/active');
}

export function getStats(params) {
    return client.get('/stats', { params });
}
