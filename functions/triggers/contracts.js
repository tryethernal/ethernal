const functions = require('firebase-functions');

const { getContractByHashedBytecode, getWorkspaceByName, storeContractData, getContractTransactions } = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const { processTransactions } = require('../lib/transactions');
const axios = require('axios');

const findLocalMetadata = async (context, contract) => {
    if (!contract.hashedBytecode)
        return {};

    const matchingContract = await getContractByHashedBytecode(
        context.params.userId,
        context.params.workspaceName,
        contract.hashedBytecode,
        [contract.address]
    );

    if (matchingContract && (matchingContract.name || matchingContract.abi))
        return sanitize({ name: matchingContract.name, abi: matchingContract.abi });
    else
        return {};
};

const fetchEtherscanData = async (address, chain) => {
    let scannerHost = 'etherscan.io';
    let apiKey = functions.config().etherscan.token;
    switch (chain) {
        case 'bsc':
            scannerHost = 'bscscan.com';
            apiKey = functions.config().bscscan.token;
            break;
        case 'matic':
            scannerHost = 'polygonscan.com';
            apiKey = functions.config().polygonscan.token;
            break;
        case 'avax':
            scannerHost = 'snowtrace.io';
            apiKey = functions.config().snowtrace.token;
            break;
        default:
        break;
    }

    const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const response = await axios.get(endpoint);
    return response ? response.data : null;
};

const findScannerMetadata = async (context, contract) => {
    const workspace = await getWorkspaceByName(context.params.userId, context.params.workspaceName);
 
    const scannerData = await fetchEtherscanData(contract.address, workspace.chain);
    
    if (scannerData && scannerData.message != 'NOTOK' && scannerData.result[0].ContractName != '') {
        const abi = JSON.parse(scannerData.result[0].ABI || '[]')

        return {
            name: scannerData.result[0].ContractName,
            abi: abi,
            proxy: scannerData.result[0].Proxy == '1' ? scannerData.result[0].Implementation : null
        };
    }
    else
        return {};
};

exports.processContract = async (snap, context) => {
    try {
        let scannerMetadata = {}, tokenPatterns = [];
        const newSnap = snap.after ? snap.after : snap;

        const contract = { ...newSnap.data(), address: newSnap.id };

        const localMetadata = await findLocalMetadata(context, contract);
        if (!localMetadata.name || !localMetadata.abi)
            scannerMetadata = await findScannerMetadata(context, contract);

        const metadata = sanitize({
            name: contract.name || localMetadata.name || scannerMetadata.name,
            abi: contract.abi || localMetadata.abi || scannerMetadata.abi,
            proxy: scannerMetadata.proxy
        });

        if (metadata.proxy)
            storeContractData(context.params.userId, context.params.workspaceName, metadata.proxy, { address: metadata.proxy });

        if (metadata.name || metadata.abi) {
            await storeContractData(
                context.params.userId,
                context.params.workspaceName,
                contract.address, 
                metadata
            )
        }

        const transactions = await getContractTransactions(context.params.userId, context.params.workspaceName, contract.address);
        await processTransactions(context.params.userId, context.params.workspaceName, transactions);
    } catch (error) {
        console.log(error);
    }
};
