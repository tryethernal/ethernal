require('firebase/app');
require('firebase/firestore');
require('firebase/database');
const admin = require('firebase-admin');

const app = admin.initializeApp();
const _db = app.firestore();
const _rtdb = app.database();

const _getWorkspace = (userId, workspace) => _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

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

const storeContractData = (userId, workspace, contractAddress, data) => {
    if (!userId || !workspace || !contractAddress || !data) throw '[storeContractData] Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(contractAddress)
        .set(data, { merge: true });
};

const storeContractArtifact = (userId, workspace, contractAddress, artifact) => {
    if (!userId || !workspace || !contractAddress || !artifact) throw '[storeContractArtifact] Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${contractAddress}/artifact`).set(artifact);
};

const storeContractDependencies = (userId, workspace, contractAddress, dependencies) => {
    if (!userId || !workspace || !contractAddress || !dependencies) throw '[storeContractDependencies] Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${contractAddress}/dependencies`).set(dependencies);
};

const getContractData = (userId, workspace, contractAddress) => {
        if (!userId || !workspace || !contractAddress) throw '[getContractData] Missing parameter';
        return _getWorkspace(userId, workspace)
            .collection('contracts')
            .doc(contractAddress);
};

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    storeContractArtifact: storeContractArtifact,
    storeContractDependencies: storeContractDependencies,
    getContractData: getContractData
};
