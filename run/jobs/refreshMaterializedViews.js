const models = require('../models');

module.exports = () => {
    const sequelize = models.sequelize;

    const promises = [];
    promises.push(
        sequelize.query('REFRESH MATERIALIZED VIEW transaction_volume_14d'),
        sequelize.query('REFRESH MATERIALIZED VIEW wallet_volume_14d')
    );

    return Promise.allSettled(promises);
};
