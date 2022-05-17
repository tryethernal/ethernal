const axios = require('axios');
const express = require('express');
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');
const { enqueueTask } = require('../lib/tasks');
const db = require('../lib/firebase');
const transactionsLib = require('../lib/transactions');

const router = express.Router();

const findLocalMetadata = async (userId, workspaceName, contract) => {
    if (!contract.hashedBytecode)
        return {};

    const matchingContract = await db.getContractByHashedBytecode(
        userId,
        workspaceName,
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
    let apiKey = process.env.ETHERSCAN_TOKEN;
    switch (chain) {
        case 'bsc':
            scannerHost = 'bscscan.com';
            apiKey = process.env.BSSCAN_TOKEN;
            break;
        case 'matic':
            scannerHost = 'polygonscan.com';
            apiKey = process.env.POLYGONSCAN_TOKEN;
            break;
        case 'avax':
            scannerHost = 'snowtrace.io';
            apiKey = process.env.SNOWTRACE_TOKEN;
            break;
        default:
        break;
    }

    const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const response = await axios.get(endpoint);
    return response ? response.data : null;
};

const findScannerMetadata = async (workspace, contract) => {
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

router.post('/', async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.contractId) {
            console.log(data);
            throw '[POST /tasks/processContract] Missing parameter.';
        }
        
        let scannerMetadata = {}, tokenPatterns = [];

        const workspace = await db.getWorkspaceById(data.workspaceId);
        const contract = await db.getWorkspaceContractById(workspace.id, data.contractId);
        const user = await db.getUserById(workspace.userId);

        const localMetadata = await findLocalMetadata(user.firebaseUserId, workspace.id, contract);
        if (!localMetadata.name || !localMetadata.abi)
            scannerMetadata = await findScannerMetadata(workspace, contract);

        const metadata = sanitize({
            name: contract.name || localMetadata.name || scannerMetadata.name,
            abi: contract.abi || localMetadata.abi || scannerMetadata.abi,
            proxy: scannerMetadata.proxy
        });

        if (metadata.proxy)
            await db.storeContractData(user.firebaseUserId, workspace.name, metadata.proxy, { address: metadata.proxy });

        if (metadata.name || metadata.abi) {
            await db.storeContractData(
                user.firebaseUserId,
                workspace.name,
                contract.address, 
                metadata
            )
        }

        if (workspace.public) { 
            const tokenInfo = await fetchTokenInfo(workspace.rpcServer, contract.address, metadata.abi);
            await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, sanitize({
                patterns: tokenInfo.patterns,
                processed: true,
                token: tokenInfo.tokenData
            }));
        }

        const transactions = await db.getContractTransactions(user.firebaseUserId, workspace.name, contract.address);
        await transactionsLib.processTransactions(user.firebaseUserId, workspace.name, transactions);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
});

module.exports = router;