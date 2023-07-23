const express = require('express');
const app = express();
const pm2 = require('pm2');

const bodyParser = require('body-parser')
app.use(bodyParser.json());

const commands = ['stop', 'reload', 'restart', 'delete'];

const secretMiddleware = (req, res, next) => {
    if (req.query.secret == process.env.SECRET)
        next();
    else
        return res.sendStatus(401);
};

const handleError = (res, error) => {
    console.log(error);
    return res.status(400).send(error.message);
}

app.get('/processes', secretMiddleware, (req, res) => {
    try {
        pm2.connect(error => {
            if (error)
                return handleError(res, error)

            pm2.list((error, processes) => {
                if (error)
                    return handleError(res, error);

                return res.status(200).send(processes);
            })
        });
    } catch(error) {
        handleError(res, error);
    }
});

app.get('/processes/:slug', secretMiddleware, (req, res) => {
    const data = req.params;

    try {
        if (!data.slug)
            throw new Error('Missing parameter');

        pm2.connect(error => {
            if (error)
                return handleError(res, error);

            pm2.describe(data.slug, (error, process) => {
                if (error)
                    return handleError(res, error);

                return res.status(200).send(process[0]);
            });
        });
    } catch(error) {
        handleError(res, error);
    }
});

app.post('/processes/:slug/:command', secretMiddleware, (req, res) => {
    const data = { ...req.body, ...req.params };

    try {
        if (!data.slug || !data.command)
            throw new Error('Missing parameter');

        if (commands.indexOf(data.command) == -1)
            throw new Error('Invalid command');

        pm2.connect(error => {
            if (error)
                return handleError(res, error);

            pm2[data.command](data.slug, (error, _) => {
                if (error) {
                    if (error.message == 'process or namespace not found' && data.command == 'delete')
                        return res.sendStatus(200);
                    else
                        return handleError(res, error);
                }

                pm2.describe(data.slug, (error, process) => {
                    if (error)
                        return handleError(res, error);

                    return res.status(200).send(process[0]);
                });
            });
        });
    } catch(error) {
        handleError(res, error);
    }
});

app.post('/processes', secretMiddleware, (req, res) => {
    const data = req.body;

    try {
        if (!data.apiToken || !data.slug || !data.workspace)
            throw new Error('Missing parameter');

        pm2.connect(error => {
            if (error)
                return handleError(res, error);

            const options = {
                name: data.slug,
                script: 'ethernal',
                args: `listen -s -w ${data.workspace}`,
                interpreter: 'none',
                log_type: 'json',
                env: {
                    ETHERNAL_API_TOKEN: data.apiToken,
                    NODE_ENV: process.env.NODE_ENV || 'development',
                    ETHERNAL_API_ROOT: process.env.ETHERNAL_HOST
                }
            };

            pm2.start(options, (error, _) => {
                if (error)
                    return handleError(res, error);

                pm2.describe(data.slug, (error, process) => {
                    if (error)
                        return handleError(res, error);

                    return res.status(200).send(process[0]);
                });
            });
        });
    } catch(error) {
        handleError(res, error);
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`App is listening on port ${process.env.PORT}`)
});