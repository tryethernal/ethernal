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

app.use((req, res, next) => {
    if (req.path != '/api')
        return next();

    const data = { ...req.query, ...req.body };

    if (data.module == 'contract' && data.action == 'verifysourcecode')
        req.url = '/api/contracts/verify';
    else if (data.module == 'contract' && data.action == 'getsourcecode')
        req.url = '/api/contracts/sourceCode';
    else if (req.query.module == 'contract' && req.query.action == 'getabi')
        req.url = '/api/contracts/getabi';
    else if (data.module == 'contract' && data.action == 'checkverifystatus' && data.guid)
        req.url = '/api/contracts/verificationStatus';

    next();
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bull');

// Only include critical queues in BullBoard to prevent N+1 query pattern
// Previously all 60+ queues caused individual Redis hexists calls
const criticalQueues = [
    'blockSync',
    'receiptSync',
    'processBlock',
    'processContract',
    'processTokenTransfer',
    'queueMonitoring',
    'processHistoricalBlocks'
];

const bullBoardQueues = criticalQueues
    .filter(queueName => queues[queueName])
    .map(queueName => new BullMQAdapter(queues[queueName]));

createBullBoard({
    queues: bullBoardQueues,
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
