/**
 * @fileoverview PM2 process management client.
 * Communicates with the pm2-server to manage synchronization processes.
 * @module lib/pm2
 */

const axios = require('axios');
const { withTimeout } = require('./utils');

/**
 * Client for managing PM2 processes via the pm2-server API.
 * Used to start/stop blockchain synchronization processes for explorers.
 *
 * @class PM2
 */
class PM2 {
    /** @type {string} PM2 server host URL */
    host;
    /** @type {string} Authentication secret */
    secret;

    /**
     * Creates a PM2 client instance.
     *
     * @param {string} host - PM2 server host (with or without http://)
     * @param {string} secret - Authentication secret for API calls
     */
    constructor(host, secret) {
        if (!host || !secret) throw new Error('Missing parameter');

        this.host = host.startsWith('http') ? host : `http://${host}`;
        this.secret = secret;
    }

    /**
     * Starts or resumes a sync process for a workspace.
     * If process exists but is stopped, resumes it; otherwise creates new.
     *
     * @param {string} slug - Process identifier (e.g., 'explorer-123')
     * @param {number} workspaceId - Workspace ID to sync
     * @returns {Promise<Object>} Axios response with process details
     */
    async start(slug, workspaceId) {
        if (!slug || !workspaceId) throw new Error('Missing parameter');

        const { data: existingProcess } = await this.find(slug);

        if (existingProcess && existingProcess.pm2_env.status != 'online') {
            const resource = `${this.host}/processes/${slug}/resume?secret=${this.secret}`
            return withTimeout(axios.post(resource));
        }

        const resource = `${this.host}/processes?secret=${this.secret}`;
        return withTimeout(axios.post(resource, { slug, workspaceId }));
    }

    /**
     * Resets a process by deleting and restarting it.
     *
     * @param {string} slug - Process identifier
     * @param {number} workspaceId - Workspace ID
     * @returns {Promise<Object>} Axios response
     */
    async reset(slug, workspaceId) {
        if (!slug || !workspaceId) throw new Error('Missing parameter');

        await this.delete(slug);
        return this.start(slug, workspaceId);
    }

    /**
     * Resumes a stopped process.
     *
     * @param {string} slug - Process identifier
     * @returns {Promise<Object>} Axios response
     */
    resume(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/resume?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }

    /**
     * Restarts a running process.
     *
     * @param {string} slug - Process identifier
     * @returns {Promise<Object>} Axios response
     */
    restart(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/restart?secret=${this.secret}`;
        return withTimeout(axios.post(resource));
    }

    /**
     * Finds a process by slug.
     *
     * @param {string} slug - Process identifier
     * @returns {Promise<Object>} Process info including pm2_env.status
     */
    find(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}?secret=${this.secret}`;
        return withTimeout(axios.get(resource));
    }

    /**
     * Stops a running process.
     *
     * @param {string} slug - Process identifier
     * @returns {Promise<Object>} Axios response
     */
    stop(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/stop?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }

    /**
     * Deletes a process completely.
     *
     * @param {string} slug - Process identifier
     * @returns {Promise<Object>} Axios response
     */
    delete(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/delete?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }

    /**
     * Starts a log listener process for event-driven synchronization.
     * Used for Orbit chains to listen for specific bridge events.
     *
     * @param {string} slug - Process identifier (e.g., 'logListener-123')
     * @param {string} jsonArgs - JSON string of listener configuration
     * @returns {Promise<Object>} Axios response
     */
    startLogListener(slug, jsonArgs) {
        if (!slug || !jsonArgs) throw new Error('Missing parameter');

        const resource = `${this.host}/log-listener?secret=${this.secret}`;
        return withTimeout(axios.post(resource, { slug, jsonArgs }));
    }

    /**
     * Starts an OP Stack log listener process for deposit event detection.
     * Watches the optimism portal for TransactionDeposited events.
     *
     * @param {string} slug - Process identifier (e.g., 'opLogListener-123')
     * @param {string} jsonArgs - JSON string of listener configuration
     * @returns {Promise<Object>} Axios response
     */
    startOpLogListener(slug, jsonArgs) {
        if (!slug || !jsonArgs) throw new Error('Missing parameter');

        const resource = `${this.host}/op-log-listener?secret=${this.secret}`;
        return withTimeout(axios.post(resource, { slug, jsonArgs }));
    }
}

module.exports = PM2;
