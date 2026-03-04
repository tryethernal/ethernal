/**
 * @fileoverview Contract processing job.
 * Detects token standards (ERC20/721/1155), fetches Etherscan metadata,
 * decompiles bytecode, and stores contract data.
 * @module jobs/processContract
 */

const axios = require('axios');
const ethers = require('ethers');
const { sanitize, withTimeout } = require('../lib/utils');
const yasold = require('../lib/yasold');
const { contractFn } = require('../lib/codeRunner');
const db = require('../lib/firebase');
const { detectStandard } = require('../lib/abi');
const { ContractConnector, ERC721Connector } = require('../lib/rpc');
const { Workspace, Contract, CustomField } = require('../models');
const { getScannerKey } = require('../lib/env');
const logger = require('../lib/logger');
const { trigger } = require('../lib/pusher');

const findPatterns = async (rpcServer, contractAddress, abi) => {
    let tokenData = { patterns: [] };

    let isErc20, isErc721, isErc1155;

    if (abi && abi.length > 0) {
        const fns = detectStandard(abi);
        if (fns.isERC20) isErc20 = true;
        if (fns.isERC721) isErc721 = true;
        if (fns.isERC1155) isErc1155 = true;
    }

    const contract = new ContractConnector(rpcServer, contractAddress, abi);

    // Detect token standards in parallel
    const [erc20Res, erc721Res, erc1155Res] = await Promise.all([
        isErc20 ? true : contract.isErc20(),
        isErc721 ? true : contract.isErc721(),
        isErc1155 ? true : contract.isErc1155()
    ]);
    isErc20 = erc20Res;
    isErc721 = erc721Res;
    isErc1155 = erc1155Res;

    if (isErc20 || isErc721 || isErc1155) {
        // Fetch metadata + proxy detection in parallel
        const [decimals, symbol, name, totalSupply, isProxy] = await Promise.allSettled([
            contract.decimals(),
            contract.symbol(),
            contract.name(),
            contract.totalSupply(),
            contract.isProxy()
        ]);

        tokenData = sanitize({
            ...tokenData,
            tokenDecimals: decimals.status === 'fulfilled' ? decimals.value : null,
            tokenSymbol: symbol.status === 'fulfilled' ? symbol.value : null,
            tokenName: name.status === 'fulfilled' ? name.value : null,
            tokenTotalSupply: totalSupply.status === 'fulfilled' ? totalSupply.value : null,
        });

        if (isErc20) tokenData.patterns.push('erc20');
        if (isErc721) tokenData.patterns.push('erc721');
        if (isErc1155) tokenData.patterns.push('erc1155');

        if (isProxy.status === 'fulfilled' && isProxy.value)
            tokenData.patterns.push('proxy');
    }

    if (isErc721) {
        const erc721Connector = new ERC721Connector(rpcServer, contractAddress, abi);
        const [metadataResult, enumerableResult] = await Promise.allSettled([
            erc721Connector.hasMetadata(),
            erc721Connector.isEnumerable()
        ]);

        const has721Metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : false;
        const has721Enumerable = enumerableResult.status === 'fulfilled' ? enumerableResult.value : false;

        tokenData = sanitize({ ...tokenData, has721Metadata, has721Enumerable });
    }

    return tokenData;
};

