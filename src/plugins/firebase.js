import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';

import { FIREBASE_CONFIG } from '../config/firebase.js';
firebase.initializeApp(FIREBASE_CONFIG);

const _db = firebase.firestore();
const _rtdb = firebase.database();
const _functions = firebase.functions();
const _auth = firebase.auth;

export const dbPlugin = {
    install(Vue, options) {
        var store = options.store;

        var currentUser = function() {
            return firebase.auth().currentUser;
        };

        Vue.prototype.db = {
            contractStorage(contractAddress) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _rtdb.ref(`/users/${currentUser().uid}/workspaces/${currentWorkspace}/contracts/${contractAddress}`);
            },
            collection: function(path) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection(path);
            },
            settings: function() {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            const data = snapshot.data(options);
                            return data.settings ? data.settings : {};
                        }
                    })
            },
            advancedOptions: function() {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            const data = snapshot.data(options);
                            return data.advancedOptions ? data.advancedOptions : { tracing: 'disabled' };
                        }
                    })
            },
            currentUser: function() {
                if (!currentUser()) return;
                return _db.collection('users')
                    .doc(currentUser().uid);
            },
            workspaces: function() {
                if (!currentUser()) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            return {
                                id: snapshot.id,
                                rpcServer: snapshot.data(options).rpcServer
                            };
                        }
                    })
            },
            getWorkspace: function(workspace) {
                if (!currentUser() || !workspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(workspace)
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            return Object.defineProperty(snapshot.data(options), 'name', { value: workspace })
                        }
                    })
            },
            createUser: function(id) {
                if (!id) return false;
                return _db.collection('users')
                    .doc(id)
                    .set({ currentWorkspace: '' });
            },
            contractSerializer: snapshot => {
                var res = snapshot.data();

                var paths = snapshot.data().watchedPaths ? JSON.parse(snapshot.data().watchedPaths) : [];
                Object.defineProperty(res, 'watchedPaths', { value: paths });

                Object.defineProperty(res, 'dependencies', { value: {} });
                return res;
            },

            functions: _functions
        };
    }
};

if (process.env.NODE_ENV == 'development') {
    _functions.useFunctionsEmulator(process.env.VUE_APP_FUNCTIONS_HOST);
    _auth().useEmulator(process.env.VUE_APP_AUTH_HOST);

    const rtdbSplit = process.env.VUE_APP_RTDB_HOST.split(':');
    _rtdb.useEmulator(rtdbSplit[0], rtdbSplit[1]);

    const firestoreSplit = process.env.VUE_APP_FIRESTORE_HOST.split(':');
    _db.useEmulator(firestoreSplit[0], firestoreSplit[1]);
}

export const auth = _auth;
export const db = _db;
export const rtdb = _rtdb;
export const functions = _functions;
export const FieldValue = firebase.firestore.FieldValue;
