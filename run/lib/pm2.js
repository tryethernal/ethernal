const axios = require('axios');
const { withTimeout } = require('./utils');

class PM2 {
    host;
    secret;

    constructor(host, secret) {
        if (!host || !secret) throw new Error('Missing parameter');

        this.host = host;
        this.secret = secret;
    }

    start(slug, workspace, apiToken) {
        if (!slug || !workspace || !apiToken) throw new Error('Missing parameter');

        const resource = `${this.host}/processes?secret=${this.secret}`;
        return withTimeout(axios.post(resource, { slug, workspace, apiToken }));
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
