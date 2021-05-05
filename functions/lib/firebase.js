require('firebase/app');
require('firebase/firestore');
require('firebase/database');
const admin = require('firebase-admin');

const app = admin.initializeApp();
const _db = app.firestore();
const _rtdb = app.database();

const _getWorkspace = (userId, workspace) => _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

const getUser = (id) => _db.collection('users').doc(id).get();

const addIntegration = (userId, workspace, integration) => {
    _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(workspace)
        .update({
            'settings.integrations': admin.firestore.FieldValue.arrayUnion(integration)
        });
};

const removeIntegration = (userId, workspace, integration) => {
    _db.collection('users')
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

const storeApiKey = (userId, key) => {
    if (!key) throw 'Missing key';
    if (!userId) throw 'Missing userId';

    return _db.collection('users').doc(userId).update({ apiKey: key });
};

const getAllUsers = () => {
    return _db.collection('users').get();
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

const storeContractData = (userId, workspace, address, data) => {
    if (!userId || !workspace || !address || !data) throw '[storeContractData] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(address)
        .set(data, { merge: true });
};

const storeContractArtifact = (userId, workspace, address, artifact) => {
    if (!userId || !workspace || !address || !artifact) throw '[storeContractArtifact] Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address}/artifact`).set(artifact);
};

const storeContractDependencies = (userId, workspace, address, dependencies) => {
    if (!userId || !workspace || !address || !dependencies) throw '[storeContractDependencies] Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${address}/dependencies`).set(dependencies);
};

const getContractData = (userId, workspace, address) => {
        if (!userId || !workspace || !address) throw '[getContractData] Missing parameter';
        return _getWorkspace(userId, workspace)
            .collection('contracts')
            .doc(address);
};

const storeAccountPrivateKey = (userId, workspace, address, privateKey) => {
    if (!userId || !workspace || !address || !privateKey) throw '[storeAccountPrivateKey] Missing parameter';

    return _getWorkspace(userId, workspace)
        .collection('accounts')
        .doc(address)
        .set({ privateKey: privateKey }, { merge: true });
};

const getAccount = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getAccount] Missing parameter';
    const doc = await _getWorkspace(userId, workspace)
        .collection('accounts')
        .doc(address)
        .get();
    if (doc.empty) {
        return null;
    }
    else {
        return { ...doc.data(), id: doc.id };
    }
};

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    storeContractArtifact: storeContractArtifact,
    storeContractDependencies: storeContractDependencies,
    getContractData: getContractData,
    getUserByKey: getUserByKey,
    getWorkspaceByName: getWorkspaceByName,
    storeApiKey: storeApiKey,
    getAllUsers: getAllUsers,
    getUser: getUser,
    addIntegration: addIntegration,
    removeIntegration: removeIntegration,
    storeAccountPrivateKey: storeAccountPrivateKey,
    getAccount: getAccount
};
