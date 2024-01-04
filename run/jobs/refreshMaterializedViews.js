const models = require('../models');

const ALLOWED_MVS = ['transaction_volume_14d', 'wallet_volume_14d', 'token_holder_count_14d', 'token_transfer_volume_14d', 'token_circulating_supply_14d'];

module.exports = job => {
    const view  = job.data.view;

    if (ALLOWED_MVS.indexOf(view) == -1)
        return 'Invalid view';
    
    return models.sequelize.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}";`);
};
