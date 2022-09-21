const { encrypt, decrypt, encode, decode } = require('../../lib/crypto');

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
