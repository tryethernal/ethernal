require('firebase/app');
require('firebase/firestore');
require('firebase/database');
const admin = require('firebase-admin');

const app = admin.initializeApp();
const _db = app.firestore();
const _rtdb = app.database();

const _getWorkspace = (userId, workspace) => _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

const getUser = (id) => _db.collection('users').doc(id).get();

const createUser = (uid, data) => _db.collection('users').doc(uid).set(data);

const getCollectionRef = (userId, workspace, collectionName) => {
    return _getWorkspace(userId, workspace).collection(collectionName)
};

const getUserWorkspaces = (userId) => {
    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .get();
};

const addIntegration = (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[addIntegration] Missing parameter';

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(workspace)
        .update({
            'settings.integrations': admin.firestore.FieldValue.arrayUnion(integration)
        });
};

const removeIntegration = (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[removeIntegration] Missing parameter';

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(workspace)
        .update({
            'settings.integrations': admin.firestore.FieldValue.arrayRemove(integration)
        });
};

const getUserByKey = async (key) => {
    if (!key) throw 'Missing API key.';
    const userDoc = await _db.collection('users').where('apiKey', '==', key).get();

    if (userDoc.empty) {
        return null;
    }
    else {
        const results = []
        userDoc.forEach(doc => {
            results.push({
                uid: doc.id,
                ...doc.data()
            });
        });
        return results[0];
    }
};

const createWorkspace = (userId, name, data) => {
    if (!userId || !name || !data) throw '[createWorkspace] Missing parameter';

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(name)
        .set(data);
}

const storeApiKey = (userId, key) => {
    if (!key) throw 'Missing key';
    if (!userId) throw 'Missing userId';

    return _db.collection('users').doc(userId).update({ apiKey: key });
};

const getWorkspaceByName = async (userId, workspaceName) => {
    const workspace = await _getWorkspace(userId, workspaceName).get();
    
    return {
        name: workspace.id,
        ...workspace.data()
    };
};

const storeBlock = (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw '[storeBlock] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('blocks')
        .doc(String(block.number))
        .set(block, { merge: true });
};

const storeTransaction = (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw '[storeTransaction] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transaction.hash)
        .set(transaction, { merge: true }); 
};

const storeTransactionMethodDetails = (userId, workspace, transactionHash, methodDetails) => {
    if (!userId || !workspace || !transactionHash) throw '[storeTransactionMethodDetails] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .set({ methodDetails: methodDetails }, { merge: true });
};

const storeContractData = (userId, workspace, address, data) => {
    if (!userId || !workspace || !address || !data) throw '[storeContractData] Missing parameter';

    return _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(address.toLowerCase())
        .set(data, { merge: true })
};

const storeContractArtifact = (userId, workspace, address, artifact) => {
    if (!userId || !workspace || !address || !artifact) throw '[storeContractArtifact] Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address.toLowerCase()}`)
        .set({ artifact: artifact, updatedAt: admin.firestore.Timestamp.now()._seconds });
};

const storeContractDependencies = (userId, workspace, address, dependencies) => {
    if (!userId || !workspace || !address || !dependencies) throw '[storeContractDependencies] Missing parameter';

    const promises = [];

    promises.push(_rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address.toLowerCase()}/dependencies`)
        .update(dependencies));

    promises.push(_rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address.toLowerCase()}`)
        .update({ updatedAt: admin.firestore.Timestamp.now()._seconds }));

    return Promise.all(promises);
};

const getContractArtifact = (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractArtifact] Missing parameter';
    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address}/artifact`).once('value');
};

const getContractArtifactDependencies = (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractArtifactDependencies] Missing parameter';
    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address}/dependencies`).once('value');
};

const resetDatabaseWorkspace = (userId, workspace) => {
    if (!userId || !workspace) throw '[resetDatabaseWorkspace] Missing parameter';
    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}`).set(null);
};

const removeDatabaseContractArtifacts = (userId, workspace, address) => {
    if (!userId || !workspace) throw '[removeDatabaseContractArtifacts] Missing parameter';
    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address}`).set(null);
};

