import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';

import { FIREBASE_CONFIG } from '../config/firebase.js';
firebase.initializeApp(FIREBASE_CONFIG);

const _auth = firebase.auth;

export const dbPlugin = {
    install(Vue, options) {
        var store = options.store;

        var currentUser = function() {
            return { uid: store.getters.currentWorkspace.firebaseUserId || store.getters.user.uid };
        };

        Vue.prototype.db = {
            getIdToken: function() {
                if (!currentUser()) return;
                return _auth().currentUser.getIdToken();
            }
        };
    }
};

if (process.env.NODE_ENV == 'development') {
    _auth().useEmulator(process.env.VUE_APP_AUTH_HOST);
}

export const auth = _auth;
