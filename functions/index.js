const functions = require('firebase-functions');
const ethers = require('ethers');
const Web3 = require('web3');
const axios = require('axios');
const Decoder = require('@truffle/decoder');
const firebaseTools = require('firebase-tools');

const Storage = require('./lib/storage');
const { sanitize, stringifyBns, getFunctionSignatureForTransaction } = require('./lib/utils');
const { parseTrace } = require('./lib/utils');
const { encrypt, decrypt, encode } = require('./lib/crypto');
const { generateKeyForNewUser } = require('./triggers/users');
const { matchWithContract } = require('./triggers/contracts');

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
    Firebase
} = require('./lib/firebase');

if (process.env.NODE_ENV == 'development') {
    _functions.useFunctionsEmulator('http://localhost:5001');
}

const ETHERSCAN_API_KEY = functions.config().etherscan.token;
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api?module=contract&action=getsourcecode';

var _getDependenciesArtifact = function(contract) {
    return contract.dependencies ? Object.entries(contract.dependencies).map(dep => JSON.parse(dep[1].artifact)) : [];
}

var _buildStructure = async function(contract, rpcServer) {
    var web3 = new Web3(_getWeb3Provider(rpcServer));
    var parsedArtifact = JSON.parse(contract.artifact);
    var contractAddress = contract.address;
    var dependenciesArtifacts = _getDependenciesArtifact(contract);
    var instanceDecoder = await Decoder.forArtifactAt(parsedArtifact, web3, contractAddress, dependenciesArtifacts);
    var storage = new Storage(instanceDecoder);
    await storage.buildStructure();
    return storage;
};

var _getProvider = function(url) {
    const rpcServer = new URL(url);
    var urlInfo;
    var provider = ethers.providers.WebSocketProvider;
    
    if (rpcServer.username != '' && rpcServer.password != '') {
        urlInfo = {
            url: `${rpcServer.origin}${rpcServer.pathName ? rpcServer.pathName : ''}`,
            user: rpcServer.username,
            password: rpcServer.password
        };
    }
    else {
        urlInfo = rpcServer.href;
    }

    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = ethers.providers.JsonRpcProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = ethers.providers.WebSocketProvider;
    }

    return new provider(urlInfo);
};

var _getWeb3Provider = function(url) {
    const rpcServer = new URL(url);
    var provider;
    if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
        provider = Web3.providers.HttpProvider;
    }
    else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
        provider = Web3.providers.WebsocketProvider;
    }

    return new provider(url);
};

var _traceTransaction = async function(rpcServer, hash) {
    try {
        const rpcProvider = new _getProvider(rpcServer);
        const transaction = await rpcProvider.getTransaction(hash);
        const trace = await rpcProvider.send('debug_traceTransaction', [hash, {}]).catch(() => null);

        if (trace)
            return await parseTrace(transaction.to, trace, rpcProvider);
        else
            return null;
    } catch(error) {
        console.log(error);
        const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
        throw { reason: reason };
    }
};

exports.callContractReadMethod = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var provider = _getProvider(data.rpcServer);
        var signer;
        var options = sanitize({
            gasLimit: data.options.gasLimit,
            gasPrice: data.options.gasPrice,
        });

        if (data.options.pkey) {
            signer = new ethers.Wallet(data.options.pkey, provider);
        }
        else {
            signer = provider.getSigner(data.options.from);
        }
        var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);
        return (await contract.functions[data.method](...Object.values(data.params), options));
    } catch(error) {
        console.log(error);
        const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
        throw { reason: reason };
    }
});

exports.callContractWriteMethod = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var provider = _getProvider(data.rpcServer);
        var signer;
        var options = sanitize({
            gasLimit: data.options.gasLimit,
            gasPrice: data.options.gasPrice,
            value: data.options.value,
        });

        if (data.options.privateKey) {
            signer = new ethers.Wallet(data.options.privateKey, provider);
        }
        else {
            signer = provider.getSigner(data.options.from);
        }
        var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);

        const pendingTx = await contract[data.method](...Object.values(data.params), options);

        let trace = null;
        if (data.shouldTrace)
            trace = await _traceTransaction(data.rpcServer, pendingTx.hash);

        return sanitize({
            pendingTx: pendingTx,
            trace: trace
        });
    } catch(error) {
        console.log(error);
        const reason = error.body ? JSON.parse(error.body).error.message : error.reason || error.message || "Can't connect to the server";
        if (reason == 'invalid hexlify value')
            throw { reason: `Invalid private key format for ${data.options.from}. Please correct it in the "Accounts" page` };
        else
            throw { reason: reason };
    }
});