const getContractData = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractData] Missing parameter';
    const doc = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(address)
        .get();

    if (!doc.exists) {
        return null;
    }
    else {
        return { ...doc.data(), id: doc.id };
    }
};

const getContractRef = (userId, workspace, address) => {
        if (!userId || !workspace || !address) throw '[getContractRef] Missing parameter';
        return _getWorkspace(userId, workspace)
            .collection('contracts')
            .doc(address.toLowerCase());
};

const getContractByHashedBytecode = async (userId, workspace, hashedBytecode, exclude = []) => {
    if (!userId || !workspace || !hashedBytecode) {
        throw '[getContractByHashedBytecode] Missing parameter';
    }

    const contracts = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .where('hashedBytecode', '==', hashedBytecode)
        .where('address', 'not-in', exclude)
        .get();

    if (contracts.empty) {
        return null;
    }
    else {
        const results = [];
        contracts.forEach(doc => {
            results.push({
                uid: doc.id,
                ...doc.data()
            });
        });
        return results[0];
    }
};

const storeAccountPrivateKey = (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw '[storeAccountPrivateKey] Missing parameter';

    return _getWorkspace(userId, workspace)
        .collection('accounts')
        .doc(address.toLowerCase())
        .set({ address: address, privateKey: privateKey }, { merge: true });
};

const getAccount = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getAccount] Missing parameter';

    const doc = await _getWorkspace(userId, workspace)
        .collection('accounts')
        .doc(address)
        .get();

    if (!doc.exists) {
        return null;
    }
    else {
        return { ...doc.data(), id: doc.id };
    }
};

const storeTrace = (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw '[storeTrace] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(txHash)
        .set({ trace: trace }, { merge: true });
};

const storeTransactionData = (userId, workspace, hash, data) => {
    if (!userId || !workspace || !hash || !data) throw '[storeTransactionData] Missing parameter';

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(hash)
        .set({ storage: data }, { merge: true });
};

const updateAccountBalance = (userId, workspace, account, balance) => {
    if (!userId || !workspace || !account || !balance) throw '[updateAccountBalance] Missing parameter';

    return _getWorkspace(userId, workspace)
        .collection('accounts')
        .doc(account)
        .set({ balance: balance }, { merge: true });
};

const setCurrentWorkspace = async (userId, name) => {
    if (!userId || !name) throw '[setCurrentWorkspace] Missing parameter';

    const workspaceRef = _getWorkspace(userId, name);

    const ws = await workspaceRef.get();

    if (!ws.exists)
        throw 'This workspace does not exist.';

    return _db.collection('users')
        .doc(userId)
        .set({ currentWorkspace: workspaceRef }, { merge: true });
};

const updateWorkspaceSettings = (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw '[updateWorkspaceSettings] Missing parameter';

    return _getWorkspace(userId, workspace)
        .update(settings);
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw '[getUserbyStripeCustomerId] Missing parameter';

    const userDoc = await _db.collection('users').where('stripeCustomerId', '==', stripeCustomerId).get();

    if (userDoc.empty) {
        return null;
    }
    else {
        return userDoc.docs[0].ref;
    }
};

const setUserData = async (userId, data) => {
    if (!userId || !data) throw '[setUserData] Missing parameter';

    return _db.collection('users').doc(userId).set(data, { merge: true });
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw '[getUnprocessedContracts] Missing parameter';

    const contractDocs = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .get();

    return contractDocs.empty ? [] :
        contractDocs.docs
            .filter(doc => !doc.data().processed)
            .map(doc => doc.data());
};

const isUserPremium = async (userId) => {
    if (!userId) throw '[canUserSyncContract Missing parameter';

    const user = (await getUser(userId)).data();
    
    return user.plan == 'premium';
};

const canUserSyncContract = async (userId, workspace) => {
    if (!userId) throw '[canUserSyncContract Missing parameter';

    const premium = await isUserPremium(userId);

    if (premium) return true;

    const storedContracts = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .limit(10)
        .get();

    return storedContracts._size < 10;
};

