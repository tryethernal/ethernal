const { encrypt, decrypt, encode, decode } = require('../../lib/crypto');
const Helper = require('../helper');

const ENCRYPTED_KEY = 'a12fcf9289bf85dea1b50f2c8c941e12:0b3eef87b4b4faf01bfe775ddd238900a460c9f8afd33b66f44157e90d24c7d8';
const ENCODED_ENCRYPTED_KEY = 'eyJhbGciOiJIUzI1NiJ9.YTEyZmNmOTI4OWJmODVkZWExYjUwZjJjOGM5NDFlMTI6MGIzZWVmODdiNGI0ZmFmMDFiZmU3NzVkZGQyMzg5MDBhNDYwYzlmOGFmZDMzYjY2ZjQ0MTU3ZTkwZDI0YzdkOA.BDdEkTowTz7pCmiHg6mIGKIHRRzEELv0ZzzcSOj1eqc';

describe('encrypt', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return the encrypted string', async () => {
        expect(encrypt('secretstuff')).toBeTruthy();
    });
});

describe('decrypt', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return the decrypted string', async () => {
        expect(decrypt(ENCRYPTED_KEY)).toEqual('GT8P7FD-R2M4SCG-GPCYE58-8FC1969');
    });
});

describe('encode', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return the encoded string', async () => {
        expect(encode(ENCRYPTED_KEY)).toEqual(ENCODED_ENCRYPTED_KEY);
    });
});

describe('decode', () => {
    beforeEach(() => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
    });

    it('Should return the decoded string', async () => {
        expect(decode(ENCODED_ENCRYPTED_KEY)).toEqual('a12fcf9289bf85dea1b50f2c8c941e12:0b3eef87b4b4faf01bfe775ddd238900a460c9f8afd33b66f44157e90d24c7d8');
    })
});