exports.getStructure = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var structure = await _buildStructure(data.contract, data.rpcServer);
        await structure.watch(data.contract.watchedPaths);
        return structure.toJSON();
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.decodeData = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var structure = await _buildStructure(data.contract, data.rpcServer);
        await structure.watch(data.contract.watchedPaths);
        var decoded = await structure.decodeData(data.blockNumber);
        return decoded;
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.getAccounts = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        const rpcProvider = new _getProvider(data.rpcServer);

        var accounts = await rpcProvider.listAccounts();

        return accounts.map(acc => acc.toLowerCase());
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.getAccountBalance = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        const rpcProvider = new _getProvider(data.rpcServer);

        var balance = await rpcProvider.getBalance(data.account);
        return balance;
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.initRpcServer = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        rpcProvider = new _getProvider(data.rpcServer);
        const web3Rpc = new Web3(_getWeb3Provider(data.rpcServer));
        var networkId = await web3Rpc.eth.net.getId();
        var latestBlockNumber = await rpcProvider.getBlockNumber();
        var latestBlock = await rpcProvider.getBlock(latestBlockNumber);
        var accounts = await rpcProvider.listAccounts();
        var gasLimit = latestBlock.gasLimit.toString();
        
        var workspace = {
            rpcServer: data.rpcServer,
            networkId: networkId,
            settings: {
                gasLimit: gasLimit
            }
        };

        if (accounts.length)
            workspace.settings.defaultAccount = accounts[0];

        return workspace;
    } catch(error) {
        console.log(error)
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.resetWorkspace = functions.runWith({ timeoutSeconds: 540, memory: '2GB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    const rootPath = `users/${context.auth.uid}/workspaces/${data.workspace}`;
    const paths = ['accounts', 'blocks', 'contracts', 'transactions'].map(collection => `${rootPath}/${collection}`);

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

        await storeBlock(context.auth.uid, data.workspace, syncedBlock);
        
        return { blockNumber: syncedBlock.number }
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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

        await storeContractArtifact(context.auth.uid, data.workspace, data.address, data.artifact);

        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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

        await storeContractDependencies(context.auth.uid, data.workspace, data.address, data.dependencies);

        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.syncTrace = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.workspace || !data.txHash || !data.steps) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[syncTrace] Missing parameter.')
        }

        const trace = [];
        for (const step of data.steps) {
            if (step.op.toUpperCase().indexOf(['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'])) {
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

                const contractRef = getContractRef(context.auth.uid, data.workspace, step.address);
                trace.push(sanitize({ ...step, contract: contractRef }));
            }
        }

        await storeTrace(context.auth.uid, data.workspace, data.txHash, trace);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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

        await storeContractData(context.auth.uid, data.workspace, data.address, sanitize({ address: data.address, name: data.name, abi: data.abi }));

        return { address: data.address };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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

        let contractAbi = null;

        if (sTransactionReceipt && transaction.to && transaction.data != '0x') {
            const contractData = await getContractData(context.auth.uid, data.workspace, transaction.to);
            contractAbi = contractData ? contractData.abi : null
        }

        const txSynced = sanitize({
            ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: data.block.timestamp,
            functionSignature: contractAbi ? getFunctionSignatureForTransaction(transaction, contractAbi) : null
        });
    
        promises.push(storeTransaction(context.auth.uid, data.workspace, txSynced));

        if (!txSynced.to && sTransactionReceipt)
            promises.push(storeContractData(context.auth.uid, data.workspace, sTransactionReceipt.contractAddress, { address: sTransactionReceipt.contractAddress }));

        await Promise.all(promises);
       
       return { txHash: txSynced.hash };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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

        const endpoint = `${ETHERSCAN_API_URL}&address=${data.contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
        const response = await axios.get(endpoint);

        if (response.data.message == 'NOTOK') {
            throw { message: response.data.result };
        }

        if (response.data.result[0].ContractName == '') {
            throw { message: `Couldn't find contract on Etherscan, make sure the address is correct and that the contract has been verified.` };
        }

        await storeContractData(context.auth.uid, data.workspace, data.contractAddress, {
            abi: JSON.parse(response.data.result[0].ABI),
            address: data.contractAddress,
            name: response.data.result[0].ContractName,
            imported: true
        });

       return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.impersonateAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');

    try {
        if (!data.accountAddress || !data.rpcServer) {
            console.log(data);
            throw new functions.https.HttpsError('invalid-argument', '[impersonateAccount] Missing parameter.');
        }

        const rpcProvider = new _getProvider(data.rpcServer)
        const hardhatResult = await rpcProvider.send('hardhat_impersonateAccount', [data.accountAddress]).catch(console.log);

        if (hardhatResult) {
            return true;
        }

        const ganacheResult = await rpcProvider.send('evm_unlockUnknownAccount', [data.accountAddress]).catch(console.log);
        return ganacheResult;
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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

        await createWorkspace(context.auth.uid, data.name, data.workspaceData);

        return { success: true };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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
        throw new functions.https.HttpsError('unknown', reason);
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

        const ALLOWED_ADVANCED_OPTIONS = ['tracing'];
        const ALLOWED_SETTINGS = ['defaultAccount', 'gasLimit', 'gasPrice'];
        const sanitizedParams = {};

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
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.api = functions.https.onRequest(api);
exports.generateKeyForNewUser = functions.firestore.document('users/{userId}').onCreate(generateKeyForNewUser);
exports.matchWithContract = functions.firestore.document('users/{userId}/workspaces/{workspaceName}/contracts/{contractName}').onCreate(matchWithContract);
