const { initializeApp } = require('firebase-admin/app');
const authMiddleware = require('./middlewares/auth');
const express = require('express');
const cors = require('cors');

const api = require('./api');
const tasks = require('./tasks');

initializeApp();
const app = express();

app.use(express.json({ limit: '25mb' }));
if (process.env.CORS_DOMAIN)
    app.use(cors({ origin: process.env.CORS_DOMAIN }));
    
app.use('/api', api);
app.use('/tasks', tasks);

module.exports = app;
