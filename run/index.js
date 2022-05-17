const { initializeApp } = require('firebase-admin/app');
const express = require('express');
const cors = require('cors');

const api = require('./api');
const tasks = require('./tasks');

initializeApp();
const app = express();

app.use(express.json());
app.use(cors({ origin: 'http://app.antoine.local:8081' }));

app.use('/api', api);
app.use('/tasks', tasks);

const port = parseInt(process.env.PORT) || 6000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
