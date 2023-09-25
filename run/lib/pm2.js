const axios = require('axios');
const { withTimeout } = require('./utils');

class PM2 {
    host;
    secret;

    constructor(host, secret) {
        if (!host || !secret) throw new Error('Missing parameter');

        this.host = host.startsWith('http') ? host : `http://${host}`;
        this.secret = secret;
    }

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

    resume(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/resume?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }

    find(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}?secret=${this.secret}`;
        return withTimeout(axios.get(resource));
    }

    stop(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/stop?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }

    delete(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/delete?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }
}

module.exports = PM2;
