const express = require('express');
const app = express();
const pm2 = require('./lib/pm2.js');

const bodyParser = require('body-parser')
app.use(bodyParser.json());

const commands = ['stop', 'reload', 'restart', 'delete'];

const secretMiddleware = (req, res, next) => {
    if (req.query.secret == process.env.SECRET)
        next();
    else
        return res.status(401).send('Invalid secret');
};

const handleError = (res, error) => {
    console.log(error);
    return res.status(400).send(error.message);
};

app.get('/processes', secretMiddleware, async (req, res) => {
    try {
        const processes = await pm2.list()

        return res.status(200).send(processes);
    } catch(error) {
        handleError(res, error);
    }
});

app.get('/processes/:slug', secretMiddleware, async (req, res) => {
    const data = req.params;

    try {
        if (!data.slug)
            throw new Error('Missing parameter');

        const pm2Process = await pm2.show(data.slug);

        return res.status(200).send(pm2Process);
    } catch(error) {
        handleError(res, error);
    }
});

app.post('/processes/:slug/:command', secretMiddleware, async (req, res) => {
    const data = { ...req.body, ...req.params };

    try {
        if (!data.slug || !data.command)
            throw new Error('Missing parameter');

        if (commands.indexOf(data.command) == -1)
            throw new Error('Invalid command');

        const pm2Process = await pm2[data.command](data.slug);

        return res.status(200).send(pm2Process);
    } catch(error) {
        handleError(res, error);
    }
});

app.post('/processes', secretMiddleware, async (req, res) => {
    const data = req.body;

    try {
        if (!data.slug || !data.workspace || !data.apiToken)
            throw new Error('Missing parameter');

        const existingProcess = await pm2.show(data.slug);

        if (existingProcess)
            return res.sendStatus(200);

        const pm2Process = await pm2.start(data.slug, data.workspace, data.apiToken);

        return res.status(200).send(pm2Process);
    } catch(error) {
        handleError(res, error);
    }
});

module.exports = app;
