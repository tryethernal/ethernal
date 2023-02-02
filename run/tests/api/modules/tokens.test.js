require('../../mocks/lib/firebase');
const db = require('../../../lib/firebase');

const { holderHistory, cumulativeSupply, transferVolume, holders, transfers } = require('../../../api/modules/tokens');

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

describe('cumulativeSupply', () => {
    it('Should return the supply', async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
                from: 'from',
                to: 'to'
            }
        };
        jest.spyOn(db, 'getTokenCumulativeSupply').mockResolvedValue({ volume: 3, address: '0x123' });

        await cumulativeSupply(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ volume: 3, address: '0x123' });
    });

    it('should return an error if missing param', async () => {
        const req = {
            query: {
                workspace: 'hardhat',
                from: 'from',
            }
        };
        jest.spyOn(db, 'getTokenCumulativeSupply').mockResolvedValue({ volume: 3, address: '0x123' });

        await holderHistory(req, res)
        expect(status).toHaveBeenCalledWith(400)
        expect(send).toHaveBeenCalledWith('Missing parameters.');
    });
});

describe('transferVolume', () => {
    it('Should return the volume',  async () => {
        const req = {
            params: { address: '0x123' },
            query: {
                workspace: 'hardhat',
                from: 'from',
                to: 'to'
            }
        };
        jest.spyOn(db, 'getTokenTransferVolume').mockResolvedValue({ volume: 3, address: '0x123' });

        await transferVolume(req, res)
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ volume: 3, address: '0x123' });
    });

    it('should return an error if missing param', async () => {
        const req = {
            query: {
                workspace: 'hardhat',
                from: 'from',
            }
        };
        jest.spyOn(db, 'getTokenTransferVolume').mockResolvedValue({ volume: 3, address: '0x123' });

        await transferVolume(req, res)
        expect(status).toHaveBeenCalledWith(400)
        expect(send).toHaveBeenCalledWith('Missing parameters.');
    });
});

describe('holders', () => {
    it('Should return holders', () => {

    });

    it('should return an error if missing param', () => {

    });
});

describe('transfers', () => {
    it('Should return transfers', () => {

    });

    it('should return an error if missing param', () => {

    });
});
