const TokenTransfer = {
    findByPk: jest.fn(),
    bulkCreate: jest.fn(),
    safeCreateBalanceChange: jest.fn().mockResolvedValue(),
    safeCreateBalanceChanges: jest.fn().mockResolvedValue([])
};

module.exports = { TokenTransfer };
