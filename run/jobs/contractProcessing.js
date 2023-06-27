const axios = require('axios');
const ethers = require('ethers');
const { sanitize, withTimeout } = require('../lib/utils');
const yasold = require('../lib/yasold');
const db = require('../lib/firebase');
const { ContractConnector, ERC721Connector, getProvider } = require('../lib/rpc');
const logger = require('../lib/logger');
const { trigger } = require('../lib/pusher');

const NETWORK_TIMEOUT = 10 * 1000;

const findPatterns = async (rpcServer, contractAddress, abi) => {
    let tokenData = { patterns: [] };
    try {
        const contract = new ContractConnector(rpcServer, contractAddress, abi);
        const isErc20 = await contract.isErc20();
        const isErc721 = await contract.isErc721();
        const isErc1155 = await contract.isErc1155();

        if (isErc20 || isErc721 || isErc1155) {
            tokenData = sanitize({
                ...tokenData,
                tokenDecimals: await contract.decimals(),
                tokenSymbol: await contract.symbol(),
                tokenName: await contract.name(),
                tokenTotalSupply: await contract.totalSupply(),
            });

            if (isErc20) tokenData.patterns.push('erc20');
            if (isErc721) tokenData.patterns.push('erc721');
            if (isErc1155) tokenData.patterns.push('erc1155');

            const isProxy = await contract.isProxy();
            if (isProxy)
                tokenData.patterns.push('proxy');
        }

        if (isErc721) {
            const has721Metadata = await contract.has721Metadata();
            const has721Enumerable = await contract.has721Enumerable();

            tokenData = sanitize({ ...tokenData, has721Metadata, has721Enumerable });
        }

        return tokenData;
    } catch(error) {
        if (error.message && error.message.startsWith('Timed out'))
            throw error;
        return tokenData;
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

    if (!apiKey)
        return null;

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

    const contract = await db.getContractById(data.contractId);

    if (!contract)
        return;

    const workspace = await db.getWorkspaceById(contract.workspaceId);

    if (!workspace)
        return;

    const user = await db.getUserById(workspace.userId);

    if (!user)
        return;

    let scannerMetadata = {}, asm, bytecode, hashedBytecode;

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

    const tokenData = await findPatterns(workspace.rpcServer, contract.address, metadata.abi);

    let metadata = sanitize({
        name: contract.name || localMetadata.name || scannerMetadata.name,
        abi: contract.abi || localMetadata.abi || scannerMetadata.abi,
        proxy: scannerMetadata.proxy,
        bytecode: bytecode,
        hashedBytecode: hashedBytecode,
        asm: asm,
        ...tokenData
    });

    if (metadata.proxy)
        await db.storeContractData(user.firebaseUserId, workspace.name, metadata.proxy, { address: metadata.proxy });

    await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, metadata);

    return trigger(`private-contracts;workspace=${contract.workspaceId};address=${contract.address}`, 'updated', null);
};
