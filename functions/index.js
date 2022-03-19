const functions = require('firebase-functions');
const uuidAPIKey = require('uuid-apikey');
const ethers = require('ethers');
const Web3 = require('web3');
const axios = require('axios');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const Decoder = require('@truffle/decoder');
const firebaseTools = require('firebase-tools');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const { PubSub } = require('@google-cloud/pubsub');
const solc = require('solc');

const Storage = require('./lib/storage');
const { sanitize, stringifyBns, getFunctionSignatureForTransaction } = require('./lib/utils');
const { encrypt, decrypt, encode } = require('./lib/crypto');
const { processContract } = require('./triggers/contracts');
const { cleanArtifactDependencies } = require('./schedulers/cleaner');
const { getTokenTransfers } = require('./lib/abi');
const Analytics = require('./lib/analytics');

const analytics = new Analytics(functions.config().mixpanel ? functions.config().mixpanel.token : null);

const { processTransactions } = require('./lib/transactions');

const api = require('./api/index');
const {
    resetDatabaseWorkspace,
    storeBlock,
    storeTransaction,
    storeContractData,
    storeContractArtifact,
    getContractData,
    storeContractDependencies,
    getUser,
    addIntegration,
    removeIntegration,
    storeAccountPrivateKey,
    getAccount,
    getAllWorkspaces,
    storeTrace,
    createWorkspace,
    updateAccountBalance,
    setCurrentWorkspace,
    updateWorkspaceSettings,
    getContractRef,
    Firebase,
    getCollectionRef,
    getUserWorkspaces,
    setUserData,
    removeDatabaseContractArtifacts,
    storeTransactionData,
    storeApiKey,
    createUser,
    getWorkspaceByName,
    getUnprocessedContracts,
    canUserSyncContract,
    isUserPremium,
    storeTokenBalanceChanges,
    getTransaction,
    getPublicExplorerParamsBySlug,
    getContractDeploymentTxByAddress,
    updateContractVerificationStatus
} = require('./lib/firebase');

const pubsub = new PubSub();

exports.billUsage = functions.pubsub.topic('bill-usage').onPublish(async (message) => {
    try {
        const payload = message.json;

        const userId = payload.userId;
        const timestamp = payload.timestamp;

        const user = (await getUser(userId)).data();
        console.log(user)
        if (!user.explorerSubscriptionId) return;

        return stripe.subscriptionItems.createUsageRecord(
            user.explorerSubscriptionId,
            {
                quantity: 1,
                timestamp: timestamp
            }
        );
    } catch(error) {
        console.log(error);
    }
});

exports.processContractVerification = functions.pubsub.topic('verify-contract').onPublish(async (message) => {
    try {
        const payload = message.json;

        const sources = payload.code.sources;
        console.log(payload.code)
        if (!sources)
            throw '[processContractVerification] Missing sources';

        const imports = payload.code.imports || {};
        const compilerVersion = payload.compilerVersion;
        const contractAddress = payload.contractAddress;
        const constructorArguments = payload.constructorArguments;
        const explorerSlug = payload.explorerSlug;
        const contractName = payload.contractName;

        // Only supports verifying one contract at a time at the moment
        const contractFile = Object.keys(sources)[0];

        const publicExplorerParams = await getPublicExplorerParamsBySlug(explorerSlug);

        await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'pending');

        const compiler = await new Promise((resolve, reject) => {
            solc.loadRemoteVersion(compilerVersion, (err, solc) => {
                if (err)
                    reject(err);
                resolve(solc);
            });
        });

        const inputs = {
            language: 'Solidity',
            sources: sources,
            settings: {
                outputSelection: {
                    '*': { '*': ['abi', 'evm.bytecode.object'] }
                }
            }
        };

        const compiledCode = compiler.compile(JSON.stringify(inputs), { import : function(path) { return imports[path] }});

        if (compiledCode.errors) { 
            for (let error of compiledCode.errors)
                console.log(error.formattedMessage)
        }
        console.log(JSON.parse(compiledCode))
        const compiledRuntimeBytecode = `0x${JSON.parse(compiledCode).contracts[contractFile][contractName].evm.bytecode.object}${constructorArguments ? constructorArguments : ''}`;

        const deploymentTx = await getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress);
        const deployedRuntimeBytecode = deploymentTx.data;

        if (compiledRuntimeBytecode === deployedRuntimeBytecode) {
            console.log('Verification succeeded!');
            await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'success');
        }
        else {
            console.log('Verification failed!');
            console.log(compiledRuntimeBytecode)
            console.log('------')
            console.log(deployedRuntimeBytecode)
            await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'failed');
        }
    } catch(error) {
        console.log(error);
        await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'failed');
    } 
});

