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

    start(slug, workspaceId) {
        if (!slug || !workspaceId) throw new Error('Missing parameter');

        const resource = `${this.host}/processes?secret=${this.secret}`;
        return withTimeout(axios.post(resource, { slug, workspaceId }));
    }

    restart(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/restart?secret=${this.secret}`;
        return withTimeout(axios.post(resource));
    }

    find(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}?secret=${this.secret}`;
        return withTimeout(axios.get(resource));
    }

    delete(slug) {
        if (!slug) throw new Error('Missing parameter');

        const resource = `${this.host}/processes/${slug}/delete?secret=${this.secret}`
        return withTimeout(axios.post(resource));
    }
}

module.exports = PM2;
