const express = require('express');
const cls = require('cls-hooked');
const app = express();
const { ProviderConnector } = require('../lib/rpc');
const { sanitize, stringifyBns } = require('../lib/utils');

let config, sequelize, db, Sequelize, models, transactionsLib;
async function loadSequelize() {
    const env = process.env.NODE_ENV || 'development';
    config = config || require(__dirname + '/../config/database.js')[env];
    Sequelize = Sequelize || require('sequelize');
    const namespace = cls.createNamespace('my-very-own-namespace');
    Sequelize.useCLS(namespace);
    
    const sequelize = new Sequelize(config.database, config.username, config.password, {
        dialect: 'postgres',
        host: config.host,
        port: config.port,
        pool: {
            max: 1,
            min: 0,
            acquire: 3000,
            idle: 0,
            evict: 10000
        }
    });
    await sequelize.authenticate();
    
    return sequelize;
}

const psqlWrapper = async (cb, req, res) => {
    if (!sequelize) {
        sequelize = await loadSequelize();
    }
    else {
        sequelize.connectionManager.initPools();
        if (sequelize.connectionManager.hasOwnProperty("getConnection")) {
            delete sequelize.connectionManager.getConnection;
        }
    }
    try {
        models = models || require('../models')(sequelize);
        db = db || require('../lib/firebase')(models);
        transactionsLib = transactionsLib || require('../lib/transactions')(db);

        return await cb(req, res);
    } catch(error) {
        console.log(error);
    } finally {
        await sequelize.connectionManager.close();
    }
};

app.post('/tasks/blockSync', async (req, res) => {
    return await psqlWrapper(async () => {
        try {
            const data = req.body.data;
            if (!data.userId || !data.workspace || !data.blockNumber) {
                console.log(data);
                throw new functions.https.HttpsError('invalid-argument', '[blockSyncTask] Missing parameter.');
            }

            const workspace = await db.getWorkspaceByName(data.userId, data.workspace);
            const providerConnector = new ProviderConnector(workspace.rpcServer);

            const block = await providerConnector.fetchBlockWithTransactions(data.blockNumber);

            if (!block)
                throw `Couldn't find block #${data.blockNumber}`;

            const syncedBlock = sanitize(stringifyBns({ ...block, transactions: block.transactions.map(tx => stringifyBns(tx)) }));
            const storedBlock = await db.storeBlock(data.userId, data.workspace, syncedBlock);

            // if (storedBlock && block.transactions.length === 0)
            //     return publish('bill-usage', { userId: data.userId, timestamp: block.timestamp });
            
            // for (let i = 0; i < block.transactions.length; i++) {
            //     await enqueueTask('transactionSyncTask', {
            //         userId: data.userId,
            //         workspace: data.workspace,
            //         transaction: stringifyBns(block.transactions[i]),
            //         timestamp: block.timestamp
            //     })
            // }

            res.send(200);
        } catch(error) {
            console.log(error);
            res.send(400);
        }
    }, req, res);
});

app.post('/transactionSync', (req, res) => {
    const name = process.env.NAME || 'World';
    res.send(`Hello ${name}!`);
});

module.exports = app;