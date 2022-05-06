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
            return { uid: store.getters.currentWorkspace.userId || store.getters.user.uid };
        };

        Vue.prototype.db = {
            tokens() {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('contracts')
                    .where('patterns', 'array-contains', 'erc20');
            },
            onNewProcessableTransactions(cb) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('transactions')
                    .where('tokenTransfers', '!=', [])
                    .where('tokenBalanceChanges', '==', {})
                    .onSnapshot((docs) => {
                        const transactions = [];
                        docs.forEach(doc => transactions.push(doc.data()));
                        cb(store.getters.currentWorkspace, transactions);
                    });
            },
            onNewFailedTransactions(cb) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('transactions')
                    .where('receipt.status', '==', 0)
                    .where('error', '==', '')
                    .onSnapshot((docs) => {
                        const transactions = [];
                        docs.forEach(doc => transactions.push(doc.data()));
                        cb(transactions, store.getters.currentWorkspace);
                    })
            },
            onNewContract(cb) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('contracts').onSnapshot(cb);
            },
            onNewBlock(cb) {
                var currentWorkspace = store.getters.currentWorkspace.name;
                if (!currentUser() || !currentWorkspace) return;
                return _db.collection('users')
                    .doc(currentUser().uid)
                    .collection('workspaces')
                    .doc(currentWorkspace)
                    .collection('blocks')
                    .orderBy('number')
                    .limitToLast(1)
                    .onSnapshot((docs) => {
                        if (docs.empty)
                            cb({})
                        else {
                            const blocks = [];
                            docs.forEach((doc) => blocks.push(doc.data()));
                            cb(blocks[0]);
                        }
                    });
            },
            async getPublicExplorerParamsByDomain(domain) {
                const query = await _db.collection('public')
                    .where('domain', '==', domain)
                    .get();

                const docs = [];
                query.forEach((el) => docs.push(el.data()));
                return docs[0];
            },
            async getPublicExplorerParamsBySlug(slug) {
                const query = await _db.collection('public')
                    .doc(slug)
                    .get();

                return query.data();
            },
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
                const user = store.getters.user;
                if (!user) return;
                return _db.collection('users')
                    .doc(user.uid);
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
                                name: snapshot.id,
                                rpcServer: snapshot.data(options).rpcServer
                            };
                        }
                    })
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
