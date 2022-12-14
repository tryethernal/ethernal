const Pusher = require('pusher-js');
import { sanitize } from '../lib/utils';
Pusher.logToConsole = process.env.NODE_ENV != 'production';

export const pusherPlugin = {

    async install(Vue, options) {
        const store = options.store;

        const getPusher = async () => {
            return process.env.VUE_APP_PUSHER_KEY ?
                new Pusher(process.env.VUE_APP_PUSHER_KEY, {
                    cluster: 'eu',
                    channelAuthorization: {
                        endpoint: `${process.env.VUE_APP_API_ROOT}/api/pusher/authorization`,
                        params: sanitize({
                            firebaseAuthToken: await Vue.prototype.db.getIdToken(),
                            firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                            workspace: store.getters.currentWorkspace.name
                        })
                    }
                }) : {
                    subscribe: () => {},
                    bind: () => {}
                }
        };

        Vue.prototype.pusher = {
            async onUpdatedAccount(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-accounts;workspace=${workspaceId}`);
                return channel.bind('updated', handler, context);
            },

            async onNewFailedTransactions(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-failedTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            async onNewProcessableTransactions(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-processableTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            async onNewBlock(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-blocks;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            async onNewContract(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            async onDestroyedContract(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('destroyed', handler, context);
            },

            async onNewTransaction(handler, context, address) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const params = [`workspace=${workspaceId}`];
                if (address)
                    params.push(`address=${address}`)
                const channel = pusher.subscribe(`private-transactions;${params.join(';')}`);
                return channel.bind('new', handler, context);
            },

            async onNewToken(handler, context) {
                const pusher = await getPusher();
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-tokens;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            async onUserUpdated(handler, context) {
                const pusher = await getPusher();
                const userId = store.getters.user.id;
                const channel = pusher.subscribe(`private-cache-users;id=${userId}`);
                return channel.bind('updated', handler, context);
            }
        }
    }
};
