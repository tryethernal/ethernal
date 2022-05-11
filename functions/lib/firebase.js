require('firebase/app');
require('firebase/firestore');
require('firebase/database');
const admin = require('firebase-admin');

const app = admin.initializeApp();
const _db = app.firestore();
const _rtdb = app.database();

let User, TokenTransfer, Transaction;

const writeLog = require('./writeLog');

const _getWorkspace = (userId, workspace) => _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

const getUser = async (id) => {
    try {
        const user = await User.findByAuthId(id);
        return user.toJSON();
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUser',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: id
        })
    }
    const user = await _db.collection('users').doc(id).get();
    return user.data();
};

const createUser = async (uid, data) => {
    try {
        await User.safeCreate(uid, data.email, data.apiKey, data.stripeCustomerId, data.plan);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.createUser',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: uid
        })
    }
    return _db.collection('users').doc(uid).set(data);
}

const getCollectionRef = (userId, workspace, collectionName) => {
    return _getWorkspace(userId, workspace).collection(collectionName)
};

const getUserWorkspaces = async (userId) => {
    try {
        const user = await User.findByAuthId(userId);
        return user.workspaces.map(w => w.toJSON());
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUserWorkspaces',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .get();
};

const addIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[addIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].addIntegration(integration);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.addIntegration',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(workspace)
        .update({
            'settings.integrations': admin.firestore.FieldValue.arrayUnion(integration)
        });
};

const removeIntegration = async (userId, workspace, integration) => {
    if (!userId || !workspace || !integration) throw '[removeIntegration] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].removeIntegration(integration);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.removeIntegration',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(workspace)
        .update({
            'settings.integrations': admin.firestore.FieldValue.arrayRemove(integration)
        });
};

const createWorkspace = async (userId, name, data) => {
    if (!userId || !name || !data) throw '[createWorkspace] Missing parameter';

    try {
        const user = await User.findByAuthId(userId);
        await user.safeCreateWorkspace({
            name: name,
            ...data
        });
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.createWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }

    return _db.collection('users')
        .doc(userId)
        .collection('workspaces')
        .doc(name)
        .set(data);
}

const getWorkspaceByName = async (userId, workspaceName) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspaceName);
        
        if (user.workspaces.length)
            return user.workspaces[0].toJSON();
        else
            throw new Error(`Couldn't find workspace ${workspaceName} for user ${userId}`);
    } catch(error) {
         writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getWorkspaceByName',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }

    const workspace = await _getWorkspace(userId, workspaceName).get();
    
    return {
        name: workspace.id,
        ...workspace.data()
    };
};

const storeBlock = async (userId, workspace, block) => {
    if (!userId || !workspace || !block) throw '[storeBlock] Missing parameter';

    // try {
    //     const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //     if (!user)
    //         throw new Error(`Couldn't find user ${userId}`)

    //     const existingBlock = await user.workspaces[0].findBlockByNumber(block.number);

    //     if (existingBlock)
    //         console.log(`Block ${existingBlock.number} has already been synced in workspace ${workspace}. Reset the workspace if you want to override it.`)
    //     else
    //         await user.workspaces[0].safeCreateBlock(block);
    // } catch(error) {
    //      writeLog({
    //         log: 'postgresLogs',
    //         functionName: 'firebase.storeBlock',
    //         message: (error.original && error.original.message) || error,
    //         detail: error.stack,
    //         uid: userId
    //     })
    // }

    const workspaceDoc = _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

    const blockDoc = workspaceDoc
        .collection('blocks')
        .doc(String(block.number))
        .set(block);

    return blockDoc;
};

const storeTransaction = async (userId, workspace, transaction) => {
    if (!userId || !workspace || !transaction) throw '[storeTransaction] Missing parameter';

    // try {
    //     const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //     const block = await user.workspaces[0].findBlockByNumber(transaction.blockNumber);
    //     if (!block)
    //         throw new Error(`Couldn't find block ${transaction.blockNumber}`);

    //     const existingTx = await user.workspaces[0].findTransaction(transaction.hash);
    //     if (existingTx)
    //         console.log(`Transaction ${existingTx.hash} already exists in workspace ${workspace}. Reset the workspace if you want to override it.`);
    //     else
    //         await user.workspaces[0].safeCreateTransaction(transaction, block.id);
    // } catch(error) {
    //      writeLog({
    //         log: 'postgresLogs',
    //         functionName: 'firebase.storeTransaction',
    //         message: (error.original && error.original.message) || error,
    //         detail: error.stack,
    //         uid: userId
    //     })
    // }

    const workspaceDoc = _db.collection('users').doc(userId).collection('workspaces').doc(workspace);

    const txDoc = workspaceDoc
        .collection('transactions')
        .doc(transaction.hash)
        .set(transaction);

    return txDoc;
};

