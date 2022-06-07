const Pusher = require('pusher-js');
 Pusher.logToConsole = process.env.NODE_ENV != 'production';

export const pusherPlugin = {
    install(Vue, options) {
        const store = options.store;
        const isPublicExplorer = store.getters.isPublicExplorer;
        const workspaceId = store.getters.currentWorkspace.id;
        const channelPrefix = isPublicExplorer ? '' : 'private-';
        const pusher = new Pusher(process.env.VUE_APP_PUSHER_KEY, {
            cluster: 'eu',
            userAuthentication: {
                endpoint: `${process.env.VUE_APP_API_ROOT}/api/pusher/authentication`,
                params: {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.userId
                }
            },
            userAuthorization: {
                endpoint: `${process.env.VUE_APP_API_ROOT}/api/pusher/authorization`,
                params: {
                    firebaseAuthToken: store.getters.firebaseIdToken,
                    firebaseUserId: store.getters.currentWorkspace.userId
                }
            }
        });

        Vue.prototype.pusher = {
            subscribeToBlocks() {
                return pusher.subscribe(`${channelPrefix}blocks:${workspaceId}`);
            },

            subscribeToTransactions() {
                return pusher.subscribe(`${channelPrefix}transactions:${workspaceId}`);
            }
        }
    }
};
