/**
 * @fileoverview Cryptographic utilities for encryption, JWT handling, and password hashing.
 * Uses AES-256-CBC for symmetric encryption and Firebase Scrypt for password hashing.
 * @module lib/crypto
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getEncryptionKey, getEncryptionJwtSecret, getFirebaseSignerKey, getFirebaseSaltSeparator, getFirebaseRounds, getFirebaseMemCost } = require('./env');
const { FirebaseScrypt } = require('firebase-scrypt');

/** @constant {string} Encryption algorithm */
const ALGORITHM = 'aes-256-cbc';
/** @constant {number} Initialization vector length in bytes */
const IV_LENGTH = 16;

/** Firebase Scrypt configuration parameters */
const firebaseParameters = {
    algorithm: 'SCRYPT',
    signerKey: getFirebaseSignerKey(),
    saltSeparator: getFirebaseSaltSeparator(),
    rounds: getFirebaseRounds(),
    memCost: getFirebaseMemCost(),
};

module.exports = {
    /**
     * Encrypts data using AES-256-CBC.
     *
     * @param {string} data - Plain text data to encrypt
     * @returns {string} Encrypted data as "iv:ciphertext" hex string
     */
    encrypt: (data) => {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getEncryptionKey()), iv);

        let encryptedData = cipher.update(data);
        encryptedData = Buffer.concat([encryptedData, cipher.final()]);

        return iv.toString('hex') + ':' + encryptedData.toString('hex');
    },

    /**
     * Decrypts AES-256-CBC encrypted data.
     *
     * @param {string} data - Encrypted data as "iv:ciphertext" hex string
     * @returns {string} Decrypted plain text
     */
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

    /**
     * Encodes data as a signed JWT token.
     *
     * @param {Object} data - Payload to encode
     * @returns {string} Signed JWT token
     */
    encode: (data) => {;
        return jwt.sign(data, getEncryptionJwtSecret());
    },

    /**
     * Decodes and verifies a JWT token.
     *
     * @param {string} token - JWT token to decode
     * @returns {Object} Decoded payload
     * @throws {Error} If token is invalid or expired
     */
    decode: (token) => {
        return jwt.verify(token, getEncryptionJwtSecret());
    },

    /**
     * Hashes a password using Firebase Scrypt algorithm.
     * Generates a random salt and returns both hash and salt.
     *
     * @param {string} password - Plain text password to hash
     * @returns {Promise<Object>} Hash result
     * @returns {string} returns.passwordHash - Scrypt hash of password
     * @returns {string} returns.passwordSalt - Random salt used
     */
    firebaseHash: async (password) => {
        const salt = crypto.randomBytes(12).toString('base64');
        const scrypt = new FirebaseScrypt(firebaseParameters);
        const passwordHash = await scrypt.hash(password, salt);
        return {
            passwordHash: passwordHash,
            passwordSalt: salt
        };
    },

    /**
     * Verifies a password against a Firebase Scrypt hash.
     * Supports fake hashes for development (format: "fakeHash:password=...")
     *
     * @param {string} password - Plain text password to verify
     * @param {string} salt - Salt used when hashing
     * @param {string} hash - Stored password hash
     * @returns {Promise<boolean>} True if password matches
     */
    firebaseVerify: (password, salt, hash) => {
        if (hash.startsWith('fakeHash')) {
            const unhashedPassword = hash.split('password=')[1];
            return unhashedPassword === password;
        }

        const scrypt = new FirebaseScrypt(firebaseParameters);
        return scrypt.verify(password, salt, hash);
    }
};
