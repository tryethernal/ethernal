import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';

import { FIREBASE_CONFIG } from '../config/firebase.js';
firebase.initializeApp(FIREBASE_CONFIG);

const _rtdb = firebase.database();
const _functions = firebase.functions();
const _auth = firebase.auth;

export const dbPlugin = {
    install(Vue, options) {
        var store = options.store;

        var currentUser = function() {
            return { uid: store.getters.currentWorkspace.firebaseUserId || store.getters.user.uid };
        };

        Vue.prototype.db = {
            contractStorage(contractAddress) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _rtdb.ref(`/users/${currentUser().uid}/workspaces/${currentWorkspace}/contracts/${contractAddress}`);
            },
            getIdToken: function() {
                if (!currentUser()) return;
                return _auth().currentUser.getIdToken();
            }
        };
    }
};

if (process.env.NODE_ENV == 'development') {
    _functions.useFunctionsEmulator(process.env.VUE_APP_FUNCTIONS_HOST);
    _auth().useEmulator(process.env.VUE_APP_AUTH_HOST);

    const rtdbSplit = process.env.VUE_APP_RTDB_HOST.split(':');
    _rtdb.useEmulator(rtdbSplit[0], rtdbSplit[1]);
}

export const auth = _auth;
export const rtdb = _rtdb;
export const functions = _functions;
