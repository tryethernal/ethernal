import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';

import { FIREBASE_CONFIG } from '../config/firebase.js';
firebase.initializeApp(FIREBASE_CONFIG);

const _auth = firebase.auth;

export const dbPlugin = {
    install(Vue) {
        Vue.prototype.db = {
            getIdToken: function() {
                if (!_auth().currentUser) return new Promise(resolve => resolve(null));
                return _auth().currentUser.getIdToken();
            }
        };
    }
};

if (process.env.NODE_ENV == 'development') {
    _auth().useEmulator(process.env.VUE_APP_AUTH_HOST);
}

export const auth = _auth;
