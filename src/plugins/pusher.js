const Pusher = require('pusher-js');
import { storeToRefs } from 'pinia';
import { useEnvStore } from '../stores/env';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useUserStore } from '../stores/user';
import { sanitize } from '../lib/utils';
Pusher.logToConsole = import.meta.env.NODE_ENV == 'development' && true;

export default {
    install(app) {
        let envStore, currentWorkspaceStore, userStore, apiToken, pusher;

        const $pusher = {
            init() {
                envStore = useEnvStore();
                currentWorkspaceStore = useCurrentWorkspaceStore();
                userStore = useUserStore();
                apiToken = localStorage.getItem('apiToken');

                pusher = envStore.pusherKey ?
                    new Pusher(envStore.pusherKey, {
                        wsHost: envStore.soketiHost,
                        wsPort: envStore.soketiPort,
                        forceTLS: envStore.soketiForceTLS,
                        enabledTransports: ['ws', 'wss'],
                        userAuthentication: {
                            headersProvider: () => apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}
                        },
                        channelAuthorization: {
                            endpoint: `${envStore.apiRoot}/api/pusher/authorization`,
                            headersProvider: () => apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {},
                            params: sanitize({
                                    firebaseUserId: storeToRefs(userStore).firebaseUserId.value,
                                    workspace: storeToRefs(currentWorkspaceStore).name.value
                            })
                        }
                    }) : {
                        subscribe: () => ({ bind: () => {}, unbind: () => {} }),
                    }
            },

            onNewContractLog(handler, address, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-contractLog;workspace=${workspaceId};contract=${address}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onUpdatedAccount(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-accounts;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('updated', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewFailedTransactions(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channel = pusher.subscribe(`private-failedTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onNewProcessableTransactions(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channel = pusher.subscribe(`private-processableTransactions;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onNewBlock(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-blocks;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                return channel.bind('new', handler, context);
            },

            onNewContract(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channel = pusher.subscribe(`private-contracts;workspace=${workspaceId}`);
                return channel.bind('new', handler, context);
            },

            onDestroyedContract(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-contracts;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                return channel.bind('destroyed', handler, context);
            },

            onNewTransaction(handler, context, address) {
                const workspaceId = currentWorkspaceStore.id;
                const params = [`workspace=${workspaceId}`];
                if (address)
                    params.push(`address=${address}`)
                const channelString = `private-transactions;${params.join(';')}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewToken(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-tokens;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewNft(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-nft;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onUserUpdated(handler, context) {
                const userId = userStore.id;
                const channelString = `private-cache-users;id=${userId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('updated', handler, context);
                return () => pusher.unsubscribe(channelString);
            },

            onNewBlockEvent(handler, context) {
                const workspaceId = currentWorkspaceStore.id;
                const channelString = `private-cache-block-events;workspace=${workspaceId}`;
                const channel = pusher.subscribe(channelString);
                channel.bind('new', handler, context);
                return () => pusher.unsubscribe(channelString);
            }
        }

        app.config.globalProperties.$pusher = $pusher;
    }
};
