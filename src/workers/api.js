import axios from 'axios';

class Api {
    constructor(apiToken, workspace) {
        if (!apiToken || !workspace)
            throw new Error('[workers.api.constructor] Missing parameters');

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

        return axios.post(`/api/blocks?browserSync=true`, { data: { block: block, workspace: this.workspace }});
    }

    syncTransaction(block, transaction, transactionReceipt) {
        if (!block || !transaction || !transactionReceipt)
            throw new Error('[workers.api.syncTransaction] Missing parameter');

        return axios.post(`/api/transactions?browserSync=true`, {
            data: {
                block: block,
                transaction: transaction,
                transactionReceipt: transactionReceipt,
                workspace: this.workspace
            }
        });
    }
}

export default Api;
