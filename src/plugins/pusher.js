const Pusher = require('pusher-js');
import { sanitize } from '../lib/utils';
Pusher.logToConsole = process.env.NODE_ENV != 'production';

export const pusherPlugin = {

    async install(Vue, options) {
        const store = options.store;

        const pusher = process.env.VUE_APP_PUSHER_KEY ?
            new Pusher(process.env.VUE_APP_PUSHER_KEY, {
                cluster: 'eu',
                userAuthentication: {
                    headersProvider: () => store.getters.user.apiToken ? { 'Authorization': `Bearer ${store.getters.user.apiToken}` } : {}
                },
                channelAuthorization: {
                    endpoint: `${process.env.VUE_APP_API_ROOT}/api/pusher/authorization`,
                    headersProvider: () => store.getters.user.apiToken ? { 'Authorization': `Bearer ${store.getters.user.apiToken}` } : {},
                    params: sanitize({
                        firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                        workspace: store.getters.currentWorkspace.name
                    })
                }
            }) : {
                subscribe: () => {},
                bind: () => {}
            }

        Vue.prototype.pusher = {
            onUpdatedAccount(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-accounts;workspace=${workspaceId}`);
                return channel.bind('updated', handler, context);
            },

            onNewFailedTransactions(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-failedTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onNewProcessableTransactions(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-processableTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onNewBlock(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-blocks;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onNewContract(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onDestroyedContract(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('destroyed', handler, context);
            },

            onNewTransaction(handler, context, address) {
                const workspaceId = store.getters.currentWorkspace.id;
                const params = [`workspace=${workspaceId}`];
                if (address)
                    params.push(`address=${address}`)
                const channel = pusher.subscribe(`private-transactions;${params.join(';')}`);
                return channel.bind('new', handler, context);
            },

            onNewToken(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-tokens;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onUserUpdated(handler, context) {
                const userId = store.getters.user.id;
                const channel = pusher.subscribe(`private-cache-users;id=${userId}`);
                return channel.bind('updated', handler, context);
            }
        }
    }
};
