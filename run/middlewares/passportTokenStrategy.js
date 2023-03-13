/*
    This sets up the middleware used for token auth
    The actually code is in strategies/token.js to make it easier to unit test
*/

const passport = require('passport');
const CustomStrategy = require('passport-custom');
const tokenStrategy = require('./strategies/token');

const strategy = new CustomStrategy(tokenStrategy);

passport.use('token', strategy);

module.exports = passport.authenticate('token', { session: false });