const getContractTransactions = async (userId, workspace, contractAddress) => {
    if (!userId || !workspace || !contractAddress) throw  '[getContractTransactions] Missing parameter';

    const docs = await _getWorkspace(userId, workspace)
        .collection('transactions')
        .where('to', '==', contractAddress)
        .get();

    const results = []
    docs.forEach(doc => results.push(doc.data()));
    return results;
};

const incrementBlockCount = async (userId, workspace, incr) => {
    if (!userId || !workspace || !incr) throw '[incrementBlockCount] Missing parameter';

    const shardId = Math.floor(Math.random() * 10);
    return await _getWorkspace(userId, workspace)
        .collection('stats/blocks/counters')
        .doc(`shard-${shardId}`)
        .set({ value: admin.firestore.FieldValue.increment(incr) }, { merge: true });
};

const incrementTotalTransactionCount = async (userId, workspace, incr) => {
    if (!userId || !workspace || !incr) throw '[incrementBlockCount] Missing parameter';

    const shardId = Math.floor(Math.random() * 10);
    return await _getWorkspace(userId, workspace)
        .collection('stats/transactions/counters')
        .doc(`shard-${shardId}`)
        .set({ value: admin.firestore.FieldValue.increment(incr) }, { merge: true });
};

const incrementAddressTransactionCount = async (userId, workspace, address, incr) => {
    if (!userId || !workspace || !address || !incr) throw '[incrementBlockCount] Missing parameter';

    const shardId = Math.floor(Math.random() * 10);
    return await _getWorkspace(userId, workspace)
        .collection(`stats/addresses/${address}/counters/shards`)
        .doc(`shard-${shardId}`)
        .set({ value: admin.firestore.FieldValue.increment(incr) }, { merge: true });
};

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw '[getPublicExplorerParamsBySlug] Missing parameter';

    const doc = await _db.collection('public').doc(slug).get();
    const publicExplorerParams = doc.data();

    if (!publicExplorerParams) return;

    const workspace = (await _getWorkspace(publicExplorerParams.userId, publicExplorerParams.workspace).get()).data();

    if (!workspace) return;

    if (workspace.public)
        return { ...publicExplorerParams, rpcServer: workspace.rpcServer };
};

module.exports = {
    Timestamp: admin.firestore.Timestamp,
    firestore: _db,
    rtdb: _rtdb,
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    storeContractArtifact: storeContractArtifact,
    storeContractDependencies: storeContractDependencies,
    getContractData: getContractData,
    getUserByKey: getUserByKey,
    getWorkspaceByName: getWorkspaceByName,
    storeApiKey: storeApiKey,
    getUser: getUser,
    addIntegration: addIntegration,
    removeIntegration: removeIntegration,
    storeAccountPrivateKey: storeAccountPrivateKey,
    getAccount: getAccount,
    storeTrace: storeTrace,
    getContractByHashedBytecode: getContractByHashedBytecode,
    createWorkspace: createWorkspace,
    updateAccountBalance: updateAccountBalance,
    setCurrentWorkspace: setCurrentWorkspace,
    updateWorkspaceSettings: updateWorkspaceSettings,
    getContractRef: getContractRef,
    resetDatabaseWorkspace: resetDatabaseWorkspace,
    getContractArtifact: getContractArtifact,
    getContractArtifactDependencies: getContractArtifactDependencies,
    getUserbyStripeCustomerId: getUserbyStripeCustomerId,
    setUserData: setUserData,
    getCollectionRef: getCollectionRef,
    getUserWorkspaces: getUserWorkspaces,
    removeDatabaseContractArtifacts: removeDatabaseContractArtifacts,
    storeTransactionData: storeTransactionData,
    createUser: createUser,
    getUnprocessedContracts: getUnprocessedContracts,
    canUserSyncContract: canUserSyncContract,
    isUserPremium: isUserPremium,
    getContractTransactions: getContractTransactions,
    storeTransactionMethodDetails: storeTransactionMethodDetails,
    incrementBlockCount: incrementBlockCount,
    incrementTotalTransactionCount: incrementTotalTransactionCount,
    incrementAddressTransactionCount: incrementAddressTransactionCount,
    getPublicExplorerParamsBySlug: getPublicExplorerParamsBySlug
};