const fetchEtherscanData = async (address, workspace) => {
    let scannerHost = 'api.etherscan.io/api';
    let apiKey = getScannerKey('ETHERSCAN');
    let headers = {};

    switch (workspace.chain) {
        case 'arbitrum':
            scannerHost = 'api.arbiscan.io/api';
            apiKey = getScannerKey('ARBISCAN');
            break;
        case 'bsc':
            scannerHost = 'api.bscscan.com/api';
            apiKey = getScannerKey('BSSCAN');
            break;
        case 'matic':
            scannerHost = 'api.polygonscan.com/api';
            apiKey = getScannerKey('POLYGONSCAN');
            break;
        case 'avax':
            scannerHost = 'api.snowtrace.io/api';
            apiKey = getScannerKey('SNOWTRACE');
            break;
        case 'buildbear':
            scannerHost = `api.buildbear.io/v1/explorer/slimy-jugsgernaut-ea0852a40`;
            apiKey = getScannerKey('BUILDBEAR');
            headers['Authorization'] = `Bearer ${apiKey}`;
            break;
        default:
        break;
    }

    if (!apiKey)
        return null;

    const endpoint = `https://${scannerHost}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    try {
        const response = await withTimeout(axios.get(endpoint, { headers }));
        return response ? response.data : null;
    } catch (error) {
        if (error.response && error.response.status >= 400)
            return error.response;

        throw error;
    }
};

const findScannerMetadata = async (workspace, contract) => {
    const scannerData = await fetchEtherscanData(contract.address, workspace);

    if (scannerData && scannerData.status >= 400)
        return scannerData;

    if (scannerData && scannerData.message != 'NOTOK' && scannerData.result[0].ContractName != '') {
        const abi = JSON.parse(scannerData.result[0].ABI || '[]');

        const sources = scannerData.result[0].SourceCode;
        let parsedSources;
        if (sources.startsWith('{{'))
            try {
                parsedSources = JSON.parse(sources.substring(1, sources.length - 1)).sources;
            } catch (error) {
                parsedSources = null;
            }
        else
            parsedSources = {
                [`${scannerData.result[0].ContractName.split('.sol')[0]}.sol`]: { content: sources }
            };

        const verificationData = !parsedSources || scannerData.result[0].ABI == 'Contract source code not verified' ?
        null :
        {
            compilerVersion: scannerData.result[0].CompilerVersion,
            constructorArguments: scannerData.result[0].ConstructorArguments,
            runs: scannerData.result[0].Runs,
            contractName: scannerData.result[0].ContractName.split('.sol')[0],
            evmVersion: scannerData.result[0].EvmVersion,
            sources: parsedSources,
            libraries: scannerData.result[0].Library,
        };

        return {
            name: scannerData.result[0].ContractName.split('.sol')[0],
            verificationData,
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

    const contract = await Contract.findByPk(data.contractId, {
        include: {
            model: Workspace,
            as: 'workspace',
            include: [
                'explorer', 'user',
                {
                    model: CustomField,
                    as: 'customFields',
                    where: { location: 'contract' },
                    required: false
                }
            ]
        }
    });

    if (!contract)
        return 'Cannot find contract';

    const workspace = contract.workspace;
    const user = workspace.user;

    let asm, bytecode, hashedBytecode;

    if (workspace.public) {
        const connector = new ContractConnector(workspace.rpcServer, contract.address, []);
        bytecode = await connector.getBytecode();
    }
    else
        bytecode = contract.bytecode;


    if (bytecode == '0x')
        return contract.safeDestroy();

    if (bytecode) {
        try {
            hashedBytecode = ethers.utils.keccak256(bytecode);
            asm = yasold.decompileToText(bytecode);
        } catch (error) {
            logger.error(error.message, { location: 'jobs.contractProcessing.asmDecompilation', error: error, data: data });
        }
    }

    const matchingLocalContract = hashedBytecode ? await db.getContractByHashedBytecode(workspace.id, hashedBytecode) : null;

    if (matchingLocalContract && matchingLocalContract.address != contract.address) {
        await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, {
            abi: matchingLocalContract.abi,
        });
    }

    let scannerMetadata = await findScannerMetadata(workspace, contract);

    if (scannerMetadata && scannerMetadata.status >= 400)
        scannerMetadata = {};

    const abi = contract.abi || scannerMetadata.abi;
    let tokenData = {};

    if (workspace.public) {
        try {
            tokenData = await findPatterns(workspace.rpcServer, contract.address, abi);
        } catch (error) {
            if (error.message.startsWith('Timed out'))
                throw error;
            logger.error(error.message, { location: 'jobs.contractProcessing.findPatterns', error: error, data: data });
        }
    }

    let metadata = sanitize({
        bytecode, hashedBytecode, asm, abi,
        name: contract.name || scannerMetadata.name,
        proxy: scannerMetadata.proxy,
        ...tokenData
    });

    if (metadata.proxy)
        await db.storeContractData(user.firebaseUserId, workspace.name, metadata.proxy, { address: metadata.proxy });

    if (scannerMetadata.verificationData)
        await db.storeContractVerificationData(workspace.id, contract.address, scannerMetadata.verificationData);

    if (workspace.customFields && workspace.customFields.length > 0) {
        for (const customField of workspace.customFields) {
            const extraFields = await contractFn(customField.function, contract, metadata);
            if (extraFields && typeof extraFields === 'object')
                metadata = sanitize({ ...metadata, ...extraFields });
        }
    }

    await db.storeContractData(user.firebaseUserId, workspace.name, contract.address, metadata);

    return trigger(`private-contracts;workspace=${contract.workspaceId};address=${contract.address}`, 'updated', null);
};
