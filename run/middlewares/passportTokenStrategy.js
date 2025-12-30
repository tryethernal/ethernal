/**
 * @fileoverview Passport token strategy middleware.
 * Handles JWT token authentication via passport-custom.
 * @module middlewares/passportTokenStrategy
 */

const passport = require('passport');
const CustomStrategy = require('passport-custom');
const tokenStrategy = require('./strategies/token');

const strategy = new CustomStrategy(tokenStrategy);

passport.use('token', strategy);

module.exports = passport.authenticate('token', { session: false });
