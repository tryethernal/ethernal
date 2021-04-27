const functions = require("firebase-functions");
const express = require('express');
const ethers = require('ethers');
const moment = require('moment');
const { getUserByKey, getWorkspaceByName, storeTransaction, storeBlock, getUser } = require('../lib/firebase');
const { sanitize, stringifyBns, getTxSynced } = require('../lib/utils')
const { decrypt, decode } = require('../lib/crypto');

const app = express();

const rewriterMiddleware = function(req, res, next) {
    if (req.url.indexOf('/api/') === 0) {
        req.url = req.url.substring(4);
    }
    next();
};

const alchemyAuthMiddleware = async function(req, res, next) {
    try {
        if (!req.query.token) {
            throw 'Missing JWT token.';
        }

        const data = decode(req.query.token);

        if (!data.apiKey || !data.workspace || !data.uid) {
            throw 'Invalid JWT token';
        }

        const user = await getUser(data.uid);

        if (!user.exists || decrypt(user.data().apiKey) != data.apiKey) {
            throw new functions.https.HttpsError('unauthenticated', 'Failed authentication');
        }

        const workspace = await getWorkspaceByName(user.id, data.workspace);

        res.locals.uid = user.id;
        res.locals.workspace = { rpcServer: workspace.rpcServer, name: workspace.name };

        next();
    } catch(error) {
        console.log(error);
        res.status(401).json({
            message: error
        });
    }
}

app.use(rewriterMiddleware);

app.post('/webhooks/alchemy', alchemyAuthMiddleware, async (req, res) => {
    try {
        if (!req.body.fullTransaction) {
            throw 'Missing transaction.';
        }

        const provider = new ethers.providers.JsonRpcProvider(res.locals.workspace.rpcServer);
        const transaction = await provider.getTransaction(req.body.fullTransaction.hash);

        const block = await provider.getBlock(transaction.blockHash);

        const blockData = stringifyBns(sanitize({
            hash: block.hash,
            parentHash: block.parentHash,
            number: block.number,
            timestamp: block.timestamp,
            nonce: block.nonce,
            difficulty: block.difficulty,
            gasLimit: block.gasLimit,
            gasUsed: block.gasUsed,
            miner: block.miner,
            extraData: block.extraData
        }));

        const storeBlockPromise = storeBlock(res.locals.uid, res.locals.workspace.name, blockData);
        
        const transactionReceipt = await provider.getTransactionReceipt(transaction.hash);

        const txSynced = getTxSynced(res.uid, res.locals.workspace.name, transaction, transactionReceipt, moment(req.body.timestamp).unix());

        const storeTransactionPromise = storeTransaction(res.locals.uid, res.locals.workspace.name, txSynced);

        await Promise.all([storeBlockPromise, storeTransactionPromise]);

        res.send({
            success: true
        });
    } catch(error) {
        console.log(error);
        res.status(401).json({
            message: error
        });
    }
});

module.exports = app;
