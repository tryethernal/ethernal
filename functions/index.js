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
const cls = require('cls-hooked');

const Storage = require('./lib/storage');
const { sanitize, stringifyBns } = require('./lib/utils');
const { encrypt, decrypt, encode } = require('./lib/crypto');
const { getTokenTransfers } = require('./lib/abi');
const Analytics = require('./lib/analytics');
const processAllUsers = require('./tasks/populatePostgres');

const api = require('./api/index');

const analytics = new Analytics(functions.config().mixpanel ? functions.config().mixpanel.token : null);

let processTransactions, getFunctionSignatureForTransaction, processContract;
let cleanArtifactDependencies;
let transactionsLib;

const { ProviderConnector } = require('./lib/rpc');
const { enqueueTask } = require('./lib/tasks');
const writeLog = require('./lib/writeLog');

const billUsage = async function(message) {
    return await psqlWrapper(async () => {
        try {
            const payload = message.json;

            const userId = payload.userId;
            const timestamp = payload.timestamp;

            const user = await db.getUser(userId);

            if (!user || !user.explorerSubscriptionId) return;

            await stripe.subscriptionItems.createUsageRecord(
                user.explorerSubscriptionId,
                { 
                    quantity: 1,
                    timestamp: timestamp
                }
            )
        } catch(error) {
            console.log(error);
            return error;
        }
    }, message);
};

const processContractVerification = require('./pubsub/processContractVerification');

const publish = async (topicName, data) => {
    const topic = pubsub.topic(topicName);
    const message = sanitize(data);
    const messageBuffer = Buffer.from(JSON.stringify(message), 'utf8');
    return await topic.publish(messageBuffer);
};

let config, sequelize, db, Sequelize, models;

const psqlWrapper = async (cb, data, context) => {
    try {
        models = models || require('./models');
        db = db || require('./lib/firebase')(models);
        transactionsLib = transactionsLib || require('./lib/transactions')(db);

        return await cb(data, context);
    } catch(error) {
        writeLog({
            log: 'postgresLogs',
            functionName: 'index.psqlWrapper',
            message: (error.original && error.original.message) || error,
            detail: error.stack,
        });
    }
};

const pubsub = new PubSub();

exports.billUsage = functions.pubsub.topic('bill-usage').onPublish(billUsage);

// exports.processContractVerification = functions.pubsub.topic('verify-contract').onPublish(processContractVerification);

exports.processAllUsers = functions.https.onCall(processAllUsers);
exports.resyncBlocks = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        if (!data.workspace || !data.fromBlock || !data.toBlock) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[resyncBlocks] Missing parameter.');
        }

        return enqueueTask('batchBlockSyncTask', {
            userId: context.auth.uid,
            workspace: data.workspace,
            fromBlock: data.fromBlock,
            toBlock: data.toBlock
        });
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.batchBlockSyncTask = functions.https.onCall(async (data, context) => {
    try {
        if (!data.userId || !data.workspace || !data.fromBlock || !data.toBlock) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[batchBlockSyncTask] Missing parameter.');
        }

        for (let i = data.fromBlock; i <= data.toBlock; i++) {
            enqueueTask('blockSyncTask', {
                userId: data.userId,
                workspace: data.workspace,
                blockNumber: i
            });
        }
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncFailedTransactionError = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        try {
            if (!data.workspace || !data.transaction || !data.error) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncFailedTransactionError] Missing parameter.');
            }

            await db.storeFailedTransactionError(context.auth.uid, data.workspace, data.transaction, data.error);

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.startContractVerification = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        try {
            if (!data.explorerSlug || !data.contractAddress || !data.compilerVersion || !data.code || !data.contractName) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[startContractVerification] Missing parameter.');
            }

            const publicExplorerParams = await db.getPublicExplorerParamsBySlug(data.explorerSlug);

            if (!publicExplorerParams)
                throw new Error('Could not find explorer, make sure you passed the correct slug.')

            const contract = await db.getContractData(publicExplorerParams.userId, publicExplorerParams.workspace, data.contractAddress);

            if (!contract)
                throw new Error(`Couldn't find contract at address ${data.contractAddress}. Make sure the address is correct and the sync is on.`);

            if (contract.verificationStatus == 'success')
                throw new Error('Contract has already been verified.');
            if (contract.verificationStatus == 'pending')
                throw new Error('There already is an ongoing verification for this contract.');

            const topic = pubsub.topic('verify-contract');
            const message = sanitize({
                publicExplorerParams: publicExplorerParams,
                contractAddress: data.contractAddress,
                compilerVersion: data.compilerVersion,
                constructorArguments: data.constructorArguments,
                code: data.code,
                contractName: data.contractName
            });

            const messageBuffer = Buffer.from(JSON.stringify(message), 'utf8');

            const res = await topic.publish(messageBuffer);

            return { success: true, contractPath: `users/${publicExplorerParams.userId}/workspaces/${publicExplorerParams.workspace}/contracts/${data.contractAddress.toLowerCase()}` };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.processTransaction = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
        try {
            if (!data.workspace || !data.transaction) {
                console.log(data)
                throw new functions.https.HttpsError('invalid-argument', '[syncTokenBalanceChanges] Missing parameter.');
            }

            const transaction = await db.getTransaction(context.auth.uid, data.workspace, data.transaction);

            if (transaction)
                await transactionsLib.processTransactions(context.auth.uid, data.workspace, [transaction]);

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncTokenBalanceChanges = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
        try {
            if (!data.workspace || !data.transaction || !data.tokenBalanceChanges) {
                console.log(data)
                throw new functions.https.HttpsError('invalid-argument', '[syncTokenBalanceChanges] Missing parameter.');
            }

            writeLog({
                log: 'postgresLogs',
                functionName: 'index.syncTokenBalanceChanges',
                detail: data,
            });

            await db.storeTokenBalanceChanges(context.auth.uid, data.workspace, data.transaction, data.tokenBalanceChanges);

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.resetWorkspace = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
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

        // await db.resetWorkspace(context.auth.uid, data.workspace);
        await db.resetDatabaseWorkspace(context.auth.uid, data.workspace);

        return { success: true };
    }, data, context);
});

