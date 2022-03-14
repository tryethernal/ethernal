jest.mock('../../lib/firebase', () => ({
    canUserSyncContract: jest.fn().mockResolvedValue(true),
    storeContractData: jest.fn().mockResolvedValue(true),
    getContractRef: jest.fn().mockReturnValue('ref'),
    storeTrace: jest.fn().mockResolvedValue()
}));

const { parseTrace,  processTrace } = require('../../lib/trace');
const { canUserSyncContract, storeContractData, getContractRef, storeTrace } = require('../../lib/firebase');
const Trace = require('../fixtures/Trace.json');

describe('processTrace', () => {
    beforeEach(jest.clearAllMocks);

    it('Should find add the contract & store the ref if user can sync', async () => {
        const result = await processTrace('123', 'hardhat', '0x123', [{ op: 'CALL', address: '0x12345', contractHashedBytecode: '0x' }]);

        expect(canUserSyncContract).toHaveBeenCalledWith('123', 'hardhat');
        expect(storeContractData).toHaveBeenCalledWith('123', 'hardhat', '0x12345', { address: expect.anything(), hashedBytecode: expect.anything() });
        expect(getContractRef).toHaveBeenCalledWith('123', 'hardhat', '0x12345');
        expect(storeTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', expect.any(Array));
    });

    it('Should not store the contract if user can not sync', async () => {
        canUserSyncContract
            .mockImplementationOnce()
            .mockResolvedValue(false);

        const result = await processTrace('123', 'hardhat', '0x123', [{ op: 'CALL', address: '0x12345', contractHashedBytecode: '0x' }]);

        expect(canUserSyncContract).toHaveBeenCalledWith('123', 'hardhat');
        expect(storeContractData).not.toHaveBeenCalled();
        expect(getContractRef).not.toHaveBeenCalled();
        expect(storeTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', expect.any(Array));
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
