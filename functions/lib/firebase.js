require('firebase/app');
require('firebase/firestore');
require('firebase/database');
const admin = require('firebase-admin');

const app = admin.initializeApp();
const _db = app.firestore();
const _rtdb = app.database();

const _getWorkspace = (userId, workspace) => _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

const storeBlock = (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw 'Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('blocks')
        .doc(String(block.number))
        .set(block, { merge: true });
};

const storeTransaction = (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw 'Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transaction.hash)
        .set(transaction, { merge: true }); 
};

const storeContractData = (userId, workspace, data) => {
    if (!userId || !workspace || !contractAddress) throw 'Missing parameter';
    return _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(contractAddress)
        .set(data, { merge: true }); 
};

const storeContractArtifact = (userId, wokspace, contractAddress, artifact) => {
    if (!userId || !workspace || !contractAddress) throw 'Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${contractAddress}/artifact`).set(artifact);
};

const storeContractDependencies = (userId, wokspace, contractAddress, dependencies) => {
    if (!userId || !workspace || !contractAddress) throw 'Missing parameter';

    return _rtdb.ref(`/users/${userId}/workspaces/${workspace}/contracts/${contractAddress}/dependencies`).set(dependencies);
};

const store

module.exports = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractAddress: storeContractAddress
};