const storeTransactionMethodDetails = async (userId, workspace, transactionHash, methodDetails) => {
    if (!userId || !workspace || !transactionHash) throw '[storeTransactionMethodDetails] Missing parameter';
    
    // if (methodDetails) {
    //     try {
    //         const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //         const transaction = await user.workspaces[0].findTransaction(transactionHash);
    //         await transaction.updateMethodDetails(methodDetails);
    //     } catch(error) {
    //         writeLog({
    //             log: 'postgresLogs',
    //             functionName: 'firebase.storeTransactionMethodDetails',
    //             message: (error.original && error.original.message) || error,
    //             detail: error.original && error.original.detail,
    //             transactionHash: transactionHash,
    //             uid: userId
    //         });
    //     }
    // }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .set({ methodDetails: methodDetails }, { merge: true });
};

const storeTransactionTokenTransfers = async (userId, workspace, transactionHash, tokenTransfers) => {
    if (!userId || !workspace || !transactionHash || !tokenTransfers) throw '[storeTransactionTokenTransfers] Missing parameter';
    
    // if (tokenTransfers.length) {
    //     try {
    //         const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //         const transaction = await user.workspaces[0].findTransaction(transactionHash);
    //         if (!transaction)
    //             throw new Error(`Couldn't find transaction ${transactionHash}`);

    //         for (let i = 0; i < tokenTransfers.length; i++)
    //             await transaction.safeCreateTokenTransfer(tokenTransfers[i]);
    //     } catch(error) {
    //         writeLog({
    //             log: 'postgresLogs',
    //             functionName: 'firebase.storeTransactionTokenTransfers',
    //             message: (error.original && error.original.message) || error,
    //             detail: error.original && error.original.detail,
    //             transactionHash: transactionHash,
    //             uid: userId
    //         });
    //     }
    // }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .set({ tokenTransfers: tokenTransfers }, { merge: true });
};

const storeContractData = async (userId, workspace, address, data) => {
    if (!userId || !workspace || !address || !data) throw '[storeContractData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].safeCreateOrUpdateContract({ address: address, ...data });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeContractData',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }

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
    
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contract = await user.workspaces[0].findContractByAddress(address);

        if (contract && contract.abi)
            return contract.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getContractData',
            message: (error.original && error.original.message) || error.stack,
            detail: error.original && error.original.detail,
            address: address,
            uid: userId
        });
    }

    const doc = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(address.toLowerCase())
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

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const contract = await user.workspaces[0].findContractByHashedBytecode(hashedBytecode);

        if (contract)
            return contract.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getContractByHashedBytecode',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
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

const storeTrace = async (userId, workspace, txHash, trace) => {
    if (!userId || !workspace || !txHash || !trace) throw '[storeTrace] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(txHash);

        if (!transaction)
            throw new Error(`Couldn't find transaction ${txHash}`);

        for (let i = 0; i < trace.length; i++)
            await transaction.safeCreateTransactionTraceStep(trace[i]);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeTrace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            transactionHash: txHash,
            uid: userId
        });
    }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(txHash)
        .set({ trace: trace }, { merge: true });
};

const storeTransactionData = async (userId, workspace, hash, data) => {
    if (!userId || !workspace || !hash || !data) throw '[storeTransactionData] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        const transaction = await user.workspaces[0].findTransaction(hash);

        if (!transaction)
            throw new Error(`Couldn't find transaction ${txHash}`);

        await transaction.safeUpdateStorage(data);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.storeTransactionData',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            transactionHash: hash,
            uid: userId
        });
    }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(hash)
        .set({ storage: data }, { merge: true });
};

