const account = {
    address: '0x123',
    toJSON: jest.fn().mockReturnValue({ address: '0x123' })
};

const transaction1 = {
    hash: '0x123',
    safeCreateTokenTransfer: jest.fn(),
    safeCreateTransactionTraceStep: jest.fn(),
    safeUpdateStorage: jest.fn(),
    safeCreateTokenBalanceChange: jest.fn(),
    updateFailedTransactionError: jest.fn(),
    toJSON: jest.fn().mockReturnValue({ hash: '0x123' })
};

const transaction2 = {
    hash: '0x456',
    safeCreateTokenTransfer: jest.fn(),
    safeCreateTransactionTraceStep: jest.fn(),
    safeUpdateStorage: jest.fn(),
    safeCreateTokenBalanceChange: jest.fn(),
    updateFailedTransactionError: jest.fn(),
    toJSON: jest.fn().mockReturnValue({ hash: '0x456' })
};

const block1 = {
    number: 1,
    toJSON: jest.fn().mockReturnValue({ number: 1 })
};

const block2 = {
    number: 2,
    toJSON: jest.fn().mockReturnValue({ number: 2 })
};

const contract1 = {
    id: 10,
    address: '0x123',
    update: jest.fn(),
    toJSON: jest.fn().mockReturnValue({ id: 10, address: '0x123' })
};

const contract2 = {
    id: 11,
    address: '0xabcd',
    update: jest.fn(),
    toJSON: jest.fn().mockReturnValue({ id: 11, address: '0xabcd' })
};

const workspace = {
    id: 1,
    name: 'My Workspace',
    toJSON: jest.fn().mockReturnValue({ id: 1, name: 'My Workspace' }),
    findContractById: jest.fn().mockResolvedValue(contract1),
    findContractByAddress: jest.fn().mockResolvedValue(contract1),
    getBlocks: jest.fn().mockResolvedValue([block1, block2]),
    getFilteredBlocks: jest.fn().mockResolvedValue([block1, block2]),
    countBlocks: jest.fn().mockResolvedValue(2),
    findTransaction: jest.fn().mockResolvedValue(transaction1),
    getFilteredTransactions: jest.fn().mockResolvedValue([transaction1, transaction2]),
    getTransactions: jest.fn().mockResolvedValue([transaction1]),
    countTransactions: jest.fn().mockResolvedValue(2),
    getFilteredContracts: jest.fn().mockResolvedValue([contract1, contract2]),
    countContracts: jest.fn().mockResolvedValue(2),
    getContracts: jest.fn().mockResolvedValue([contract1]),
    addIntegration: jest.fn(),
    removeIntegration: jest.fn(),
    findBlockByNumber: jest.fn().mockResolvedValue(null),
    safeCreateBlock: jest.fn().mockResolvedValue(block1),
    safeCreateTransaction: jest.fn().mockResolvedValue(transaction1),
    safeCreateOrUpdateContract: jest.fn().mockResolvedValue(contract1),
    findContractByAddress: jest.fn().mockResolvedValue(contract1),
    findContractByHashedBytecode: jest.fn().mockResolvedValue(contract1),
    safeCreateOrUpdateAccount: jest.fn().mockResolvedValue(account),
    removeContractByAddress: jest.fn(),
    updateSettings: jest.fn().mockResolvedValue({ toJSON: () => ({ id: 1, name: 'My Workspace' })}),
    getUnprocessedContracts: jest.fn().mockResolvedValue([ contract1, contract2 ]),
    getFilteredAccounts: jest.fn(),
    countAccounts: jest.fn(),
    getProcessableTransactions: jest.fn(),
    getFailedProcessableTransactions: jest.fn(),
    findContractsByText: jest.fn().mockResolvedValue([contract1, contract2]),
    findBlockByHash: jest.fn().mockResolvedValue(block1)
};

const Workspace = {
    findByPk: jest.fn().mockResolvedValue(workspace)
};

module.exports = {
    Workspace: Workspace,
    workspace: workspace
};
