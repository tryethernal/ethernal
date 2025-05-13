const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getEncryptionKey, getEncryptionJwtSecret, getFirebaseSignerKey, getFirebaseSaltSeparator, getFirebaseRounds, getFirebaseMemCost } = require('./env');
const { FirebaseScrypt } = require('firebase-scrypt');
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const firebaseParameters = {
    algorithm: 'SCRYPT',
    signerKey: getFirebaseSignerKey(),
    saltSeparator: getFirebaseSaltSeparator(),
    rounds: getFirebaseRounds(),
    memCost: getFirebaseMemCost(),
};

module.exports = {
    encrypt: (data) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);

        let encryptedData = cipher.update(data);
        encryptedData = Buffer.concat([encryptedData, cipher.final()]);

        return iv.toString('hex') + ':' + encryptedData.toString('hex');
    },
    decrypt: (data) => {
        const textParts = data.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');

        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(getEncryptionKey()), iv);
        decipher.setAutoPadding(false);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    },
    encode: (data) => {;
        return jwt.sign(data, getEncryptionJwtSecret());
    },
    decode: (token) => {
        return jwt.verify(token, getEncryptionJwtSecret());
    },
    firebaseHash: async (password) => {
        const salt = crypto.randomBytes(12).toString('base64');
        const scrypt = new FirebaseScrypt(firebaseParameters);
        const passwordHash = await scrypt.hash(password, salt);
        return {
            passwordHash: passwordHash,
            passwordSalt: salt
        };
    },
    firebaseVerify: (password, salt, hash) => {
        if (hash.startsWith('fakeHash')) {
            const unhashedPassword = hash.split('password=')[1];
            return unhashedPassword === password;
        }

        const scrypt = new FirebaseScrypt(firebaseParameters);
        return scrypt.verify(password, salt, hash);
    }
};
