const express = require('express');
const router = express.Router();
const logger = require('../lib/logger');
const Lock = require('../lib/lock');
const db = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const processContractVerification = require('../lib/processContractVerification');
const { holderHistory, circulatingSupply, holders, transfers } = require('./modules/tokens');

router.get('/:address/holderHistory', workspaceAuthMiddleware, holderHistory);
router.get('/:address/circulatingSupply', workspaceAuthMiddleware, circulatingSupply);
router.get('/:address/holders', workspaceAuthMiddleware, holders);
router.get('/:address/transfers', workspaceAuthMiddleware, transfers);

router.post('/verify', async (req, res) => {
    const data = req.body;
    let lock, isLockAcquired;

    try {
        if (!data.sourceCode || !data.contractaddress || !data.compilerversion || !data.contractname || data.constructorArguements === undefined)
            throw new Error('Missing parameters.')

        const contractAddress = data.contractaddress.toLowerCase();

        let explorer;
        if (req.headers['apx-incoming-host']) {
            explorer = await db.getPublicExplorerParamsByDomain(req.headers['apx-incoming-host'])
        }
        else if (data['apikey']) {
            explorer = await db.getPublicExplorerParamsBySlug(data['apikey']);
        }

        if (!explorer)
            throw new Error('Could not find explorer. If you are using the apiKey param, make sure it is correct.');

        const contract = await db.getContractByWorkspaceId(explorer.workspaceId, contractAddress);
        if (!contract)
            throw new Error('Unable to locate contract. Please try running the verification command again.');

        if (contract.verification)
            return res.status(200).json({
                status: "1",
                message: "OK",
                result: "Already Verified"
            });

        if (data.contractname.split(':').length != 2)
            throw new Error('Invalid contract name format.');

        lock = new Lock(`contractVerification-${explorer.id}-${contract.id}`, 60000);

        isLockAcquired = await lock.acquire();
        if (!isLockAcquired)
            throw new Error('There is already an ongoing verification for this contract.');

        await lock.acquire();

        const contractFile = data.contractname.split(':')[0];
        const contractName = data.contractname.split(':')[1];

        const source = JSON.parse(data.sourceCode);

        const payload = {
            publicExplorerParams: explorer,
            contractAddress: contractAddress,
            compilerVersion: data.compilerversion,
            constructorArguments: data.constructorArguements,
            code: { sources: source.sources, libraries: source.settings.libraries },
            contractName, contractFile,
            optimizer: source.settings.optimizer ? source.settings.optimizer.enabled : false,
            runs: source.settings.optimizer ? source.settings.optimizer.runs : 0,
            evmVersion: source.settings.evmVersion
        }

        await processContractVerification(db, payload);

        await lock.release();

        res.status(200).json({
            status: "1",
            message: "OK",
            result: "1234"
        });
    } catch(error) {
        if (lock && isLockAcquired)
            await lock.release();
        logger.error(error.message, { location: 'post.api.contracts.verify', error, queryParams: req.query });
        res.status(200).json({
            status: "0",
            message: "OK",
            result: `Contract verification failed: ${error.message}`
        });
    }
});

router.get('/verificationStatus', async (req, res) => {
    res.status(200).json({
        status: "1",
        message: "OK",
        result: "Pass - Verified"
    });
});

router.get('/:address/stats', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        if (!data.workspace || !req.params.address)
            throw new Error('Missing parameter');

        const result = await db.getTokenStats(data.workspace.id, req.params.address);

        res.status(200).json(result);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.address.stats', error, queryParams: req.query });
        res.status(400).send(error.message);
    }
});

router.get('/:address/logs', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!data.workspace)
            throw new Error(`Missing parameters`);

        const logs = await db.getContractLogs(data.workspace.id, req.params.address, data.signature, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(logs);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.contracts.logs', error, querParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/processable', authMiddleware, async (req, res) => {
    const data = req.query;

    try {
        if (!data.firebaseUserId || !data.workspace)
            throw new Error(`Missing parameters`);

        const contracts = await db.getUnprocessedContracts(data.firebaseUserId, data.workspace);

        res.status(200).json(contracts);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.contracts.processable', error });
        res.status(400).send(error.message);
    }
});

