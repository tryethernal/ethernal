const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { sanitize } = require('../lib/utils');
const workspaceAuthMiddleware = require('../middlewares/workspaceAuth');
const authMiddleware = require('../middlewares/auth');
const processContractVerification = require('../lib/processContractVerification');

router.post('/:address', authMiddleware, async (req, res) => {
    const data = req.body.data;
    console.log(data);
    try {
        if (!data.uid || !data.workspace) {
            console.log(data);
            throw new Error(`[POST /api/contracts/${req.params.address}] Missing parameters`);
        }
        const sanitizedData = sanitize({
            address: data.address,
            name: data.name,
            abi: data.abi,
            watchedPaths: data.watchedPaths,
            hashedBytecode: data.hashedBytecode,
            imported: data.imported
        });

        const canSyncData = await db.canUserSyncContract(data.uid, data.workspace, req.params.address);
        if (!canSyncData)
            return res.status(200).send('Free plan users are limited to 10 synced contracts. Upgrade to our Premium plan to sync more.');

        await db.storeContractData(data.uid, data.workspace, req.params.address, sanitizedData);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/tokenProperties', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        if (!data.uid || !data.workspace || !data.contract) {
            console.log(data);
            throw new Error(`[POST /api/contracts/${req.params.address}/tokenProperties] Missing parameters`);
        }

        const contract = await db.getWorkspaceContract(data.uid, data.workspace, req.params.address);
        
        if (!contract)
            return res.status(200).send(`Couldn't find contract at address ${data.contract}.`);

        const newPatterns = data.tokenPatterns ? [...new Set([...contract.patterns, ...data.tokenPatterns])] : contract.patterns;

        let tokenData = {};
        if (data.tokenProperties) {
            tokenData = sanitize({
                symbol: data.tokenProperties.symbol,
                decimals: data.tokenProperties.decimals,
                name: data.tokenProperties.name
            });
        }

        await db.storeContractData(data.uid, data.workspace, data.contract, {
            patterns: newPatterns,
            token: tokenData,
            processed: true
        });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/:address/remove', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        await db.removeContract(data.uid, data.workspace, req.params.address);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.post('/verification', async (req, res) => {
    try {
        await processContractVerification(db, req.body.data);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/:address', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        const contract = await db.getWorkspaceContract(data.firebaseUserId, data.workspace.name, req.params.address)

        res.status(200).json(contract);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

router.get('/', workspaceAuthMiddleware, async (req, res) => {
    const data = req.query;
    try {
        const contracts = await db.getWorkspaceContracts(data.firebaseUserId, data.workspace.name, data.page, data.itemsPerPage, data.orderBy, data.order);

        res.status(200).json(contracts);
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

module.exports = router;
