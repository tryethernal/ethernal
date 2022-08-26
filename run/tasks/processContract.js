const axios = require('axios');
const express = require('express');
const ethers = require('ethers');
const { sanitize } = require('../lib/utils');
const { isErc20, isErc721 } = require('../lib/contract');
const SELECTORS = require('../lib/abis/selectors.json');
const db = require('../lib/firebase');
const { ContractConnector, ERC721Connector } = require('../lib/rpc');
const writeLog = require('../lib/writeLog');
const { trigger } = require('../lib/pusher');
const transactionsLib = require('../lib/transactions');
const taskAuthMiddleware = require('../middlewares/taskAuth');

const router = express.Router();

const ERC20_ABI = require('../lib/abis/erc20.json');

const ERC721_ABI = [
    {"constant": true,"inputs": [{"internalType": "bytes4","name": "interfaceId","type": "bytes4"}],"name": "supportsInterface","outputs": [{"internalType": "bool","name": "","type": "bool"}],"payable": false,"stateMutability": "view","type": "function"},
    {"name":"name", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
    {"name":"symbol", "constant":true, "payable":false, "type":"function", "inputs":[], "outputs":[{"name":"","type":"string"}]},
    {"inputs": [],"name": "totalSupply","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"}
];

const findPatterns = async (rpcServer, contractAddress, abi) => {
    try {
        let decimals, symbol, name, totalSupply, promises = [], patterns = [], tokenData = {}, has721Metadata, has721Enumerable;

        const provider = new ethers.providers.JsonRpcProvider({ url: rpcServer });
        const erc20contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        promises.push(erc20contract.decimals());
        promises.push(erc20contract.symbol());
        promises.push(erc20contract.name());
        promises.push(erc20contract.totalSupply());

        await Promise.all(promises).then(res => {
            decimals = res[0];
            symbol = res[1];
            name = res[2];
        }).catch(() => {});

        if (decimals && symbol && name) {
            tokenData = sanitize({
                decimals: decimals,
                symbol: symbol,
                name: name,
                totalSupply: totalSupply
            });

            patterns.push('erc20');

            if (abi && !isErc20(abi))
                patterns.push('proxy')
        }

        if (abi && isErc721(abi))
            patterns.push('erc721')

        const contract = new ContractConnector(rpcServer, contractAddress, ERC721_ABI);

        if (!abi) {
            const isErc721 = await contract.supportsInterface('0x80ac58cd');
            if (isErc721)
                patterns.push('erc721');
        }

        if (patterns.indexOf('erc721') > -1) {
            has721Metadata = await contract.has721Metadata();
            has721Enumerable = await contract.has721Enumerable();
            symbol = await contract.symbol();
            name = await contract.name();
            totalSupply = await contract.totalSupply();

            tokenData = sanitize({
                symbol: symbol,
                name: name,
                totalSupply: totalSupply
            });
        }

        return {
            patterns: patterns,
            tokenData: tokenData,
            has721Metadata: has721Metadata,
            has721Enumerable: has721Enumerable
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

        if (workspace.public && !contract.processed) {
            const tokenInfo = await findPatterns(workspace.rpcServer, contract.address, metadata.abi);
            await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, sanitize({
                patterns: tokenInfo.patterns,
                processed: true,
                token: tokenInfo.tokenData,
                has721Metadata: tokenInfo.has721Metadata,
                has721Enumerable: tokenInfo.has721Enumerable,
            }));

            const erc721 = new ERC721Connector(workspace.rpcServer, contract.address, {
                metadata: tokenInfo.has721Metadata,
                enumerable: tokenInfo.has721Enumerable
            });

            try {
                const collection = await erc721.fetchAllTokens(true, async (token) => {
                    await db.storeErc721Token(user.firebaseUserId, workspace.name, contract.address, token);
                });
            } catch(error) {
                console.log(error);
                throw error;
            }
        }

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