exports.startContractVerification = functions.https.onCall(async (data, context) => {
    try {
        if (!data.explorerSlug || !data.contractAddress || !data.compilerVersion || !data.code || !data.contractName) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[startContractVerification] Missing parameter.');
        }

        const topic = pubsub.topic('verify-contract');
        const message = sanitize({
            explorerSlug: data.explorerSlug,
            contractAddress: data.contractAddress,
            compilerVersion: data.compilerVersion,
            constructorArguments: data.constructorArguments,
            code: data.code,
            contractName: data.contractName
        });
        
        const messageBuffer = Buffer.from(JSON.stringify(message), 'utf8');

        const res = await topic.publish(messageBuffer);
        console.log(res);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.processTransaction = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        if (!data.workspace || !data.transaction) {
            console.log(data)
            throw new functions.https.HttpsError('invalid-argument', '[syncTokenBalanceChanges] Missing parameter.');
        }

        const transaction = await getTransaction(context.auth.uid, data.workspace, data.transaction);

        if (transaction) {
            await processTransactions(context.auth.uid, data.workspace, [transaction]);
        }

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncTokenBalanceChanges = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        if (!data.workspace || !data.transaction || !data.tokenBalanceChanges) {
            console.log(data)
            throw new functions.https.HttpsError('invalid-argument', '[syncTokenBalanceChanges] Missing parameter.');
        }

        await storeTokenBalanceChanges(context.auth.uid, data.workspace, data.transaction, data.tokenBalanceChanges);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.resetWorkspace = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    const rootPath = `users/${context.auth.uid}/workspaces/${data.workspace}`;
    const paths = ['accounts', 'blocks', 'contracts', 'transactions', 'stats'].map(collection => `${rootPath}/${collection}`);

    for (var i = 0; i < paths.length; i++) {
        await firebaseTools.firestore.delete(paths[i], {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            token: functions.config().fb.token
        });
    }
    
    await resetDatabaseWorkspace(context.auth.uid, data.workspace);

    return { success: true };
});

