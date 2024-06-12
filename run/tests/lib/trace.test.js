require('../mocks/models');
require('../mocks/lib/firebase');

const { parseTrace,  processTrace } = require('../../lib/trace');
const db = require('../../lib/firebase');
const Trace = require('../fixtures/Trace.json');

afterEach(() => jest.clearAllMocks());

describe('processTrace', () => {
    it('Should add the contract if user can sync', async () => {
         jest.spyOn(db, 'canUserSyncContract')
            .mockResolvedValueOnce(true);

        const result = await processTrace('123', 'hardhat', '0x123', [{ op: 'CALL', address: '0x12345', contractHashedBytecode: '0x' }], db);

        expect(db.canUserSyncContract).toHaveBeenCalledWith('123', 'hardhat');
        expect(db.storeContractData).toHaveBeenCalledWith('123', 'hardhat', '0x12345', { address: expect.anything(), hashedBytecode: expect.anything() });
        expect(db.storeTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', expect.any(Array));
    });

    it('Should not store the contract if user can not sync', async () => {
        jest.spyOn(db, 'canUserSyncContract')
            .mockResolvedValueOnce(false);

        const result = await processTrace('123', 'hardhat', '0x123', [{ op: 'CALL', address: '0x12345', contractHashedBytecode: '0x' }], db);

        expect(db.canUserSyncContract).toHaveBeenCalledWith('123', 'hardhat');
        expect(db.storeContractData).not.toHaveBeenCalled();
        expect(db.storeTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', expect.any(Array));
    });
});

describe('parseTrace', () => {
    let from, provider;

    beforeEach(async () => {
        from = '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f';
        provider = {
            getCode: () => {
                return new Promise((resolve) => resolve('0xabcd'));
            }
        };
    });

    it('Should return the processed trace', async () => {
        const result = await parseTrace(from, Trace, provider);
        expect(result).toMatchSnapshot();
    });
});
