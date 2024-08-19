// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require('@sentry/node');
const { getNodeEnv, getSentryDsn } = require('./lib/env');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: getSentryDsn(),
  environment: getNodeEnv() || 'development',
  integrations: [
    nodeProfilingIntegration(),
    Sentry.postgresIntegration
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const express = require('express');
const cors = require('cors');

const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');

const bullboardMiddlewere = require('./middlewares/bullboard');
const queues = require('./queues');

const api = require('./api');
const webhooks = require('./webhooks');

require('./scheduler');

initializeApp();
const app = express();

app.use(express.json({
    limit: '25mb',
    verify: function(req,res,buf) {
        var url = req.originalUrl;
        if (url.startsWith('/webhooks/stripe')) {
            req.rawBody = buf.toString()
        }
    }
}));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'] }));

if (process.env.NODE_ENV != 'production') {
    app.use((req, res, next) => {
        if (req.path != '/api')
            return next();

        if (req.body.module == 'contract' && req.body.action == 'verifysourcecode')
            req.url = '/api/contracts/verify';
        else if (req.query.module == 'contract' && req.query.action == 'getsourcecode' && req.query.apikey)
            req.url = '/api/contracts/sourceCode';
        else if (req.query.module == 'contract' && req.query.action == 'checkverifystatus' && req.query.apikey && req.query.guid)
            req.url = '/api/contracts/verificationStatus';

        next();
    });
}

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bull');
createBullBoard({
    queues: Object.values(queues).map(queue => new BullMQAdapter(queue)),
    serverAdapter: serverAdapter,
});

app.use('/api', api);
app.use('/webhooks', webhooks);

app.use('/bull', bullboardMiddlewere, serverAdapter.getRouter());

if (process.env.SERVE_FRONTEND) {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
}

module.exports = app;
