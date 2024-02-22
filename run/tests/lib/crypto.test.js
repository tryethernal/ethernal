jest.mock('firebase-scrypt', () => ({
    FirebaseScrypt: function() {
        return {
            hash: jest.fn().mockResolvedValue('passwordHash'),
            verify: jest.fn().mockReturnValue(true)
        }
    }
}));
require('../mocks/lib/env');
const { encrypt, decrypt, encode, decode, firebaseHash, firebaseVerify } = require('../../lib/crypto');

const ENCRYPTED_KEY = '35748972c841784ea4b296af98f7d01e:628cfc5964f00d912c059335095d51d5c59c12dfcd01138574ba521b1c1a7c90';
const ENCODED_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.dG9rZW4.zVOssVuePIMzY1QVPngc-rbf9PiHRXoaJJWpWa1IMAw';

describe('encrypt', () => {
    it('Should return the encrypted string', async () => {
        expect(encrypt('secretstuff')).toBeTruthy();
    });
});

describe('decrypt', () => {
    it('Should return the decrypted string', async () => {
        expect(decrypt(ENCRYPTED_KEY).slice(0, 31)).toEqual('GT8P7FD-R2M4SCG-GPCYE58-8FC1969');
    });
});

describe('encode', () => {
    it('Should return the encoded string', async () => {
        expect(encode('token')).toEqual(ENCODED_API_TOKEN);
    });
});

describe('decode', () => {
    it('Should return the decoded string', async () => {
        expect(decode(ENCODED_API_TOKEN)).toEqual('token');
    })
});

describe('firebaseHash', () => {
    it('Should return a password and a hash', async () => {
        firebaseHash('password').then(result => {
            expect(result).toEqual({ passwordHash: 'passwordHash', passwordSalt: expect.anything() });
        });
    });
});

describe('firebaseVerify', () => {
    it('Should validate production firebase hash', (done) => {
        expect(firebaseVerify('password', 'salt', 'hash')).toEqual(true);
        done();
    });

    it('Should validate emulator firebase hash if valid', (done) => {
        expect(firebaseVerify('password', 'salt', 'fakeHash;password=password')).toEqual(true);
        done();
    });

    it('Should invalidate emulator firebase hash if invalid', (done) => {
        expect(firebaseVerify('password', 'salt', 'fakeHash;password=notpassword')).toEqual(false);
        done();
    });
});