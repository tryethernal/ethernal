require('../mocks/lib/queue');
require('../mocks/lib/rpc');
require('../mocks/lib/lock');
require('../mocks/lib/utils');
require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');
const workspaceAuth = require('../../middlewares/workspaceAuth');
const { ProviderConnector, WalletConnector } = require('../../lib/rpc');
const { validateBNString } = require('../../lib/utils');
const Lock = require('../../lib/lock');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/faucets';

beforeEach(() => {
    jest.clearAllMocks();
});

describe(`GET ${BASE_URL}/:id/transactionHistory`, () => {
    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/transactionHistory?from=2024-06-01&to=2024-06-10`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should return transaction history', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getFaucetTransactionHistory').mockResolvedValueOnce({ rows: [{ hash: '0x123' }], count: 1 });
        request.get(`${BASE_URL}/1/transactionHistory?from=2024-06-01&to=2024-06-10`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ transactions: [{ hash: '0x123' }], count: 1 });
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/tokenVolume`, () => {
    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/tokenVolume?from=2024-06-01&to=2024-06-10`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should return token volume', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getFaucetTokenVolume').mockResolvedValueOnce([{ amount: String(1 ** 18), date: '20124-06-10' }]);
        request.get(`${BASE_URL}/1/tokenVolume?from=2024-06-01&to=2024-06-10`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ amount: String(1 ** 18), date: '20124-06-10' }]);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/requestVolume`, () => {
    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/requestVolume?from=2024-06-01&to=2024-06-10`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should return request volume', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(db, 'getFaucetRequestVolume').mockResolvedValueOnce([{ count: 4, date: '20124-06-10' }]);
        request.get(`${BASE_URL}/1/requestVolume?from=2024-06-01&to=2024-06-10`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ count: 4, date: '20124-06-10' }]);
                done();
            });
    });
});

describe(`DELETE ${BASE_URL}/:id`, () => {
    it('Should delete the faucet and return 200', (done) => {
        jest.spyOn(db, 'deleteFaucet').mockResolvedValueOnce();
        request.delete(`${BASE_URL}/1`)
            .expect(200)
            .then(() => {
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/privateKey`, () => {
    it('Should throw an error if not faucet admin', (done) => {
        jest.spyOn(db, 'ownFaucet').mockResolvedValueOnce(false);
        request.get(`${BASE_URL}/1/privateKey`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should throw an error if could not get private key', (done) => {
        jest.spyOn(db, 'ownFaucet').mockResolvedValueOnce(true);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/privateKey`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not get private key. Please retry.');
                done();
            });
    });

    it('Should return a 200 and private key', (done) => {
        jest.spyOn(db, 'ownFaucet').mockResolvedValueOnce(true);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce('0x123');
        request.get(`${BASE_URL}/1/privateKey`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ privateKey: '0x123' });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/:id/drip`, () => {
    it('Should throw an error if faucet does not exists', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce(null);
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should throw an error if faucet is not active', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: false });
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should throw an error if cooldown is not finished', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown').mockResolvedValueOnce(120);
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Too soon to claim more tokens for this address. Try again in 2 hours.');
                done();
            });
    });

    it('Should throw an error if there is already a request being processed for this address', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown').mockResolvedValueOnce(0);
        Lock.mockImplementationOnce(() => ({
            acquire: jest.fn().mockResolvedValue(false)
        }));
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('We are still processing a request for this address. Please try again in a few seconds.');
                done();
            });
    });

    it('Should throw an error if could not obtain faucet private key', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown').mockResolvedValueOnce(0);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce(null);
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not obtain faucet private key. Please retry.');
                done();
            });
    });

    it('Should throw an error if unsuficient funds in the faucet', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown').mockResolvedValueOnce(0);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce('0x123');
        WalletConnector.mockImplementationOnce(() => ({
            send: jest.fn().mockRejectedValue({ code: 'INSUFFICIENT_FUNDS' })
        }));
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Insufficient funds. Refill the faucet and try again.');
                done();
            });
    });

    it('Should throw an error if could not obtain tx hash', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown').mockResolvedValueOnce(0);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce('0x123');
        WalletConnector.mockImplementationOnce(() => ({
            send: jest.fn().mockResolvedValue({})
        }));
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual("Couldn't create transaction. Please retry.");
                done();
            });
    });

    it('Should send tokens and return tx hash & cooldown', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: true });
        jest.spyOn(db, 'getFaucetCooldown')
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(120);
        jest.spyOn(db, 'getFaucetPrivateKey').mockResolvedValueOnce('0x123');
        request.post(`${BASE_URL}/1/drip`)
            .send({ data: { address: '0x123' }})
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ hash: '0x123', cooldown: 120 });
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/deactivate`, () => {
    it('Should deactivate the faucet', (done) => {
        request.put(`${BASE_URL}/1/deactivate`)
            .expect(200)
            .then(() => {
                expect(db.deactivateFaucet).toHaveBeenCalledWith('123', '1');
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id/activate`, () => {
    it('Should activate the faucet', (done) => {
        request.put(`${BASE_URL}/1/activate`)
            .expect(200)
            .then(() => {
                expect(db.activateFaucet).toHaveBeenCalledWith('123', '1');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/:id/balance`, () => {
    it('Should throw an error if faucet does not exist', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce(null);
        request.get(`${BASE_URL}/1/balance`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should throw an error if faucet is inactive & not an admin', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({ active: false });
        request.get(`${BASE_URL}/1/balance`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Could not find faucet');
                done();
            });
    });

    it('Should return faucet balance if inactive but admin', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({
            active: false,
            address: '0x123',
            explorer: { workspace: { rpcServer: 'rpc.com' }}
        });

        workspaceAuth.mockImplementationOnce((req, res, next) => {
            req.query.authenticated = true;
            req.query.firebaseUserId = '123';
            req.query.workspace = { id: 1, name: 'My Workspace' }
            next();
        });
        ProviderConnector.mockImplementationOnce(() => ({
            getBalance: jest.fn().mockResolvedValueOnce('1234')
        }));

        request.get(`${BASE_URL}/1/balance`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ balance: '1234' });
                done();
            });
    });

    it('Should return faucet balance', (done) => {
        jest.spyOn(db, 'getFaucet').mockResolvedValueOnce({
            active: true,
            address: '0x123',
            explorer: { workspace: { rpcServer: 'rpc.com' }}
        });
        ProviderConnector.mockImplementationOnce(() => ({
            getBalance: jest.fn().mockResolvedValueOnce('1234')
        }));

        request.get(`${BASE_URL}/1/balance`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ balance: '1234' });
                done();
            });
    });
});

describe(`PUT ${BASE_URL}/:id`, () => {
    it('Should update the faucet and return a 200', (done) => {
        request.put(`${BASE_URL}/1`)
            .send({ data: { amount: String(1 ** 18), interval: 48 * 60 }})
            .expect(200)
            .then(() => {
                expect(db.updateFaucet).toHaveBeenCalledWith('123', '1', String(1 ** 18), 48 * 60);
                done();
            });
    });

    it('Should throw an error if amount is invalid', (done) => {
        validateBNString.mockReturnValueOnce(false);
        request.put(`${BASE_URL}/1`)
            .send({ data: { amount: '-1', interval: 48 * 60 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid amount.');
                done();
            });
    });

    it('Should throw an error if interval is invalid', (done) => {
        request.put(`${BASE_URL}/1`)
            .send({ data: { amount: String(1 ** 18), interval: -1 }})
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Interval must be greater than zero.');
                done();
            });
    });
});