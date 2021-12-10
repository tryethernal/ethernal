export default {

    init: (firebase) => {

        const _firestore = firebase.firestore();
        const _database = firebase.database();

        return {
            tokens: () => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc('Hardhat')
                    .collection('contracts')
                    .where('patterns', 'array-contains', 'erc20');
            },

            onNewContract: function() {
                return true;
            },

            contractStorage: (contractAddress) => {
                return _database.ref(`/users/123/workspaces/Hardhat/contracts/${contractAddress}`);
            },

            advancedOptions: () => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc('Hardhat')
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            const data = snapshot.data(options);
                            return data.advancedOptions ? data.advancedOptions : { tracing: 'disabled' };
                        }
                    });
            },

            settings: () => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc('Hardhat')
                    .withConverter({
                        fromFirestore: function(snapshot, options) {
                            const data = snapshot.data(options);
                            return data.settings ? data.settings : {};
                        }
                    });
            },

            workspaces: () => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces');
            },

            currentUser: () => {
                return _firestore.collection('users').doc('123');
            },

            getWorkspace: (name) => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc(name);
            },

            collection: (name) => {
                return _firestore.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc('Hardhat')
                    .collection(name);
            },

            contractSerializer: (snapshot) => {
                var res = snapshot.data();

                var paths = snapshot.data().watchedPaths ? JSON.parse(snapshot.data().watchedPaths) : [];
                Object.defineProperty(res, 'watchedPaths', { value: paths });

                Object.defineProperty(res, 'dependencies', { value: {} });
                return res;
            },

        };
    }
}