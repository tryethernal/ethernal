/*
    Simple auth strategy that takes an email & password as an input,
    checks that it matches the stored hashed password and call the
    callback function.
    We use the firebase hashing function for backward compatibility
    with Firebase Auth
*/

const { firebaseVerify } = require('../../lib/crypto');
const db = require('../../lib/firebase');

module.exports = async (email, password, cb) => {
    const user = await db.getUserByEmail(email);

    if (!user)
        return cb(null, false, { message: 'Invalid email or password.' });

    const isPasswordValid = firebaseVerify(password, user.passwordSalt, user.passwordHash);

    if (!isPasswordValid)
        return cb(null, false, { message: 'Invalid email or password.' });

    return cb(null, user);
};