exports.syncBlock = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        try {
            if (!context.auth)
                throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

            const block = data.block;
            if (!block)
                throw new functions.https.HttpsError('invalid-argument', '[syncBlock] Missing block parameter.');

            var syncedBlock = stringifyBns(sanitize(block));

            const storedBlock = await db.storeBlock(context.auth.uid, data.workspace, syncedBlock);

            if (storedBlock && block.transactions.length === 0) {
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
    }, data, context);
});

exports.transactionSyncTask = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        try {
            if (!data.userId || !data.workspace || !data.transaction) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[transactionSyncTask] Missing parameter.');
            }

            const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
            const providerConnector = new ProviderConnector(workspace.rpcServer);

            const receipt = await providerConnector.fetchTransactionReceipt(data.transaction.hash);
            const promises = [];

            const sTransactionReceipt = receipt ? sanitize(stringifyBns(receipt)) : null;

            const txSynced = sanitize({
                ...data.transaction,
                receipt: sTransactionReceipt,
                error: '',
                timestamp: data.timestamp,
                tokenBalanceChanges: {},
                tokenTransfers: []
            });

            const storedTx = await db.storeTransaction(data.userId, data.workspace, txSynced);

            if (storedTx)
                await publish('bill-usage', { userId: data.userId, timestamp: data.timestamp });

            if (!txSynced.to && sTransactionReceipt) {
                const canSync = await db.canUserSyncContract(data.userId, data.workspace);
                if (canSync)
                    await db.storeContractData(data.userId, data.workspace, sTransactionReceipt.contractAddress, {
                        address: sTransactionReceipt.contractAddress,
                        timestamp: data.timestamp
                    });
            }

            return transactionsLib.processTransactions(data.userId, data.workspace, [txSynced]);
        } catch(error) {
            console.log(error);
        }
    }, data, context);
});

exports.blockSyncTask = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        try {
            if (!data.userId || !data.workspace || !data.blockNumber) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[blockSyncTask] Missing parameter.');
            }

            const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
            const providerConnector = new ProviderConnector(workspace.rpcServer);

            const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

            if (!block)
                throw `Couldn't find block #${data.blockNumber}`;

            const syncedBlock = sanitize(stringifyBns({ ...block, transactions: block.transactions.map(tx => stringifyBns(tx)) }));
            const storedBlock = await db.storeBlock(data.userId, data.workspace, syncedBlock);

            if (storedBlock && block.transactions.length === 0)
                return publish('bill-usage', { userId: data.userId, timestamp: block.timestamp });
            
            const url = `${functions.config().ethernal.root_functions}/transactionSyncTask`;
            for (let i = 0; i < block.transactions.length; i++) {
                await enqueueTask('transaction-sync', {
                    userId: data.userId,
                    workspace: data.workspace,
                    transaction: stringifyBns(block.transactions[i]),
                    timestamp: block.timestamp
                }, url);
            }
        } catch(error) {
            console.log(error);
        }
    }, data, context);
});

