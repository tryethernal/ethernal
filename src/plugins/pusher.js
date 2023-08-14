const Pusher = require('pusher-js');
import { sanitize } from '../lib/utils';
Pusher.logToConsole = process.env.NODE_ENV != 'production';

export const pusherPlugin = {

    async install(Vue, options) {
        const store = options.store;
        const apiToken = localStorage.getItem('apiToken');

        const pusher = process.env.VUE_APP_PUSHER_KEY ?
            new Pusher(process.env.VUE_APP_PUSHER_KEY, {
                cluster: 'eu',
                userAuthentication: {
                    headersProvider: () => apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
                },
                channelAuthorization: {
                    endpoint: `${store.getters.apiRoot}/api/pusher/authorization`,
                    headersProvider: () => apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {},
                    params: sanitize({
                        firebaseUserId: store.getters.currentWorkspace.firebaseUserId,
                        workspace: store.getters.currentWorkspace.name
                    })
                }
            }) : {
                subscribe: () => ({ bind: () => {}, unbind: () => {} }),
            }

        Vue.prototype.pusher = {
            onNewContractLog(handler, address, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channelString = `private-contractLog;workspace=${workspaceId};contract=${address}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onUpdatedAccount(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channelString = `private-accounts;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('updated', handler, context);
                return () => pusher.unsubscribe(channelString);
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
                const channelString = `private-blocks;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                return channel.bind('new', handler, context);
            },

            onNewContract(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onDestroyedContract(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channelString = `private-contracts;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                return channel.bind('destroyed', handler, context);
            },

            onNewTransaction(handler, context, address) {
                const workspaceId = store.getters.currentWorkspace.id;
                const params = [`workspace=${workspaceId}`];
                if (address)
                    params.push(`address=${address}`)
                const channelString = `private-transactions;${params.join(';')}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewToken(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channelString = `private-tokens;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewNft(handler, context) {
                const workspaceId = store.getters.currentWorkspace.id;
                const channelString = `private-nft;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onUserUpdated(handler, context) {
                const userId = store.getters.user.id;
                const channelString = `private-cache-users;id=${userId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('updated', handler, context);
                return () => pusher.unsubscribe(channelString);
            }
        }
    }
};
