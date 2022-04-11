const { Sequelize, Model, DataTypes } = require('sequelize');
const { Workspace, User } = require('../models');

const sequelize = new Sequelize({ dialect: 'postgres' });

module.exports = {
    createUser(firebaseUserId, apiKey, stripeCustomerId, plan) {
        if (!firebaseUserId || !apiKey || !stripeCustomerId || !plan) throw '[db.createUser] Missing parameter';

        return User.create({
            firebaseUserId: firebaseUserId,
            apiKey: apiKey,
            stripeCustomerId: stripeCustomerId,
            plan: plan
        });
    },
};