const storeTokenBalanceChanges = async (userId, workspace, transactionHash, tokenBalanceChanges) => {
    if (!userId || !workspace || !transactionHash || !tokenBalanceChanges) throw '[storeTokenBalanceChanges] Missing parameter';

    // if (Object.keys(tokenBalanceChanges).length) {
    //     try {
    //         const user = await User.findByAuthIdWithWorkspace(userId, workspace);

    //         const transaction = await user.workspaces[0].findTransaction(transactionHash);
    //         if (!transaction)
    //             throw new Error(`Couldn't find transaction ${transactionHash}`);

    //         for (const [token, balanceChanges] of Object.entries(tokenBalanceChanges)) {
    //             for (let i = 0; i < balanceChanges.length; i++)
    //                 await transaction.safeCreateTokenBalanceChange({
    //                     token: token,
    //                     ...balanceChanges[i]
    //                 });
    //         }
    //     } catch(error) {
    //         writeLog({
    //             log: 'postgresLogs',
    //             functionName: 'firebase.storeTokenBalanceChanges',
    //             message: (error.original && error.original.message) || error,
    //             detail: error.original && error.original.detail,
    //             transactionHash: transactionHash,
    //             uid: userId
    //         });
    //     }
    // }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .set({ tokenBalanceChanges: tokenBalanceChanges }, { merge: true });
};

const storeFailedTransactionError = async (userId, workspace, transactionHash, error) => {
    if (!userId || !workspace || !transactionHash || !error) throw '[storeFailedTransactionError] Missing parameter';

    // if (error) {
    //     try {
    //         const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //         const transaction = await user.workspaces[0].findTransaction(transactionHash);

    //         if (!transaction)
    //             throw new Error(`Couldn't find transaction ${transactionHash}`);

    //         await transaction.updateFailedTransactionError({
    //             parsed: error.parsed,
    //             message: error.message
    //         });
    //     } catch(error) {
    //         writeLog({
    //             log: 'postgresLogs',
    //             functionName: 'firebase.storeFailedTransactionError',
    //             message: (error.original && error.original.message) || error,
    //             detail: error.original && error.original.detail,
    //             transactionHash: transactionHash,
    //             uid: userId
    //         });
    //     }
    // }

    return _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .set({ error: error }, { merge: true });
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

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, name);
        await user.update({ currentWorkspaceId: user.workspaces[0].id });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.setCurrentWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }

    const workspaceRef = _getWorkspace(userId, name);

    const ws = await workspaceRef.get();

    if (!ws.exists)
        throw 'This workspace does not exist.';

    return _db.collection('users')
        .doc(userId)
        .set({ currentWorkspace: workspaceRef }, { merge: true });
};

const updateWorkspaceSettings = async (userId, workspace, settings) => {
    if (!userId || !workspace || !settings) throw '[updateWorkspaceSettings] Missing parameter';

    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].updateSettings(settings);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.updateWorkspaceSettings',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }

    return _getWorkspace(userId, workspace)
        .update(settings);
};

const resetWorkspace = async (userId, workspace) => {
    try {
        const user = await User.findByAuthIdWithWorkspace(userId, workspace);
        await user.workspaces[0].reset();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.resetWorkspace',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        })
    }
};

const getUserbyStripeCustomerId = async (stripeCustomerId) => {
    if (!stripeCustomerId) throw '[getUserbyStripeCustomerId] Missing parameter';

    try {
        const user = await User.findByStripeCustomerId(stripeCustomerId);
        if (user)
            return user.toJSON();
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.getUserbyStripeCustomerId',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            stripeCustomerId: stripeCustomerId
        });
    }

    const userDocs = await _db.collection('users')
        .where('stripeCustomerId', '==', stripeCustomerId)
        .get();

    return userDocs.empty ? [] : userDocs.docs.map(doc => { return { id: doc.id, ...doc.data() }})[0];
};

const getUnprocessedContracts = async (userId, workspace) => {
    if (!userId || !workspace) throw '[getUnprocessedContracts] Missing parameter';

    // try {
    //     const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //     const contracts = await user.workspaces[0].getUnprocessedContracts();
    //     if (contracts.length)
    //         return contracts.map(c => c.toJSON());
    // } catch(error) {
    //     writeLog({
    //         log: 'postgresLogs',
    //         functionName: 'firebase.getUnprocessedContracts',
    //         message: (error.original && error.original.message) || error,
    //         detail: error.original && error.original.detail,
    //         uid: userId
    //     });
    // }

    const contractDocs = await _getWorkspace(userId, workspace)
        .collection('contracts')
        .get();

    return contractDocs.empty ? [] :
        contractDocs.docs
            .filter(doc => !doc.data().processed)
            .map(doc => doc.data());
};

const isUserPremium = async (userId) => {
    if (!userId) throw '[isUserPremium] Missing parameter';

    const user = await getUser(userId);
    return user.plan == 'premium';
};

