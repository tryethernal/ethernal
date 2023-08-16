const pm2 = require('pm2');

const list = () => {
    return new Promise((resolve, reject) => {
        pm2.connect(error => {
            if (error) reject(new Error(error));
            
            pm2.list((error, processes) => {
                if (error) reject(new Error(error));

                resolve(processes);
            });
        });
    });
};

const show = (slug) => {
    return new Promise((resolve, reject) => {
        if (!slug) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            pm2.describe(slug, (error, process) => {
                if (error) reject(new Error(error));

                resolve(process[0]);
            });
        });
    });
};

const stop = (slug) => {
    return new Promise((resolve, reject) => {
        if (!slug) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            pm2.stop(slug, (error) => {
                if (error) reject(new Error(error));

                pm2.describe(slug, (error, process) => {
                    if (error) reject(new Error(error));

                    resolve(process[0]);
                });
            });
        });
    });
};

const reload = (slug) => {
    return new Promise((resolve, reject) => {
        if (!slug) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            pm2.reload(slug, (error) => {
                if (error) reject(new Error(error));

                pm2.describe(slug, (error, process) => {
                    if (error) reject(new Error(error));

                    resolve(process[0]);
                });
            });
        });
    });
};

const restart = (slug) => {
    return new Promise((resolve, reject) => {
        if (!slug) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            pm2.restart(slug, (error) => {
                if (error) reject(new Error(error));

                pm2.describe(slug, (error, process) => {
                    if (error) reject(new Error(error));

                    resolve(process[0]);
                });
            });
        });
    });
};

const _delete = (slug) => {
    return new Promise((resolve, reject) => {
        if (!slug) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            pm2.delete(slug, (error) => {
                if (error) {
                    if (error.message == 'process or namespace not found')
                        resolve();
                    else
                        reject(new Error(error));
                }

                resolve();
            });
        });
    });
};

const start = (slug, workspaceId) => {
    return new Promise((resolve, reject) => {
        if (!slug || !workspaceId) reject(new Error('Missing parameter'));

        pm2.connect(error => {
            if (error) reject(new Error(error));

            const options = {
                name: slug,
                script: 'ethernal-light',
                args: String(workspaceId),
                interpreter: 'none',
                log_type: 'json'
            };

            pm2.start(options, (error) => {
                if (error) reject(new Error(error));

                pm2.describe(slug, (error, process) => {
                    if (error) reject(new Error(error));

                    resolve(process[0]);
                });
            });
        });
    });
};

module.exports = { list, show, stop, reload, restart, delete: _delete, start };
