const { getSentryDsn } = require('./lib/env');
require('./instrument');
const express = require('express');
const app = express();

const { initializeApp } = require('firebase-admin/app');

const cors = require('cors');

const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

const bullboardMiddleware = require('./middlewares/bullboard');
const queues = require('./queues');

const api = require('./api');
const { etherscanDispatcher, dispatchTable } = require('./lib/etherscanDispatch');
const webhooks = require('./webhooks');

require('./scheduler');

initializeApp();

app.set('trust proxy', true);

app.use(express.json({
    limit: '25mb',
    verify: function(req, res, buf) {
        var url = req.originalUrl;
        if (url.startsWith('/webhooks/stripe')) {
            req.rawBody = buf.toString()
        }
    }
}));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'] }));

app.use(etherscanDispatcher);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bull');
createBullBoard({
    queues: Object.values(queues).map(queue => new BullMQAdapter(queue)),
    serverAdapter: serverAdapter,
});

app.use('/api', api);
app.use('/webhooks', webhooks);

app.use('/bull', bullboardMiddleware, serverAdapter.getRouter());

if (getSentryDsn()) {
    const Sentry = require('@sentry/node');
    Sentry.setupExpressErrorHandler(app);
}

module.exports = app;
module.exports.etherscanDispatch = dispatchTable;
