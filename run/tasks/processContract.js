const axios = require('axios');
const express = require('express');
const ethers = require('ethers');
const { sanitize } = require('../lib/utils');
const { isErc20 } = require('../lib/contract');
const db = require('../lib/firebase');
const writeLog = require('../lib/writeLog');
const { trigger } = require('../lib/pusher');
const transactionsLib = require('../lib/transactions');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

const ERC20_ABI = [
    {"name":"name", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
    {"name":"symbol", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
    {"name":"decimals", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"uint8"}]}
];

const fetchTokenInfo = async (rpcServer, contractAddress, abi) => {
    try {
        let decimals, symbol, name, promises = [];

        const provider = new ethers.providers.JsonRpcProvider({ url: rpcServer });
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        promises.push(contract.decimals());
        promises.push(contract.symbol());
        promises.push(contract.name());

        await Promise.all(promises).then(res => {
            decimals = res[0];
            symbol = res[1];
            name = res[2];
        }).catch(() => {});

        if (!decimals || !symbol || !name) {
            return {};
        }

        const tokenData = sanitize({
            decimals: decimals,
            symbol: symbol,
            name: name
        });

        const patterns = ['erc20'];
        if (abi)
            if (!isErc20(abi)) patterns.push('proxy');

        return {
            patterns: patterns,
            tokenData: tokenData
        };
    } catch(error) {
        console.log(error);
        return {};
    }
};

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
    let apiKey = process.env.ETHERSCAN_API_TOKEN;
    switch (chain) {
        case 'bsc':
            scannerHost = 'bscscan.com';
            apiKey = process.env.BSSCAN_API_TOKEN;
            break;
        case 'matic':
            scannerHost = 'polygonscan.com';
            apiKey = process.env.POLYGONSCAN_API_TOKEN;
            break;
        case 'avax':
            scannerHost = 'snowtrace.io';
            apiKey = process.env.SNOWTRACE_API_TOKEN;
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

router.post('/', taskAuthMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.contractId) {
            console.log(data);
            throw new Error('Missing parameter.');
        }
        
        let scannerMetadata = {}, tokenPatterns = [];

        const workspace = await db.getWorkspaceById(data.workspaceId);
        const contract = await db.getWorkspaceContractById(workspace.id, data.contractId);

        if (!contract)
            return res.sendStatus(200);

        const user = await db.getUserById(workspace.userId);

        const localMetadata = await findLocalMetadata(user.firebaseUserId, workspace.name, contract);
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

        trigger(`private-contracts;workspace=${contract.workspaceId};address=${contract.address}`, 'updated', null);

        res.sendStatus(200);
    } catch(error) {
        writeLog({
            functionName: 'POST /tasks/processContract',
            error: error,
            extra: {
                data: data,
            }
        });
        res.sendStatus(400);
    }
});

module.exports = router;