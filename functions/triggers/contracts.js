const functions = require('firebase-functions');
const admin = require('firebase-admin');

const { getContractByHashedBytecode, getWorkspaceByName, storeContractData } = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const { findTokenPatterns } = require('../lib/contract');
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
        default:
        break;
    }

    const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    return (await axios.get(endpoint)).data;
};

const findScannerMetadata = async (context, contract) => {
    const workspace = await getWorkspaceByName(context.params.userId, context.params.workspaceName);
 
    const scannerData = await fetchEtherscanData(contract.address, workspace.chain);
    
    if (scannerData.message != 'NOTOK' && scannerData.result[0].ContractName != '') {
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
        const contract = { ...snap.data(), address: snap.id };

        const localMetadata = await findLocalMetadata(context, contract);
        if (!localMetadata.name || !localMetadata.abi)
            scannerMetadata = await findScannerMetadata(context, contract);

        const metadata = sanitize({
            name: localMetadata.name || scannerMetadata.name,
            abi: localMetadata.abi || scannerMetadata.abi,
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
        
        if (metadata.abi) {
            tokenPatterns = findTokenPatterns(metadata.abi);

            if (tokenPatterns.length) {
                await storeContractData(
                    context.params.userId,
                    context.params.workspaceName,
                    contract.address,
                    { patterns: admin.firestore.FieldValue.arrayUnion(...tokenPatterns) }
                )
            }
        }

    } catch (error) {
        console.log(error);
    }
};

exports.matchWithContract = async (snap, context) => {
    try {
        const newContract = snap.data();

        if (!newContract.hashedBytecode || newContract.abi) {
            return null;
        }

        const contract = await getContractByHashedBytecode(context.params.userId, context.params.workspaceName, newContract.hashedBytecode, [snap.id]);

        if (contract && (contract.name || contract.abi)) {
            return snap._ref.set(sanitize({ name: contract.name, abi: contract.abi }), { merge: true });
        }
        else {
            const workspace = await getWorkspaceByName(context.params.userId, context.params.workspaceName);
            let scannerHost = 'etherscan.io';
            let apiKey = functions.config().etherscan.token;

            switch (workspace.chain) {
                case 'bsc':
                    scannerHost = 'bscscan.com';
                    apiKey = functions.config().bscscan.token;
                    break;
                case 'matic':
                    scannerHost = 'polygonscan.com';
                    apiKey = functions.config().polygonscan.token;
                    break;
                default:
                break;
            }

            const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${newContract.address}&apikey=${apiKey}`;
            const scannerData = (await axios.get(endpoint)).data;

            contractData = scannerData.message != 'NOTOK' && scannerData.result[0].ContractName != '' ?
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode, name: scannerData.result[0].ContractName, abi: JSON.parse(scannerData.result[0].ABI || []) } :
                { address: snap.id.toLowerCase(), hashedBytecode: newContract.contractHashedBytecode };

            return snap._ref.set(sanitize(contractData), { merge: true });
        }

        return null;
    } catch (error) {
        console.log(error);
    }
};
