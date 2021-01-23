import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

import { FIREBASE_CONFIG } from '../config/firebase.js';

const app = firebase.initializeApp(FIREBASE_CONFIG);
const _db = app.firestore();

export const dbPlugin = {
    install(Vue, options) {
        var store = options.store;

        var currentUser = function() {
            return firebase.auth().currentUser;
        };

        Vue.prototype.db = {
            collection: function(path) {
                var networkId = store.getters.networkId;
                var currentWorkspace = store.getters.currentWorkspace;
                if (!currentUser() || !networkId || !currentWorkspace) return _db.collection(path);
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('networks')
                    .doc(networkId.toString())
                    .collection(path);
            },
            settings: function() {
                var currentWorkspace = store.getters.currentWorkspace;
                if (!currentUser() || !currentWorkspace) return _db.collection('settings');
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            const data = snapshot.data(options);
                            return data.settings;
                        }
                    })
            },
            currentUser: function() {
                if (!currentUser()) return;
                return _db.collection('users')
                    .doc(currentUser().uid);
            },
            workspaces: function() {
                if (!currentUser()) return  _db.collection('workspaces');
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            return {
                                id: snapshot.id,
                                rpcServer: snapshot.data(options).settings.rpcServer
                            };
                        }
                    })
            },
            createUser: function(id) {
                if (!id) return false;
                return _db.collection('users')
                    .doc(id)
                    .set({ currentWorkspace: '' });
            },
            contractSerializer: {
                serialize: snapshot => {
                    var res = snapshot.data();
                    
                    if (snapshot.data().artifact)
                        Object.defineProperty(res, 'artifact', { value: JSON.parse(snapshot.data().artifact) })
                    
                    if (snapshot.data().storageStructure)
                        Object.defineProperty(res, 'storageStructure', { value: JSON.parse(snapshot.data().storageStructure) })

                    return res
                }
            }
        };
    }
};

export const auth = firebase.auth;
export const FieldValue = firebase.firestore.FieldValue;