exports.serverSideBlockSync = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.blockNumber || !data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[serverSideBlockSync] Missing parameter.');
        }

        const url = `${functions.config().ethernal.root_functions}/blockSyncTask`;

        await enqueueTask('block-sync', {
            userId: context.auth.uid,
            workspace: data.workspace,
            blockNumber: data.blockNumber
        }, url);

        return enqueueTask('blockSyncTask', {
            userId: context.auth.uid,
            workspace: data.workspace,
            blockNumber: data.blockNumber
        });
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.syncContractArtifact = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.address || !data.artifact) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncContractArtifact] Missing parameter.');
            }

            const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace);
            const existingContract = await db.getContractData(context.auth.uid, data.workspace, data.address);

            if (existingContract || canSync)
                await db.storeContractArtifact(context.auth.uid, data.workspace, data.address, data.artifact);
            else
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

            analytics.track(context.auth.uid, 'Contract Artifact Sync');
            return { address: data.address };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncContractDependencies = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.address || !data.dependencies) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncContractDependencies] Missing parameter.');
            }

            const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace);
            const existingContract = await db.getContractData(context.auth.uid, data.workspace, data.address);

            if (existingContract || canSync)
                await db.storeContractDependencies(context.auth.uid, data.workspace, data.address, data.dependencies);
            else
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

            return { address: data.address };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncTrace = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
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
                    const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace);

                    if (canSync) {
                        const contractData = sanitize({
                            address: step.address.toLowerCase(),
                            hashedBytecode: step.contractHashedBytecode
                        });

                        await db.storeContractData(
                            context.auth.uid,
                            data.workspace,
                            step.address,
                            contractData
                        );

                        contractRef = db.getContractRef(context.auth.uid, data.workspace, step.address);
                    }

                    trace.push(sanitize({ ...step, contract: contractRef }));
                }
            }

            await db.storeTrace(context.auth.uid, data.workspace, data.txHash, trace);

            analytics.track(context.auth.uid, 'Trace Sync');
            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncContractData = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.address) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncContractData] Missing parameter.');
            }

            const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace);
            const existingContract = await db.getContractData(context.auth.uid, data.workspace, data.address);

            if (existingContract || canSync) {
                await db.storeContractData(context.auth.uid, data.workspace, data.address, sanitize({ address: data.address, name: data.name, abi: data.abi, watchedPaths: data.watchedPaths }));
            }
            else
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

            return { address: data.address };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncTransaction = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
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
                error: '',
                timestamp: data.block.timestamp,
                tokenBalanceChanges: {},
                tokenTransfers: []
            });

            const storedTx = await db.storeTransaction(context.auth.uid, data.workspace, txSynced);

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
                const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace);

                if (canSync)
                    await db.storeContractData(context.auth.uid, data.workspace, sTransactionReceipt.contractAddress, {
                        address: sTransactionReceipt.contractAddress,
                        timestamp: data.block.timestamp
                    });
            }

            await transactionsLib.processTransactions(context.auth.uid, data.workspace, [txSynced]);
           
           return { txHash: txSynced.hash };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.enableAlchemyWebhook = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[enableAlchemyWebhook] Missing parameter.');
            }

            const user = await db.getUser(context.auth.uid);
            await db.addIntegration(context.auth.uid, data.workspace, 'alchemy');

            const apiKey = decrypt(user.apiKey);

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
    }, data, context);
});

exports.enableWorkspaceApi = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[enableWorkspaceApi] Missing parameter.');
            }

            const user = await db.getUser(context.auth.uid);

            await db.addIntegration(context.auth.uid, data.workspace, 'api');

            const apiKey = decrypt(user.apiKey);

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
    }, data, context);
});

exports.getWorkspaceApiToken = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[getWorkspaceApiToken] Missing parameter.');
            }

            const user = await db.getUser(context.auth.uid);

            const apiKey = decrypt(user.apiKey);

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
    }, data, context);
});

exports.disableAlchemyWebhook = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[disableAlchemyWebhook] Missing parameter.');
            }

            await db.removeIntegration(context.auth.uid, data.workspace, 'alchemy');

           return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.disableWorkspaceApi = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[disableWorkspaceApi] Missing parameter.');
            }

            await db.removeIntegration(context.auth.uid, data.workspace, 'api');

           return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.importContract = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.contractAddress) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[importContract] Missing parameter.');
            }
            const workspace = await db.getWorkspaceByName(context.auth.uid, data.workspace);
           
            await db.storeContractData(context.auth.uid, data.workspace, data.contractAddress, {
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
    }, data, context);
});

exports.setPrivateKey = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.account || !data.privateKey) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[setPrivateKey] Missing parameter.');
            }

            const encryptedPk = encrypt(data.privateKey);

            await db.storeAccountPrivateKey(context.auth.uid, data.workspace, data.account, encryptedPk)

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
})

exports.getAccount = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.account) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[getAccount] Missing parameter.');
            }

            const account = await db.getAccount(context.auth.uid, data.workspace, data.account);

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
    }, data, context);
});