const canUserSyncContract = async (userId, workspace) => {
    if (!userId) throw '[canUserSyncContract] Missing parameter';

    // try {
    //     const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //     if (user.isPremium)
    //         return true;
    //     const contracts = await user.workspaces[0].getContracts();
    //     if (contracts.length >= 10)
    //         return false;
    // } catch(error) {
    //     writeLog({
    //         log: 'postgresLogs',
    //         functionName: 'firebase.canUserSyncContract',
    //         message: (error.original && error.original.message) || error,
    //         detail: error.original && error.original.detail,
    //         uid: userId
    //     });
    // }

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

const getTransaction = async (userId, workspace, transactionHash) => {
    if (!userId || !workspace || !transactionHash) throw '[getTransaction] Missing parameter';

    const query = await _getWorkspace(userId, workspace)
        .collection('transactions')
        .doc(transactionHash)
        .get();

    return query.data();
};

const getPublicExplorerParamsBySlug = async (slug) => {
   if (!slug) throw '[getPublicExplorerParamsBySlug] Missing parameter';

    const doc = await _db.collection('public').doc(slug).get();
    const publicExplorerParams = doc.data();

    if (!publicExplorerParams) return;

    const workspace = (await _getWorkspace(publicExplorerParams.userId, publicExplorerParams.workspace).get()).data();

    if (!workspace) return;

    if (workspace.public)
        return publicExplorerParams;
};

const getContractDeploymentTxByAddress = async (userId, workspace, address) => {
    if (!userId || !workspace || !address) throw '[getContractDeploymentTxByAddress] Missing parameter';

    const query = await _getWorkspace(userId, workspace)
        .collection('transactions')
        .where('creates', '==', address)
        .get();

    const results = [];
    query.forEach((doc) => results.push(doc.data()));

    return results[0];
};

const updateContractVerificationStatus = async (userId, workspace, contractAddress, status) => {
    if (!userId || !workspace || !contractAddress || !status) throw '[updateContractVerificationStatus] Missing parameter';

    if (['success', 'pending', 'failed'].indexOf(status) === -1) return;

    // try {
    //     const user = await User.findByAuthIdWithWorkspace(userId, workspace);
    //     const contracts = await user.workspaces[0].getContracts({ where: { address: contractAddress }});
    //     contracts[0].update({ verificationStatus: status });
    // } catch(error) {
    //     writeLog({
    //         log: 'postgresLogs',
    //         functionName: 'firebase.updateContractVerificationStatus',
    //         message: (error.original && error.original.message) || error,
    //         detail: error.original && error.original.detail,
    //         address: contractAddress,
    //         uid: userId
    //     });
    // }

    return _getWorkspace(userId, workspace)
        .collection('contracts')
        .doc(contractAddress.toLowerCase())
        .set({ verificationStatus: status }, { merge: true });
};

const updateUserPlan = async (userId, plan) => {
    if (!userId || !plan) throw '[updateUserPlan] Missing parameter';

    if (['free', 'premium'].indexOf(plan) == -1)
        throw '[updateUserPlan] Invalid plan';

    try {
        const user = await User.findByAuthId(userId);
        await user.update({ plan: plan });
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'firebase.updateUserPlan',
            message: (error.original && error.original.message) || error,
            detail: error.original && error.original.detail,
            uid: userId
        });
    }

    return _db.collection('users')
        .doc(userId)
        .set({ plan: plan }, { merge: true });
};

const exportedFunctions = {
    storeBlock: storeBlock,
    storeTransaction: storeTransaction,
    storeContractData: storeContractData,
    storeContractArtifact: storeContractArtifact,
    storeContractDependencies: storeContractDependencies,
    getContractData: getContractData,
    getWorkspaceByName: getWorkspaceByName,
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
    storeTokenBalanceChanges: storeTokenBalanceChanges,
    storeTransactionTokenTransfers: storeTransactionTokenTransfers,
    getTransaction: getTransaction,
    getPublicExplorerParamsBySlug: getPublicExplorerParamsBySlug,
    getContractDeploymentTxByAddress: getContractDeploymentTxByAddress,
    updateContractVerificationStatus: updateContractVerificationStatus,
    storeFailedTransactionError: storeFailedTransactionError,
    updateUserPlan: updateUserPlan,
    resetWorkspace: resetWorkspace
};

module.exports = (models) => {
    User = User || models.User;
    TokenTransfer = TokenTransfer || models.TokenTransfer;
    Transaction = Transaction || models.Transaction;

    return {
        Timestamp: admin.firestore.Timestamp,
        firestore: _db,
        rtdb: _rtdb,
        ...exportedFunctions
    }
};