exports.syncBlock = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        const block = data.block;
        if (!block)
            throw new functions.https.HttpsError('invalid-argument', '[syncBlock] Missing block parameter.');

        var syncedBlock = stringifyBns(sanitize(block));

        const storedBlock = await storeBlock(context.auth.uid, data.workspace, syncedBlock);

        if (storedBlock && storedBlock.transactions.length === 0) {
            const topic = pubsub.topic('bill-usage');
            const message = sanitize({
                userId: context.auth.uid,
                timestamp: data.block.timestamp
            });
            const messageBuffer = Buffer.from(JSON.stringify(message), 'utf8');
            await topic.publish(messageBuffer);
        }
        
        analytics.track(context.auth.uid, 'Block Sync');
        return { blockNumber: syncedBlock.number }
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncContractArtifact = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.address || !data.artifact) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncContractArtifact] Missing parameter.');
        }

        const canSync = await canUserSyncContract(context.auth.uid, data.workspace);
        const existingContract = await getContractData(context.auth.uid, data.workspace, data.address);

        if (existingContract || canSync)
            await storeContractArtifact(context.auth.uid, data.workspace, data.address, data.artifact);
        else
            throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

        analytics.track(context.auth.uid, 'Contract Artifact Sync');
        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncContractDependencies = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.address || !data.dependencies) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncContractDependencies] Missing parameter.');
        }

        const canSync = await canUserSyncContract(context.auth.uid, data.workspace);
        const existingContract = await getContractData(context.auth.uid, data.workspace, data.address);

        if (existingContract || canSync)
            await storeContractDependencies(context.auth.uid, data.workspace, data.address, data.dependencies);
        else
            throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncTrace = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.txHash || !data.steps) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncTrace] Missing parameter.')
        }

        const trace = [];
        for (const step of data.steps) {
            if (['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'].indexOf(step.op.toUpperCase()) > -1) {
                let contractRef;                
                const canSync = await canUserSyncContract(context.auth.uid, data.workspace);

                if (canSync) {
                    const contractData = sanitize({
                        address: step.address.toLowerCase(),
                        hashedBytecode: step.contractHashedBytecode
                    });

                    await storeContractData(
                        context.auth.uid,
                        data.workspace,
                        step.address,
                        contractData
                    );

                    contractRef = getContractRef(context.auth.uid, data.workspace, step.address);
                }

                trace.push(sanitize({ ...step, contract: contractRef }));
            }
        }

        await storeTrace(context.auth.uid, data.workspace, data.txHash, trace);

        analytics.track(context.auth.uid, 'Trace Sync');
        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncContractData = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.address) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncContractData] Missing parameter.');
        }

        const canSync = await canUserSyncContract(context.auth.uid, data.workspace);
        const existingContract = await getContractData(context.auth.uid, data.workspace, data.address);

        if (existingContract || canSync) {
            await storeContractData(context.auth.uid, data.workspace, data.address, sanitize({ address: data.address, name: data.name, abi: data.abi, watchedPaths: data.watchedPaths }));
        }
        else
            throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncTransaction = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.transaction || !data.block || !data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncTransaction] Missing parameter.');
        }

        const promises = [];
        const transaction = data.transaction;
        const receipt = data.transactionReceipt;

        const sTransactionReceipt = receipt ? stringifyBns(sanitize(receipt)) : null;
        const sTransaction = stringifyBns(sanitize(transaction));

        const txSynced = sanitize({
            ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: data.block.timestamp,
            tokenBalanceChanges: {},
            tokenTransfers: []
        });

        const storedTx = await storeTransaction(context.auth.uid, data.workspace, txSynced);

        if (storedTx) {
            const topic = pubsub.topic('bill-usage');
            const message = sanitize({
                userId: context.auth.uid,
                timestamp: data.block.timestamp
            });
            const messageBuffer = Buffer.from(JSON.stringify(message), 'utf8');
            await topic.publish(messageBuffer);
        }

        if (!txSynced.to && sTransactionReceipt) {
            const canSync = await canUserSyncContract(context.auth.uid, data.workspace);
            if (canSync)
                await storeContractData(context.auth.uid, data.workspace, sTransactionReceipt.contractAddress, {
                    address: sTransactionReceipt.contractAddress,
                    timestamp: data.block.timestamp
                });
        }

        await processTransactions(context.auth.uid, data.workspace, [txSynced]);
       
       return { txHash: txSynced.hash };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.enableAlchemyWebhook = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[enableAlchemyWebhook] Missing parameter.');
        }

        const user = await getUser(context.auth.uid);
        await addIntegration(context.auth.uid, data.workspace, 'alchemy');

        const apiKey = decrypt(user.data().apiKey);

        const token = encode({
            uid: context.auth.uid,
            workspace: data.workspace,
            apiKey: apiKey
        });

       return { token: token };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.enableWorkspaceApi = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[enableWorkspaceApi] Missing parameter.');
        }

        const user = await getUser(context.auth.uid);
        await addIntegration(context.auth.uid, data.workspace, 'api');

        const apiKey = decrypt(user.data().apiKey);

        const token = encode({
            uid: context.auth.uid,
            workspace: data.workspace,
            apiKey: apiKey
        });

       return { token: token };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.getWorkspaceApiToken = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[getWorkspaceApiToken] Missing parameter.');
        }

        const user = await getUser(context.auth.uid);

        const apiKey = decrypt(user.data().apiKey);

        const token = encode({
            uid: context.auth.uid,
            workspace: data.workspace,
            apiKey: apiKey
        });

       return { token: token };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.disableAlchemyWebhook = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[disableAlchemyWebhook] Missing parameter.');
        }

        await removeIntegration(context.auth.uid, data.workspace, 'alchemy');

       return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.disableWorkspaceApi = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[disableWorkspaceApi] Missing parameter.');
        }

        await removeIntegration(context.auth.uid, data.workspace, 'api');

       return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.importContract = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.contractAddress) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[importContract] Missing parameter.');
        }
        const workspace = await getWorkspaceByName(context.auth.uid, data.workspace);
       
        await storeContractData(context.auth.uid, data.workspace, data.contractAddress, {
            address: data.contractAddress,
            imported: true
        });

       analytics.track(context.auth.uid, 'Contract Import');
       return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.setPrivateKey = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.account || !data.privateKey) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[setPrivateKey] Missing parameter.');
        }

        const encryptedPk = encrypt(data.privateKey);

        await storeAccountPrivateKey(context.auth.uid, data.workspace, data.account, encryptedPk)

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
})

