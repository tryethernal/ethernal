const axios = require('axios');
const ethers = require('ethers');
const { sanitize, withTimeout } = require('../lib/utils');
const yasold = require('../lib/yasold');
const db = require('../lib/firebase');
const { ContractConnector } = require('../lib/rpc');
const { getScannerKey } = require('../lib/env');
const logger = require('../lib/logger');
const { trigger } = require('../lib/pusher');

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

const fetchEtherscanData = async (address, chain) => {
    let scannerHost = 'etherscan.io';
    let apiKey = getScannerKey('ETHERSCAN');
    switch (chain) {
        case 'arbitrum':
            scannerHost = 'arbiscan.io';
            apiKey = getScannerKey('ARBISCAN');
            break;
        case 'bsc':
            scannerHost = 'bscscan.com';
            apiKey = getScannerKey('BSSCAN');
            break;
        case 'matic':
            scannerHost = 'polygonscan.com';
            apiKey = getScannerKey('POLYGONSCAN');
            break;
        case 'avax':
            scannerHost = 'snowtrace.io';
            apiKey = getScannerKey('SNOWTRACE');
            break;
        default:
        break;
    }

    if (!apiKey)
        return null;

    const endpoint = `https://api.${scannerHost}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const response = await withTimeout(axios.get(endpoint));

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
        return 'Missing parameter';

    const contract = await db.getContractById(data.contractId);
    if (!contract)
        return 'Cannot find contract';

    const workspace = await db.getWorkspaceById(contract.workspaceId);
    if (!workspace)
        return 'Cannot find workspace';

    const user = await db.getUserById(workspace.userId);
    if (!user)
        return 'Cannot find user';

    let asm, bytecode, hashedBytecode;

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

    const matchingLocalContract = hashedBytecode ? await db.getContractByHashedBytecode(user.firebaseUserId, workspace.name, hashedBytecode) : null;

    if (matchingLocalContract && matchingLocalContract.address != contract.address) {
        await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, {
            isToken: matchingLocalContract.isToken,
            abi: matchingLocalContract.abi,
            address: contract.address,
            name: matchingLocalContract.name,
            patterns: matchingLocalContract.patterns,
            proxy: matchingLocalContract.proxy,
            tokenDecimals: matchingLocalContract.tokenDecimals,
            tokenName: matchingLocalContract.tokenName,
            tokenSymbol: matchingLocalContract.tokenSymbol,
            verificationStatus: matchingLocalContract.verificationStatus,
            has721Metadata: matchingLocalContract.has721Metadata,
            has721Enumerable: matchingLocalContract.has721Enumerable,
            tokenTotalSupply: matchingLocalContract.tokenTotalSupply,
            ast: matchingLocalContract.ast,
            hashedBytecode, bytecode, asm
        });
    }
    else {
        const scannerMetadata = await findScannerMetadata(workspace, contract);

        const abi = contract.abi || scannerMetadata.abi;
        const tokenData = workspace.public ? await findPatterns(workspace.rpcServer, contract.address, abi) : {};

        let metadata = sanitize({
            bytecode, hashedBytecode, asm, abi,
            name: contract.name || scannerMetadata.name,
            proxy: scannerMetadata.proxy,
            ...tokenData
        });

        if (metadata.proxy)
            await db.storeContractData(user.firebaseUserId, workspace.name, metadata.proxy, { address: metadata.proxy });

        await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, metadata);
    }

    return trigger(`private-contracts;workspace=${contract.workspaceId};address=${contract.address}`, 'updated', null);
};
