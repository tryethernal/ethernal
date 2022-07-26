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
        throw new functions.https.HttpsError(error.code || 'unknown', error.message);
    }
};

const pubsub = new PubSub();

exports.billUsage = functions.pubsub.topic('bill-usage').onPublish(billUsage);

exports.processAllUsers = functions.https.onCall(processAllUsers);
exports.resyncBlocks = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        if (!data.workspace || !data.fromBlock || !data.toBlock) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[resyncBlocks] Missing parameter.');
        }

        return enqueueTask('cloudFunctionBatchBlockSync', {
            userId: context.auth.uid,
            workspace: data.workspace,
            fromBlock: data.fromBlock,
            toBlock: data.toBlock
        }, `${functions.config().ethernal.root_functions}/batchBlockSyncTask`);

    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError(error.code || 'unknown', reason);
    }
});

exports.batchBlockSyncTask = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    try {
        const CONCURRENT_BATCHS = 1000;
        if (!data.userId || !data.workspace || !data.fromBlock || !data.toBlock) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[batchBlockSyncTask] Missing parameter.');
        }
        let start = data.fromBlock;
        let end = data.toBlock;
        if (end - start >= CONCURRENT_BATCHS) {
            end = start + CONCURRENT_BATCHS;
            enqueueTask('cloudFunctionBatchBlockSync', {
                userId: data.userId,
                workspace: data.workspace,
                fromBlock: end,
                toBlock: data.toBlock
            }, `${functions.config().ethernal.root_functions}/batchBlockSyncTask`)
        }

        for (let i = start; i < end; i++) {
            const promises = [];
            promises.push(enqueueTask('cloudRunBlockSync', {
                userId: data.userId,
                workspace: data.workspace,
                blockNumber: i,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/tasks/blockSync`));

            promises.push(enqueueTask('cloudFunctionBlockSync', {
                userId: data.userId,
                workspace: data.workspace,
                blockNumber: i
            }, `${functions.config().ethernal.root_functions}/blockSyncTask`));
            await Promise.all(promises);
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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                error: data.error,
                secret: functions.config().ethernal.auth_secret
            } ,`${functions.config().ethernal.root_tasks}/api/transactions/${data.transaction}/error`);

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

            const contract = await db.getContract(publicExplorerParams.userId, publicExplorerParams.workspace, data.contractAddress);

            if (contract) {
                if (contract.verificationStatus == 'success')
                    throw new Error('Contract has already been verified.');
                if (contract.verificationStatus == 'pending')
                    throw new Error('There already is an ongoing verification for this contract.');
            }
            else
                throw new Error(`Couldn't find contract at address ${data.contractAddress}`);

            const payload = sanitize({
                publicExplorerParams: publicExplorerParams,
                contractAddress: data.contractAddress,
                compilerVersion: data.compilerVersion,
                constructorArguments: data.constructorArguments,
                code: data.code,
                contractName: data.contractName,
                secret: functions.config().ethernal.auth_secret
            });

            const url = `${functions.config().ethernal.root_tasks}/api/contracts/${data.contractAddress}/verify`;
            const task = await enqueueTask('contractVerification', payload, url);
            const splitName = task.name.split('/');

            return { success: true, taskId: splitName[splitName.length - 1] };
        } catch(error) {
            console.log(error);
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
});

exports.getContractVerificationStatus = functions.https.onCall(async (data, context)=> {
    return await psqlWrapper(async () => {
        try {
            if (!data.explorerSlug || !data.address) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[getContractVerificationStatus] Missing parameters');
            }
            const publicExplorerParams = await db.getPublicExplorerParamsBySlug(data.explorerSlug);
            const contract = await db.getContract(publicExplorerParams.userId, publicExplorerParams.workspace, data.address);
            console.log(contract)
            if (contract.verificationStatus == 'success') {
                await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, data.address, 'success');
                await db.updateContractAbi(publicExplorerParams.userId, publicExplorerParams.workspace, data.address, { abi: contract.abi });
            }

            return { status: contract.verificationStatus };
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
                throw new functions.https.HttpsError('invalid-argument', '[processTransaction] Missing parameter.');
            }

            const transaction = await db.getTransaction(context.auth.uid, data.workspace, data.transaction);

            if (transaction)
                await transactionsLib.processTransactions(context.auth.uid, data.workspace, [transaction]);

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/transactions/${data.transaction}/process`);

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

            await db.storeTokenBalanceChanges(context.auth.uid, data.workspace, data.transaction, data.tokenBalanceChanges);

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                tokenBalanceChanges: data.tokenBalanceChanges,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/transactions/${data.transaction}/tokenBalanceChanges`);

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

        await db.resetDatabaseWorkspace(context.auth.uid, data.workspace);

        await enqueueTask('migration', {
            uid: context.auth.uid,
            workspace: data.workspace,
            secret: functions.config().ethernal.auth_secret
        }, `${functions.config().ethernal.root_tasks}/api/workspaces/reset`);

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

            await enqueueTask('migration', {
                block: data.block,
                workspace: data.workspace,
                uid: context.auth.uid,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/blocks`);

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
                const canSync = await db.canUserSyncContract(data.userId, data.workspace, sTransactionReceipt.contractAddress);
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
            if (!data.userId || !data.workspace || (!data.blockNumber && data.blockNumber !== 0)) {
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
            
            for (let i = 0; i < block.transactions.length; i++) {
                await enqueueTask('cloudFunctionTransactionSync', {
                    userId: data.userId,
                    workspace: data.workspace,
                    transaction: stringifyBns(block.transactions[i]),
                    timestamp: block.timestamp
                }, `${functions.config().ethernal.root_functions}/transactionSyncTask`);
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
        if ((!data.blockNumber && data.blockNumber !== 0) || !data.workspace) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[serverSideBlockSync] Missing parameter.');
        }
        const secret = functions.config().ethernal.auth_secret;
        await enqueueTask('cloudRunBlockSync', {
            userId: context.auth.uid,
            workspace: data.workspace,
            blockNumber: data.blockNumber,
            secret: secret
        }, `${functions.config().ethernal.root_tasks}/tasks/blockSync`);

        return enqueueTask('cloudFunctionBlockSync', {
            userId: context.auth.uid,
            workspace: data.workspace,
            blockNumber: data.blockNumber
        }, `${functions.config().ethernal.root_functions}/blockSyncTask`);
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

            const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace, data.address);

            if (canSync)
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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                steps: data.steps,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/transactions/${data.txHash}/trace`);

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
        if (!context.auth && (!data.secret || data.secret != functions.config().ethernal.auth_secret))
            throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

        try {
            const uid = (context.auth && context.auth.uid) || data.userId;
            if (!data.workspace || !data.address) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[syncContractData] Missing parameter.');
            }

            const canSync = await db.canUserSyncContract(uid, data.workspace);
            const existingContract = await db.getContractData(uid, data.workspace, data.address);

            if (existingContract || canSync) {
                await db.storeContractData(uid, data.workspace, data.address, sanitize({ verificationStatus: data.verificationStatus, address: data.address, name: data.name, abi: data.abi, watchedPaths: data.watchedPaths }));
            }
            else
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

            await enqueueTask('migration', {
                uid: uid,
                workspace: data.workspace,
                address: data.address,
                name: data.name,
                abi: data.abi,
                watchedPaths: data.watchedPaths,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/contracts/${data.address}`);

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                block: data.block,
                transaction: data.transaction,
                transactionReceipt: data.transactionReceipt,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/transactions`);

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/workspaces/enableAlchemy`);

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
            
            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/workspaces/enableApi`);

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/workspaces/disableAlchemy`);

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/workspaces/disableApi`);

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
           
            const canSync = await db.canUserSyncContract(context.auth.uid, data.workspace, data.contractAddress);

            if (canSync)
                await db.storeContractData(context.auth.uid, data.workspace, data.contractAddress, {
                    address: data.contractAddress,
                    imported: true
                });
            else
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                imported: true,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/contracts/${data.contractAddress}`);

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                privateKey: data.privateKey,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/accounts/${data.account}/privateKey`);

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
                privateKey: account.privateKey ? decrypt(account.privateKey).slice(0, 64) : null
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

            if (user.plan != 'premium' && user.workspaces.length >= 1)
                throw new functions.https.HttpsError('permission-denied', 'Free plan users are limited to one workspace. Upgrade to our Premium plan to create more.');

            const filteredWorkspaceData = stringifyBns(sanitize({
                chain: data.workspaceData.chain,
                networkId: data.workspaceData.networkId,
                rpcServer: data.workspaceData.rpcServer,
                settings: data.workspaceData.settings
            }));

            await db.createWorkspace(context.auth.uid, data.name, filteredWorkspaceData);

            const response = await axios.post(`${functions.config().ethernal.root_tasks}/api/workspaces`, {
                uid: context.auth.uid,
                secret: functions.config().ethernal.auth_secret,
                data: {
                    uid: context.auth.uid,
                    name: data.name,
                    workspaceData: data.workspaceData,
                    secret: functions.config().ethernal.auth_secret
                }
            });

            await db.setCurrentWorkspace(context.auth.uid, data.name);
            await axios.post(`${functions.config().ethernal.root_tasks}/api/workspaces/setCurrent`, {
                data: {
                    uid: context.auth.uid,
                    workspace: data.name,
                    secret: functions.config().ethernal.auth_secret
                }
            });

            analytics.track(context.auth.uid, 'Workspace Creation');

            return { success: true, workspace: response.data };
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
            await axios.post(`${functions.config().ethernal.root_tasks}/api/workspaces/setCurrent`, {
                data: {
                    uid: context.auth.uid,
                    workspace: data.name,
                    secret: functions.config().ethernal.auth_secret
                }
            });

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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                balance: data.balance,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/accounts/${data.account}/syncBalance`);

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
                await axios.post(`${functions.config().ethernal.root_tasks}/api/workspaces/settings`, {
                    data: {
                        uid: context.auth.uid,
                        workspace: data.workspace,
                        settings: sanitizedParams,
                        secret: functions.config().ethernal.auth_secret
                    }
                });
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
    return await psqlWrapper(async () => {
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

            await db.removeDatabaseContractArtifacts(context.auth.uid, data.workspace, data.address);

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/contracts/${data.address}/remove`);

            analytics.track(context.auth.uid, 'Remove Contract');

            return { success: true };
        } catch(error) {
            console.log(error)
            var reason = error.reason || error.message || 'Server error. Please retry.';
            throw new functions.https.HttpsError(error.code || 'unknown', reason);
        }
    }, data, context);
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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                data: sanitize(data.data),
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/transactions/${data.hash}/storage`);

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

            await axios.post(`${functions.config().ethernal.root_tasks}/api/users`, {
                data: {
                    uid: context.auth.uid,
                    data: {
                        email: authUser.email,
                        apiKey: encryptedKey,
                        stripeCustomerId: customer.id,
                        plan: 'free'
                    }
                }
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

            await enqueueTask('migration', {
                uid: context.auth.uid,
                workspace: data.workspace,
                contract: data.contract,
                tokenPatterns: data.tokenPatterns,
                tokenProperties: data.tokenProperties,
                secret: functions.config().ethernal.auth_secret
            }, `${functions.config().ethernal.root_tasks}/api/contracts/${data.contract}/tokenProperties`);

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