exports.getAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.account) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[getAccount] Missing parameter.');
        }

        const account = await getAccount(context.auth.uid, data.workspace, data.account);

        if (!account)
            throw { message: 'Could not find account' };

        const accountWithKey = sanitize({
            address: account.id,
            balance: account.balance,
            privateKey: account.privateKey ? decrypt(account.privateKey) : null
        });

        return accountWithKey;
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.createWorkspace = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspaceData || !data.name) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[createWorkspace] Missing parameter.');
        }

        const filteredWorkspaceData = sanitize({
            chain: data.workspaceData.chain,
            networkId: data.workspaceData.networkId,
            rpcServer: data.workspaceData.rpcServer,
            settings: data.workspaceData.settings
        });

        const isPremium = await isUserPremium(context.auth.uid);
        const workspaces = await getUserWorkspaces(context.auth.uid);

        if (!isPremium && workspaces._size > 0)
            throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to one workspace. Upgrade to our Premium plan to create more.');

        await createWorkspace(context.auth.uid, data.name, filteredWorkspaceData);
        analytics.track(context.auth.uid, 'Workspace Creation');

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.setCurrentWorkspace = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.name) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[setCurrentWorkspace] Missing parameter.');
        }

        await setCurrentWorkspace(context.auth.uid, data.name);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncBalance = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.account || !data.balance) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncBalance] Missing parameter.');
        }

        await updateAccountBalance(context.auth.uid, data.workspace, data.account, data.balance);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.updateWorkspaceSettings = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.settings) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[updateWorkspaceSettings] Missing parameter.');
        }

        const ALLOWED_OPTIONS = ['chain', 'rpcServer'];
        const ALLOWED_ADVANCED_OPTIONS = ['tracing'];
        const ALLOWED_SETTINGS = ['defaultAccount', 'gasLimit', 'gasPrice'];
        const sanitizedParams = {};

        ALLOWED_OPTIONS.forEach((key) => {
            if (!!data.settings[key])
                sanitizedParams[key] = data.settings[key];
        });

        if (data.settings.advancedOptions) {
            ALLOWED_ADVANCED_OPTIONS.forEach((key) => {
                if (!!data.settings.advancedOptions[key]) {
                    if (!sanitizedParams['advancedOptions'])
                        sanitizedParams['advancedOptions'] = {};
                    sanitizedParams.advancedOptions[key] = data.settings.advancedOptions[key];
                }
            });
        }
        
        if (data.settings.settings) {
            ALLOWED_SETTINGS.forEach((key) => {
                if (!!data.settings.settings[key]) {
                    if (!sanitizedParams['settings'])
                        sanitizedParams['settings'] = {};
                    sanitizedParams.settings[key] = data.settings.settings[key];
                }
            });
        }

        if (Object.keys(sanitizedParams).length !== 0) {
            await updateWorkspaceSettings(context.auth.uid, data.workspace, sanitizedParams);
        }

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        const user = (await getUser(context.auth.uid)).data();
        const selectedPlan = functions.config().ethernal.plans[data.plan];

        if (!selectedPlan)
            throw new functions.https.HttpsError('invalid-argument', '[createStripeCheckoutSession] Invalid plan.');

        const rootUrl = functions.config().ethernal.root_url;
        const authUser = await admin.auth().getUser(context.auth.uid)

        const session = await stripe.checkout.sessions.create(sanitize({
            mode: 'subscription',
            client_reference_id: user.uid,
            customer: user.stripeCustomerId,
            customer_email: user.email,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: selectedPlan,
                    quantity: 1
                }
            ],
            success_url: `${rootUrl}/settings?tab=billing&status=upgraded`,
            cancel_url: `${rootUrl}/settings?tab=billing`
        }));

        return { url: session.url };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.createStripePortalSession = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    
    try {
        const user = (await getUser(context.auth.uid)).data();
        const rootUrl = functions.config().ethernal.root_url;
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${rootUrl}/settings?tab=billing`
        });

        return { url: session.url };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.removeContract = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    
    try {
        if (!data.workspace || !data.address) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[removeContract] Missing parameter.');
        }

        const contractPath = `users/${context.auth.uid}/workspaces/${data.workspace}/contracts/${data.address}`;

        await firebaseTools.firestore.delete(contractPath, {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            token: functions.config().fb.token
        });

        await removeDatabaseContractArtifacts(context.auth.uid, data.workspace, data.address);

        analytics.track(context.auth.uid, 'Remove Contract');

        return { success: true };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncTransactionData = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    
    try {
        if (!data.workspace || !data.hash || !data.data) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncTransactionData] Missing parameter.');
        }

        await storeTransactionData(
            context.auth.uid,
            data.workspace,
            data.hash,
            sanitize(data.data)
        );

        return { success: true };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.createUser = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    
    try {
        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        const authUser = await admin.auth().getUser(context.auth.uid);

        const customer = await stripe.customers.create({
            email: authUser.email
        });

        await createUser(context.auth.uid, {
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: 'free'
        });

        analytics.setUser(context.auth.uid, {
            $email: authUser.email,
            $created: (new Date()).toISOString(),
        });
        analytics.setSubscription(context.auth.uid, null, 'free', null, false);
        analytics.track(context.auth.uid, 'Sign Up');

        return { success: true };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.getUnprocessedContracts = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[getUnprocessedContracts] Missing parameter.');
        }

        const contracts = await getUnprocessedContracts(context.auth.uid, data.workspace);

        return { contracts: contracts };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);        
    }
});

exports.setTokenProperties = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.contract) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[setTokenProperties] Missing parameter.');
        }

        const patterns = data.tokenPatterns ? admin.firestore.FieldValue.arrayUnion(...data.tokenPatterns) : [];

        let tokenData = {};
        if (data.tokenProperties)
            tokenData = sanitize({
                symbol: data.tokenProperties.symbol,
                decimals: data.tokenProperties.decimals,
                name: data.tokenProperties.name
            });

        await storeContractData(context.auth.uid, data.workspace, data.contract, { patterns: patterns, processed: true, token: tokenData });

        return { success: true };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);        
    }
});

exports.getProductRoadToken = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!functions.config().product_road || !functions.config().product_road.secret)
            return { token: null };

        const prAuthSecret = functions.config().product_road.secret;

        const data = {
            email: context.auth.token.email,
            name: context.auth.token.email
        };

        const token = jwt.sign(data, prAuthSecret, { algorithm: 'HS256' });

        return { token: token };
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.api = functions.https.onRequest(api);
exports.processContract = functions.firestore.document('users/{userId}/workspaces/{workspaceName}/contracts/{contractName}').onCreate(processContract);
exports.processContractOnUpdate = functions.firestore.document('users/{userId}/workspaces/{workspaceName}/contracts/{contractName}').onUpdate(processContract);
exports.cleanArtifactDependencies = functions.pubsub.schedule('every day 00:00').onRun(cleanArtifactDependencies);