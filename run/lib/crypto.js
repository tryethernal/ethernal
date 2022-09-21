const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

module.exports = {
    encrypt: (data) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

        let encryptedData = cipher.update(data);
        encryptedData = Buffer.concat([encryptedData, cipher.final()]);

        return iv.toString('hex') + ':' + encryptedData.toString('hex');
    },
    decrypt: (data) => {
        const textParts = data.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');

        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        decipher.setAutoPadding(false);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    },
    encode: (data) => {
        const jwtSecret = process.env.ENCRYPTION_JWT_SECRET;
        return jwt.sign(data, jwtSecret);
    },
    decode: (token) => {
        const jwtSecret = process.env.ENCRYPTION_JWT_SECRET;
        return jwt.verify(token, jwtSecret);
    }
};
