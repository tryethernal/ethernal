require('../../mocks/models');
require('../../mocks/lib/firebase');
const db = require('../../../lib/firebase');

const { holderHistory, circulatingSupply, holders, transfers } = require('../../../api/modules/tokens');

beforeEach(() => jest.clearAllMocks());

const json = jest.fn();
const send = jest.fn();
const status = jest.fn(() => ({ json, send }));
const res = { status };

describe('holderHistory', () => {
    it('Should return the history', async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
                from: 'from',
                to: 'to'
            }
        };
        jest.spyOn(db, 'getTokenHolderHistory').mockResolvedValue({ amount: 3, address: '0x123' });

        await holderHistory(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ amount: 3, address: '0x123' });
    });

    it('should return an error if missing param', async () => {
        const req = {
            baseUrl: '/',
            route: { path: '/ok' },
            query: {
                workspace: 'hardhat',
                from: 'from',
            }
        };
        jest.spyOn(db, 'getTokenHolderHistory').mockResolvedValue({ amount: 3, address: '0x123' });

        await holderHistory(req, res)
        expect(status).toHaveBeenCalledWith(400)
        expect(send).toHaveBeenCalledWith('Missing parameters.');
    });
});

describe('circulatingSupply', () => {
    it('Should return the supply', async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
                from: 'from',
                to: 'to'
            }
        };
        jest.spyOn(db, 'getTokenCirculatingSupply').mockResolvedValue({ volume: 3, address: '0x123' });

        await circulatingSupply(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ volume: 3, address: '0x123' });
    });

    it('should return an error if missing param', async () => {
        const req = {
            baseUrl: '/',
            route: { path: '/ok' },
            query: {
                workspace: 'hardhat',
                from: 'from',
            }
        };
        jest.spyOn(db, 'getTokenCirculatingSupply').mockResolvedValue({ volume: 3, address: '0x123' });

        await holderHistory(req, res)
        expect(status).toHaveBeenCalledWith(400)
        expect(send).toHaveBeenCalledWith('Missing parameters.');
    });
});

describe('holders', () => {
    it('Should return holders', async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
            }
        };
        jest.spyOn(db, 'getTokenHolders').mockResolvedValue({ total: 1, items: [{ id: 1 }]});

        await holders(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ total: 1, items: [{ id: 1 }]});
    });
});

describe('transfers', () => {
    it('Should return transfers & count',  async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
            }
        };
        jest.spyOn(db, 'getTokenTransfers').mockResolvedValue({ total: 1, items: [{ id: 1 }]});

        await transfers(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ total: 1, items: [{ id: 1 }]});
    });
});
