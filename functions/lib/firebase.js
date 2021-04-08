import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/functions';

import { FIREBASE_CONFIG } from '../config/firebase.js';

const app = firebase.initializeApp(FIREBASE_CONFIG);
const _db = app.firestore();
const _rtdb = firebase.database();

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

                if (snapshot.data().watchedPaths)
                    Object.defineProperty(res, 'watchedPaths', { value: JSON.parse(snapshot.data().watchedPaths) })

                Object.defineProperty(res, 'dependencies', { value: {} })

                return res;
            }
        };
    }
};

export const auth = firebase.auth;
var _functions = firebase.functions();

if (process.env.NODE_ENV == 'development') {
    _functions.useFunctionsEmulator('http://localhost:5001');
}

export const functions = _functions;
export const FieldValue = firebase.firestore.FieldValue;
