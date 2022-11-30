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
const jobs = require('./jobs');

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
app.use(express.urlencoded({ extended: true }));

if (process.env.CORS_DOMAIN)
    app.use(cors({ origin: process.env.CORS_DOMAIN, methods: ['GET', 'POST', 'OPTIONS'] }));


const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bull');
createBullBoard({
    queues: Object.values(queues).map(queue => new BullMQAdapter(queue)),
    serverAdapter: serverAdapter,
});

app.use('/api', api);
app.use('/webhooks', webhooks);

app.use('/bull', bullboardMiddlewere, serverAdapter.getRouter());

module.exports = app;