router.post('/:address/watchedPaths', workspaceAuthMiddleware, async (req, res) => {
    const data = { ...req.query, ...req.body.data };

    try {
        if (!data.firebaseUserId || !data.workspace || !data.watchedPaths)
            throw new Error(`Missing parameters`);

        const sanitizedData = sanitize({
            watchedPaths: data.watchedPaths,
        });

        await db.storeContractData(data.firebaseUserId, data.workspace, req.params.address, sanitizedData);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.contracts.address.watchedPaths', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:address', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.uid || !data.workspace)
            throw new Error(`Missing parameters`);

        const sanitizedData = sanitize({
            address: data.address,
            name: data.name,
            abi: data.abi,
            ast: data.ast,
            watchedPaths: data.watchedPaths,
            hashedBytecode: data.hashedBytecode
        });

        const canSyncData = await db.canUserSyncContract(data.uid, data.workspace, req.params.address);
        if (!canSyncData)
            throw new Error('Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

        await db.storeContractData(data.uid, data.workspace, req.params.address, sanitizedData);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.contracts.address', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:address/tokenProperties', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace)
            throw new Error(`Missing parameters`);

        const contract = await db.getWorkspaceContract(data.workspace.id, req.params.address);
        
        if (!contract)
            return res.status(200).send(`Couldn't find contract at address ${req.params.address}.`);

        const newPatterns = data.properties.patterns ? [...new Set([...contract.patterns, ...data.properties.patterns])] : contract.patterns;

        let tokenData = {};
        if (data.properties) {
            tokenData = sanitize({
                patterns: newPatterns,
                tokenSymbol: data.properties.tokenSymbol,
                tokenDecimals: data.properties.tokenDecimals,
                tokenName: data.properties.tokenName,
                totalSupply: data.properties.totalSupply,
                has721Metadata: data.properties.has721Metadata,
                has721Enumerable: data.properties.has721Enumerable,
                bytecode: data.properties.bytecode
            });
        }

        await db.storeContractData(data.uid, data.workspace, req.params.address, {
            ...tokenData,
            processed: true
        });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.contracts.address.tokenProperties', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:address/remove', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        await db.removeContract(data.uid, data.workspace, req.params.address);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.contracts.address.remove', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.post('/:address/verify', async (req, res) => {
    const data = req.body;
    const address = req.params.address.toLowerCase();
    try {
         if (!data.explorerSlug || !data.compilerVersion || !data.code || !data.contractName)
            throw new Error(`Missing parameter.`);

        const explorer = await db.getPublicExplorerParamsBySlug(data.explorerSlug);

        if (!explorer)
            throw new Error('Could not find explorer, make sure you passed the correct slug.')

        const contract = await db.getContract(explorer.userId, explorer.workspaceId, address)

        if (!contract)
            throw new Error(`Couldn't find contract at address ${address}`);

        // if (contract.verificationStatus == 'pending')
        //     throw new Error('There already is an ongoing verification for this contract.');

        const payload = sanitize({
            publicExplorerParams: explorer,
            contractAddress: address,
            compilerVersion: data.compilerVersion,
            constructorArguments: data.constructorArguments,
            code: data.code,
            contractName: data.contractName,
            optimizer: data.optimizer,
            runs: data.runs,
            evmVersion: data.evmVersion,
            viaIR: data.viaIR
        });

        const result = await processContractVerification(db, payload);

        if (!result.verificationSucceded)
            throw new Error(result.reason);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.contracts.address.verify', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/:address', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const contract = await db.getWorkspaceContract(data.workspace.id, req.params.address)

        res.status(200).json(contract);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.contracts.address', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;

    try {
        const contracts = await db.getWorkspaceContracts(data.workspace.id, data.page, data.itemsPerPage, data.orderBy, data.order, data.pattern);

        res.status(200).json(contracts);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.contracts', error, queryParams: req.params });
        res.status(400).send(error.message);
    }
});

module.exports = router;
