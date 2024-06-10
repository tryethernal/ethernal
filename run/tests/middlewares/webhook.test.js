require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/lib/crypto');
const db = require('../../lib/firebase');
const crypto = require('../../lib/crypto');
const webhook = require('../../middlewares/webhook');

describe('webhookMiddleware', () => {
    it('Should call next if it is authorized', async () => {
        let res = {
            locals: {}
        };

        jest.spyOn(crypto, 'decode').mockReturnValueOnce({
            apiKey: '1234567',
            workspace: 'hardhat',
            uid: 'abcd'
        });
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ id: 1, apiKey: 'xxx' });
        jest.spyOn(crypto, 'decrypt').mockReturnValueOnce('1234567');
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({
            rpcServer: 'localhost',
            name: 'hardhat',
            alchemyIntegrationEnabled: true
        });
        
        const next = jest.fn();
        let req = {
            query: {
                token: 'abcd'
            }
        };

        await webhook(req, res, next);

        expect(res.locals).toEqual({
            uid: 'abcd',
            workspace: {
                name: 'hardhat',
                rpcServer: 'localhost'
            },
            integrations: ['alchemy']
        })
        expect(next).toHaveBeenCalled();
    });

    it('Should throw an error if no auth token', async() => {
        let req = {
            query: {}
        };
        let res = {
            locals: {},
            status: jest.fn({ send: jest.fn() })
        };
        const next = jest.fn();
        await expect(async () => {
            await webhook(req, res, next);
        }).rejects.toEqual(new Error('Missing auth token'));
    });

    it('Should throw an error if jwt token is invalid', async() => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({
            apiKey: '1234567',
            workspace: 'hardhat',
        });
        let req = {
            query: {
                token: 'abcd'
            }
        };
        const send = jest.fn();
        let res = {
            locals: {},
            status: jest.fn(() => ({ send: send }))
        };
        const next = jest.fn();
        await webhook(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith(new Error('Invalid auth token'));
    });

    it('Should throw an error if auth token is invalid', async() => {
        jest.spyOn(crypto, 'decode').mockReturnValueOnce({
            apiKey: '1234567',
            workspace: 'hardhat',
            uid: 'abcd'
        });
        jest.spyOn(crypto, 'decrypt').mockReturnValueOnce('xxx');
        let req = {
            query: {
                token: 'abcd'
            }
        };
        const send = jest.fn();
        let res = {
            locals: {},
            status: jest.fn(() => ({ send: send }))
        };
        const next = jest.fn();
        await webhook(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith(new Error('Invalid auth token'));
    });
});
