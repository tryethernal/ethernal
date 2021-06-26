export default {

    init: (db) => {

        const _db = db;

        return {
            advancedOptions: () => {
                return _db.collection('users')
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
                return _db.collection('users')
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
                return _db.collection('users')
                    .doc('123')
                    .collection('workspaces');
            },

            currentUser: () => {
                return _db.collection('users').doc('123');
            },

            getWorkspace: (name) => {
                return _db.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc(name);
            },

            collection: (name) => {
                return _db.collection('users')
                    .doc('123')
                    .collection('workspaces')
                    .doc('ws')
                    .collection(name);
            }

        };
    }
}