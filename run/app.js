const { initializeApp } = require('firebase-admin/app');
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middlewares/auth');

const api = require('./api');
const tasks = require('./tasks');
const webhooks = require('./webhooks');

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
    app.use(cors({ origin: process.env.CORS_DOMAIN }));
    
app.use('/api', api);
app.use('/tasks', tasks);
app.use('/webhooks', webhooks);

module.exports = app;
