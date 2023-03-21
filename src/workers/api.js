const axios = require('axios');

class Api {
    constructor(apiToken, apiRoot, workspace) {
        if (!apiToken || !apiRoot || !workspace)
            throw new Error('[workers.api.constructor] Missing parameters');

        this.apiRoot = apiRoot;
        this.workspace = workspace;
        axios.interceptors.request.use(
            config => {
                config.headers['Authorization'] = `Bearer ${apiToken}`
                return config;
            }
        );
    }

    syncBlock(block) {
        if (!block)
            throw new Error('[workers.api.syncBlock] Missing block');

        return axios.post(`${this.apiRoot}/api/blocks?browserSync=true`, { data: { block: block, workspace: this.workspace }});
    }

    syncTransaction(block, transaction, transactionReceipt) {
        if (!block || !transaction || !transactionReceipt)
            throw new Error('[workers.api.syncTransaction] Missing parameter');

        return axios.post(`${this.apiRoot}/api/transactions?browserSync=true`, {
            data: {
                block: block,
                transaction: transaction,
                transactionReceipt: transactionReceipt,
                workspace: this.workspace
            }
        });
    }
}


module.exports = Api;
