const uuidAPIKey = require('uuid-apikey');

const { storeApiKey } = require('../lib/firebase');
const { encrypt } = require('../lib/crypto');

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
