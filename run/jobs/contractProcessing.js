const axios = require('axios');
const ethers = require('ethers');
const { sanitize, withTimeout } = require('../lib/utils');
const yasold = require('../lib/yasold');
const { isErc20, isErc721 } = require('../lib/contract');
const db = require('../lib/firebase');
const { ContractConnector, ERC721Connector, getProvider } = require('../lib/rpc');
const logger = require('../lib/logger');
const { trigger } = require('../lib/pusher');
const transactionsLib = require('../lib/transactions');

const NETWORK_TIMEOUT = 10 * 1000;
const ERC721_ABI = require('../lib/abis/erc721.json');
const ERC20_ABI = require('../lib/abis/erc20.json');

const findPatterns = async (rpcServer, contractAddress, abi) => {
    try {
        let decimals, symbol, name, totalSupply, promises = [], patterns = [], tokenData = {}, has721Metadata, has721Enumerable;

        const provider = getProvider(rpcServer);
        const erc20contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

        promises.push(erc20contract.decimals());
        promises.push(erc20contract.symbol());
        promises.push(erc20contract.name());
        promises.push(erc20contract.totalSupply());

        try {
            await withTimeout(Promise.all(promises).then(res => {
                decimals = res[0];
                symbol = res[1];
                name = res[2];
                totalSupply = res[3] && res[3].toString();
            }), NETWORK_TIMEOUT);
        } catch(_error){
            if (_error == 'TIMEOUT') throw _error;
        }

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

        if (patterns.indexOf('erc721') == -1) {
            try {
                const isErc721 = await contract.has721Interface();

                if (isErc721)
                    patterns.push('erc721');
            } catch(_error) {
                if (_error.message == 'TIMEOUT') throw _error;
            }
        }

        if (patterns.indexOf('erc721') > -1) {
            has721Metadata = await contract.has721Metadata();
            has721Enumerable = await contract.has721Enumerable();

            const erc721Connector = new ERC721Connector(rpcServer, contractAddress, { metadata: has721Metadata, enumerable: has721Enumerable });
            symbol = await withTimeout(erc721Connector.symbol(), NETWORK_TIMEOUT);
            name = await withTimeout(erc721Connector.name(), NETWORK_TIMEOUT);
            totalSupply = await withTimeout(erc721Connector.totalSupply(), NETWORK_TIMEOUT);

            tokenData = sanitize({
                symbol: symbol,
                name: name,
                totalSupply: totalSupply
            });
        }

        return {
            patterns: patterns,
            tokenSymbol: tokenData.symbol,
            tokenName: tokenData.name,
            tokenDecimals: tokenData.decimals,
            totalSupply: tokenData.totalSupply,
            has721Metadata: has721Metadata,
            has721Enumerable: has721Enumerable
        };
    } catch(_error) {
        if (_error == 'TIMEOUT') throw new Error(_error);
        return {
            patterns: []
        };
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
        case 'arbitrum':
            scannerHost = 'arbiscan.io';
            apiKey = process.env.ARBISCAN_API_TOKEN;
            break;
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
    const response = await withTimeout(axios.get(endpoint), NETWORK_TIMEOUT);

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

module.exports = async job => {
    const data = job.data;

    if (!data.contractId)
        throw new Error('Missing parameter.');

    let scannerMetadata = {}, asm, bytecode, hashedBytecode;

    const workspace = await db.getWorkspaceById(data.workspaceId);
    const contract = await db.getWorkspaceContractById(workspace.id, data.contractId);

    if (!contract)
        return;

    const user = await db.getUserById(workspace.userId);

    const localMetadata = await findLocalMetadata(user.firebaseUserId, workspace.name, contract);
    if (!localMetadata.name || !localMetadata.abi)
        scannerMetadata = await findScannerMetadata(workspace, contract);

    if (workspace.public) {
        const connector = new ContractConnector(workspace.rpcServer, contract.address, []);
        bytecode = await connector.getBytecode();
    }
    else
        bytecode = contract.bytecode;

    if (bytecode) {
        try {
            hashedBytecode = ethers.utils.keccak256(bytecode);
            asm = yasold.decompileToText(bytecode);
        } catch (error) {
            logger.error(error.message, { location: 'jobs.contractProcessing.asmDecompilation', error: error, data: data });
        }
    }

    const metadata = sanitize({
        name: contract.name || localMetadata.name || scannerMetadata.name,
        abi: contract.abi || localMetadata.abi || scannerMetadata.abi,
        proxy: scannerMetadata.proxy,
        bytecode: bytecode,
        hashedBytecode: hashedBytecode,
        asm: asm
    });

    if (workspace.public && !contract.processed) {
        try {
            const tokenData = await findPatterns(workspace.rpcServer, contract.address, metadata.abi);
            await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, sanitize(tokenData));

            if (tokenData.patterns.indexOf('erc721') > -1 && tokenData.has721Enumerable && workspace.erc721LoadingEnabled) {
                const erc721 = new ERC721Connector(workspace.rpcServer, contract.address, {
                    metadata: tokenData.has721Metadata,
                    enumerable: tokenData.has721Enumerable
                });

                try {
                    await erc721.fetchAndStoreAllTokens(workspace.id);
                } catch(_error) {
                    if (_error == 'TIMEOUT') throw new Error(_error);
                }
            }
        } catch(error) {
            if (error.message == 'TIMEOUT') { 
                await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, { processed: false });
                throw error;
            }
        }
    }

    if (metadata.proxy)
        await db.storeContractData(user.firebaseUserId, workspace.name, metadata.proxy, { address: metadata.proxy });

    if (metadata.name || metadata.abi || metadata.bytecode) {
        await db.storeContractData(
            user.firebaseUserId,
            workspace.name,
            contract.address, 
            metadata
        )
    }

    const transactions = await db.getContractTransactions(user.firebaseUserId, workspace.name, contract.address);

    return trigger(`private-contracts;workspace=${contract.workspaceId};address=${contract.address}`, 'updated', null);
};
