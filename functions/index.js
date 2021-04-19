const functions = require("firebase-functions");
const ethers = require('ethers');
const Web3 = require('web3');
const Decoder = require("@truffle/decoder");
const firebaseTools = require('firebase-tools');

const Storage = require('./lib/storage');
const { sanitize, stringifyBns, getFunctionSignature } = require('./lib/utils');

const { storeBlock, storeTransaction, storeContractData, storeContractArtifact } = require('./lib/firebase');

if (process.env.NODE_ENV == 'development') {
    _functions.useFunctionsEmulator('http://localhost:5001');
}

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
}

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
}

exports.callContractReadMethod = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var provider = _getProvider(data.rpcServer);
        var signer;
        var options = {
            gasLimit: data.options.gasLimit,
            gasPrice: data.options.gasPrice
        };
        if (data.options.pkey) {
            signer = new ethers.Wallet(data.options.pkey, provider);
        }
        else {
            signer = provider.getSigner(data.options.from);
        }
        var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);
        return await contract.functions[data.method](...Object.values(data.params), options)
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
    }
});

exports.callContractWriteMethod = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        var provider = _getProvider(data.rpcServer);
        var signer;
        var options = {
            gasLimit: data.options.gasLimit,
            gasPrice: data.options.gasPrice
        };
        if (data.options.pkey) {
            signer = new ethers.Wallet(data.options.pkey, provider);
        }
        else {
            signer = provider.getSigner(data.options.from);
            signer.unlock();
        }
        var contract = new ethers.Contract(data.contract.address, data.contract.abi, signer);
        return await contract[data.method](...Object.values(data.params), options);
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || "Can't connect to the server";
        throw new functions.https.HttpsError('unknown', reason);
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

        return accounts;
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
                defaultAccount: accounts[0],
                gasLimit: gasLimit
            }
        };
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

    await firebaseTools.database.remove(`/users/${context.auth.uid}/workspaces/${data.workspace}`, {
        project: process.env.GCLOUD_PROJECT,
        recursive: true,
        confirm: true,
        token: functions.config().fb.token
    });

    return { success: true };
});

exports.syncBlock = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to do this');
    try {
        const block = data.block;
        if (!block)
            throw new functions.https.HttpsError('invalid-argument', 'Missing block parameter.');

        var sBlock = sanitize(block);
        var syncedBlock = {
            hash: sBlock.hash,
            parentHash: sBlock.parentHash,
            number: sBlock.number,
            timestamp: sBlock.timestamp,
            nonce: sBlock.nonce,
            difficulty: sBlock.difficulty,
            gasLimit: sBlock.gasLimit.toString(),
            gasUsed: sBlock.gasUsed.toString(),
            miner: sBlock.miner,
            extraData: sBlock.extraData
        };

        storeBlock(context.auth.uid, data.workspace, syncedBlock);
        
        return { blockNumber: sBlock.number }
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
        if (!data.workspace || !data.contractAddress || !data.artifact)
            throw new functions.https.HttpsError('invalid-argument', 'Missing parameter.');

            await storeContractArtifact(context.auth.uid, data.workspace, data.contractAddress, data.artifact);

            return { contractAddress: data.contractAddress };
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
        if (!data.workspace || !data.contractAddress || !data.dependencies)
            throw new functions.https.HttpsError('invalid-argument', 'Missing parameter.');

            await storeContractDependencies(context.auth.uid, data.workspace, data.contractAddress, data.dependencies);

            return { contractAddress: data.contractAddress };
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
        if (!data.workspace || !data.contractAddress || !data.data)
            throw new functions.https.HttpsError('invalid-argument', 'Missing parameter.');

            storeContractData(context.auth.uid, data.workspace, data.contractAddress, data.data);

            return { contractAddress: data.contractAddress };
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
        if (!data.transaction || !data.block || !data.workspace || !data.transactionReceipt)
            throw new functions.https.HttpsError('invalid-argument', 'Missing parameter.');

        const transaction = data.transaction;
        const receipt = data.transactionReceipt;
        
        const sTransactionReceipt = stringifyBns(sanitize(receipt));
        const sTransaction = stringifyBns(sanitize(transaction));

        if (transaction.to && transaction.input && transaction.value) {
            const functionSignature = getFunctionSignatureForTransaction(transaction.input, transaction.value, abi);
        }

        const txSynced = sanitize({
           ...sTransaction,
            receipt: sTransactionReceipt,
            timestamp: data.block.timestamp,
            functionSignature: functionSignature
        });
    
        storeTransaction(context.auth.uid, data.workspace, txSynced);
        
        if (!txSynced.to)
            storeContractData(context.auth.uid, data.workspace, { address: sTransactionReceipt.contractAddress });
       
       return { txHash: txSynced.hash };
    } catch(error) {
        console.log(error);
        var reason = error.reason || error.message || 'Server error. Please retry.';
        throw new functions.https.HttpsError('unknown', reason);
    }
});