exports.createWorkspace = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspaceData || !data.name) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[createWorkspace] Missing parameter.');
            }

            const user = await db.getUser(context.auth.uid);
            // if (!user.canCreateWorkspace)
            //     throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to one workspace. Upgrade to our Premium plan to create more.');

            const filteredWorkspaceData = stringifyBns(sanitize({
                chain: data.workspaceData.chain,
                networkId: data.workspaceData.networkId,
                rpcServer: data.workspaceData.rpcServer,
                settings: data.workspaceData.settings
            }));

            await db.createWorkspace(context.auth.uid, data.name, filteredWorkspaceData);

            analytics.track(context.auth.uid, 'Workspace Creation');

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.setCurrentWorkspace = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.name) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[setCurrentWorkspace] Missing parameter.');
            }

            await db.setCurrentWorkspace(context.auth.uid, data.name);

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.syncBalance = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace || !data.account || !data.balance) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncBalance] Missing parameter.');
            }

            await db.updateAccountBalance(context.auth.uid, data.workspace, data.account, data.balance);

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.updateWorkspaceSettings = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
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
                await db.updateWorkspaceSettings(context.auth.uid, data.workspace, sanitizedParams);
            }

            return { success: true };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            const user = await db.getUser(context.auth.uid);
            const selectedPlan = functions.config().ethernal.plans[data.plan];

            if (!selectedPlan)
                throw new functions.https.HttpsError('invalid-argument', '[createStripeCheckoutSession] Invalid plan.');

            const rootUrl = functions.config().ethernal.root_url;
            const authUser = await admin.auth().getUser(context.auth.uid)

            const session = await stripe.checkout.sessions.create(sanitize({
                mode: 'subscription',
                client_reference_id: user.uid,
                customer: user.stripeCustomerId,
                // customer_email: user.email,
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
    }, data, context);
});

exports.createStripePortalSession = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
        
        try {
            const user = await db.getUser(context.auth.uid);
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
    }, data, context);
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

            // try {
            //     const user = await User.findByAuthIdWithWorkspace(context.auth.uid, data.workspace);
            //     await user.workspaces[0].removeContractByAddress(data.address);
            // } catch(error) {
            //     writeLog({
            //         log: 'postgresLogs',
            //         functionName: 'index.removeContract',
            //         message: (error.original && error.original.message) || error,
            //         detail: error.original && error.original.detail,
            //     });
            // }

            // await removeDatabaseContractArtifacts(context.auth.uid, data.workspace, data.address);

            analytics.track(context.auth.uid, 'Remove Contract');

            return { success: true };
        } catch(error) {
            console.log(error)
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
});

exports.syncTransactionData = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
        
        try {
            if (!data.workspace || !data.hash || !data.data) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncTransactionData] Missing parameter.');
            }

            await db.storeTransactionData(
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
    }, data, context);
});

exports.createUser = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
        
        try {
            const apiKey = uuidAPIKey.create().apiKey;
            const encryptedKey = encrypt(apiKey);

            const authUser = await admin.auth().getUser(context.auth.uid);

            const customer = await stripe.customers.create({
                email: authUser.email
            });

            await db.createUser(context.auth.uid, {
                email: authUser.email,
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
    }, data, context);
});

exports.getUnprocessedContracts = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
        if (!context.auth)
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            if (!data.workspace) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[getUnprocessedContracts] Missing parameter.');
            }

            const contracts = await db.getUnprocessedContracts(context.auth.uid, data.workspace);

            return { contracts: contracts };
        } catch(error) {
            console.log(error)
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);        
        }
    }, data, context);
});

exports.setTokenProperties = functions.https.onCall(async (data, context) => {
    return await psqlWrapper(async () => {
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

            await db.storeContractData(context.auth.uid, data.workspace, data.contract, { patterns: patterns, processed: true, token: tokenData });

            return { success: true };
        } catch(error) {
            console.log(error)
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);        
        }
    }, data, context);
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

exports.processContract = functions.firestore.document('users/{userId}/workspaces/{workspaceName}/contracts/{contractName}').onCreate(async (snap, context) => {
    return await psqlWrapper(() => {
        processContract = processContract || require('./triggers/contracts')(db);
        return processContract(snap, context);
    });
});

exports.processContractOnUpdate = functions.firestore.document('users/{userId}/workspaces/{workspaceName}/contracts/{contractName}').onUpdate(async (snap, context) => {
    return await psqlWrapper(() => {
        processContract = processContract || require('./triggers/contracts')(db);
        return processContract(snap, context);
    });
});

exports.cleanArtifactDependencies = functions.pubsub.schedule('every day 00:00').onRun(async (context) => {
    return await psqlWrapper(() => {
        cleanArtifactDependencies = cleanArtifactDependencies || require('./schedulers/cleaner')(db);
        return cleanArtifactDependencies(context);
    });
});
