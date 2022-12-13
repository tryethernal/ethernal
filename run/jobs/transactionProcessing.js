const express = require('express');
const { processTransactions } = require('../lib/transactions');

module.exports = async job => {
    const data = job.data;

    if (!data.userId || !data.workspace || !data.transaction)
        throw new Error('Missing parameter.');

    return await processTransactions(data.userId, data.workspace, [data.transaction]);
};
