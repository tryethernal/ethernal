const functions = require('firebase-functions');
const uuidAPIKey = require('uuid-apikey');

const { storeApiKey, setUserData } = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');

const stripe = require('stripe')(functions.config().stripe.secret_key);

exports.generateKeyForNewUser = async (snap, context) => {
    try {
        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        await storeApiKey(snap.id, encryptedKey);

        return true;
    } catch (error) {
        console.log(error);
    }
};

exports.onCreateUser = async (user) => {
    try {
        const customer = await stripe.customers.create({
            email: user.email
        });

        await setUserData(user.uid, {
            stripeCustomerId: customer.id,
            plan: 'free'
        });

        return true;
    } catch (error) {
        console.log(error);
    }
};
