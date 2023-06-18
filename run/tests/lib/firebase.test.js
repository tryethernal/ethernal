jest.mock('sequelize', () => ({
    json: jest.fn(),
    Op: {
        or: 'or'
    }
}));

const { Workspace, User, workspace, user, Explorer, explorer } = require('../mocks/models');
const db = require('../../lib/firebase');

beforeEach(() => jest.clearAllMocks());

describe('updateWorkspaceRpcHealthCheck', () => {
    it('Should update the healtcheck', (done) => {
        db.updateWorkspaceRpcHealthCheck(1, true)
            .then(() => {
                expect(workspace.safeCreateOrUpdateRpcHealthCheck).toHaveBeenCalledWith(true);
                done();
            });
    });

    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateWorkspaceRpcHealthCheck(1, true))
            .rejects.toThrow('Cannot find workspace');
    });
});

describe('updateWorkspaceIntegrityCheck', () => {
    it('Should update the status', (done) => {
        db.updateWorkspaceIntegrityCheck(1, { status: 'healthy' })
            .then(() => {
                expect(workspace.safeCreateOrUpdateIntegrityCheck).toHaveBeenCalledWith({ blockId: undefined, status: 'healthy' });
                done();
            });
    });

    it('Should update the block', (done) => {
        db.updateWorkspaceIntegrityCheck(1, { blockId: 1 })
            .then(() => {
                expect(workspace.safeCreateOrUpdateIntegrityCheck).toHaveBeenCalledWith({ blockId: 1, status: undefined });
                done();
            });
    });

    it('Should throw an error if missing block & status', async () => {
        await expect(db.updateWorkspaceIntegrityCheck(1, {}))
            .rejects.toThrow('Missing parameter');
    });

    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateWorkspaceIntegrityCheck(1, { blockId: 1 }))
            .rejects.toThrow('Cannot find workspace');
    });
});

describe('syncPartialBlock', () => {
    it('Should return a serialized partial block', (done) => {
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce(null);
        jest.spyOn(workspace, 'safeCreatePartialBlock').mockResolvedValueOnce({ toJSON: () => ({ id: 1 })});
        db.syncPartialBlock(1, { block: { number: 1 }})
            .then(block => {
                expect(block).toEqual({ id: 1});
                done();
            });
    });

    it('Should return null if block is already here', (done) => {
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce({ id: 1 });
        db.syncPartialBlock(1, { block: { number: 1 }})
            .then(block => {
                expect(block).toEqual(null);
                done();
            });
    })

    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.syncPartialBlock(1, {}))
            .rejects.toThrow('Could not find workspace');
    });
});

describe('syncFullBlock', () => {
    it('Should return a serialized full block', (done) => {
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(workspace, 'safeCreateFullBlock').mockResolvedValueOnce({ toJSON: () => ({ id: 1 })});
        db.syncFullBlock(1, { block: { number: 1 }})
            .then(block => {
                expect(block).toEqual({ id: 1});
                done();
            });
    });

    it('Should return null if block does not exist', (done) => {
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce(null);
        db.syncFullBlock(1, { block: { number: 1 }})
            .then(block => {
                expect(block).toEqual(null);
                done();
            });
    });

    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.syncFullBlock(1, {}))
            .rejects.toThrow('Could not find workspace');
    });
});

describe('createExplorer', () => {
    it('Should return an explorer if it has been created', (done) => {
        db.createExplorer(1, 1, 1, 'test', 'test', 'test').then(explorer => {
            expect(explorer).toEqual({ name: 'Ethernal', slug: 'ethernal' })
            done();
        });
    });

    it('Should return null if explorer was not created', (done) => {
        jest.spyOn(Explorer, 'safeCreateExplorer').mockResolvedValueOnce(null);
        db.createExplorer(1, 1, 1, 'test', 'test', 'test').then(explorer => {
            expect(explorer).toEqual(null)
            done();
        });
    });

    it('THrow an error if parameters are missing', async () => {
        await expect(db.createExplorer(1))
            .rejects.toThrow('Missing parameter');
    });
});

describe('updateBrowserSync', () => {
    it('Should update browser sync if it can find the workspace', (done) => {
        const update = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ update });
        db.updateBrowserSync(1, false).then(() => {
            expect(update).toHaveBeenCalledWith({ browserSyncEnabled: false });
            done();
        });
    });

    it('Should throw an error if it cannot find the workspace', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateBrowserSync(1, false))
            .rejects.toThrow('Cannot find workspace');
    });

    it('Should throw an error if parameters are invalid', async () => {
        await expect(db.updateBrowserSync(1))
            .rejects.toThrow('Missing parameter');
    });
});

describe('getAddressTokenTransfers', () => {
    it('Should return token transfers if transaction exists', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getFilteredAddressTokenTransfers: jest.fn().mockResolvedValueOnce([{ toJSON: () => ({ address: '0x123' }) }]),
            countAddressTokenTransfers: jest.fn().mockResolvedValueOnce(1)
        });

        db.getAddressTokenTransfers(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        total: 1,
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
                done();
            });
    });
});


describe('getAddressStats', () => {
    it('Should return stats', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            countAddressSentTransactions: jest.fn().mockResolvedValueOnce(1),
            countAddressReceivedTransactions: jest.fn().mockResolvedValueOnce(2),
            countAddressSentErc20TokenTransfers: jest.fn().mockResolvedValueOnce(3),
            countAddressReceivedErc20TokenTransfers: jest.fn().mockResolvedValueOnce(4)
        });

        db.getAddressStats(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        sentTransactionCount: 1,
                        receivedTransactionCount: 2,
                        sentErc20TokenTransferCount: 3,
                        receivedErc20TokenTransferCount: 4
                    }
                );
                done();
            });
    });
});

describe('getTokenHolders', () => {
    it('Should return token transfers if transaction exists', (done) => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce({
            getFilteredTokenTransfers: jest.fn().mockResolvedValueOnce([{ toJSON: () => ({ address: '0x123' }) }]),
            countTokenTransfers: jest.fn().mockResolvedValueOnce(1)
        });

        db.getTransactionTokenTransfers(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        total: 1,
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
                done();
            });
    });

    it('Should fail if transaction does not exist', (done) => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        db.getTransactionTokenTransfers(1, '0x123')
            .catch(res => {
                expect(res.message).toEqual(`Cannot find transaction`);
                done();
            });
    });
});

describe('getTokenHolderHistory', () => {
    it('Should return supply if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenHolderHistory: jest.fn().mockResolvedValueOnce([{ address: '0x123' }]),
        });

        db.getTokenHolderHistory(1, '0x123', 'from', 'to')
            .then(res => {
                expect(res).toEqual([{ address: '0x123' }]);
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenCumulativeSupply(1, '0x123', 'from', 'to')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenCumulativeSupply', () => {
    it('Should return supply if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenCumulativeSupply: jest.fn().mockResolvedValueOnce([{ address: '0x123' }]),
        });

        db.getTokenCumulativeSupply(1, '0x123', 'from', 'to')
            .then(res => {
                expect(res).toEqual([{ address: '0x123' }]);
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenCumulativeSupply(1, '0x123', 'from', 'to')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenTransferVolume', () => {
    it('Should return holders if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenTransferVolume: jest.fn().mockResolvedValueOnce([{ address: '0x123' }]),
        });

        db.getTokenTransferVolume(1, '0x123', 'from', 'to')
            .then(res => {
                expect(res).toEqual([{ address: '0x123' }]);
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenTransferVolume(1, '0x123', 'from', 'to')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenHolders', () => {
    it('Should return holders if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenHolders: jest.fn().mockResolvedValueOnce([{ address: '0x123' }]),
            countTokenHolders: jest.fn().mockResolvedValueOnce(1)
        });

        db.getTokenHolders(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        total: 1,
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenHolders(1, '0x123')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenStats', () => {
    it('Should return stats if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            countTokenHolders: jest.fn().mockResolvedValueOnce(1),
            countTransactions: jest.fn().mockResolvedValueOnce(2),
            countTokenTransfers: jest.fn().mockResolvedValueOnce(3),
            getTokenCirculatingSupply: jest.fn().mockResolvedValueOnce(4)
        });

        db.getTokenStats(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        tokenHolderCount: 1,
                        transactionCount: 2,
                        tokenTransferCount: 3,
                        tokenCirculatingSupply: 4
                    }
                );
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenStats(1, '0x123')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenTransfers', () => {
    it('Should return transfers if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenTransfers: jest.fn().mockResolvedValueOnce([{ toJSON: () => ({ address: '0x123' }) }]),
            countTokenTransfers: jest.fn().mockResolvedValueOnce(1)
        });

        db.getTokenTransfers(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        total: 1,
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenTransfers(1, '0x123')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address.`);
                done();
            });
    });
});

describe('getContractLogs', () => {
    it('Should return logs if contract exists', (done) => {
        db.getContractLogs(1, '0x123', '0x456')
            .then(res => {
                expect(res).toEqual(
                    {
                        total: 1,
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getContractLogs(1, '0x123', '0x456')
            .catch(res => {
                expect(res.message).toEqual(`Can't find a contract at this address.`);
                done();
            });
    });
});

describe('getContractByWorkspaceId', () => {
    it('Should return the contract if it exists', (done) => {
        db.getContractByWorkspaceId(1, '0x123')
            .then(contract => {
                expect(contract).toEqual(
                    { id: 10, address: '0x123' }
                );
                done();
            });
    });

    it('Should return null if the contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getContractByWorkspaceId(1, '0x123')
            .then(contract => {
                expect(contract).toEqual(null);
                done();
            });
    });
});

describe('getErc721TokenTransfers', () => {
    it('Should return all erc721 tokens transfers for the token id', (done) => {
        db.getErc721TokenTransfers(1, '0x123', 1)
            .then(transfers => {
                expect(transfers).toEqual([
                    { src: '0x123', dst: '0x456', tokenId: '1' }
                ]);
                done();
            });
    });
});

describe('getContractErc721Token', () => {
    it('Should return the erc721 token', (done) => {
        db.getContractErc721Token(1, '0x123', 1)
            .then(token => {
                expect(token).toEqual({ tokenId: '1' });
                done();
            });
    });
});

describe('getContractErc721Tokens', () => {
    it('Should return erc721 tokens with total count', (done) => {
        db.getContractErc721Tokens(1, '0x123', 1, 10, 'src', 'asc')
            .then(tokens => {
                expect(tokens).toEqual({
                    items: [{ tokenId: '1' }],
                    total: 1
                });
                done();
            });
    });
});

describe('searchForAddress', () => {
    it('Should return found contracts', (done) => {
        db.searchForAddress(1, '0x123')
            .then(contracts => {
                expect(contracts).toEqual([
                    { type: 'contract', data: { id: 10, address: '0x123' }}
                ]);
                done();
            });
    });

    it('Should return an empty array of contracts', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);

        db.searchForAddress(1, '0x123')
            .then(contracts => {
                expect(contracts).toEqual([]);
                done();
            });
    });
});

describe('searchForHash', () => {
    it('Should return transaction if hash matches', (done) => {
        db.searchForHash(1, '0x123')
            .then(transactions => {
                expect(transactions).toEqual([
                    { type: 'transaction', data: { hash: '0x123' }}
                ]);
                done();
            });
    });

    it('Should return block if hash matches', (done) => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);

        db.searchForHash(1, '0x123')
            .then(blocks => {
                expect(blocks).toEqual([
                    { type: 'block', data: { number: 1 }}
                ]);
                done();
            });
    });

    it('Should return an empty array if no match', (done) => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        jest.spyOn(workspace, 'findBlockByHash').mockResolvedValueOnce(null);
        db.searchForHash(1, '0x123')
            .then(blocks => {
                expect(blocks).toEqual([]);
                done();
            });
    });
});

describe('searchForNumber', () => {
    it('Should return an array of blocks', (done) => {
        const block = {
            toJSON: jest.fn().mockReturnValue({ number: 1 })
        };
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce(block);

        db.searchForNumber(1, 2)
            .then(blocks => {
                expect(blocks).toEqual([
                    { type: 'block', data: { number: 1 }}
                ]);
                done();
            })
    });

    it('Should return an empty array if no block', (done) => {
        jest.spyOn(workspace, 'findBlockByNumber').mockResolvedValueOnce(null);
        db.searchForNumber(1, 2)
            .then(blocks => {
                expect(blocks).toEqual([]);
                done();
            })
    });
});

describe('searchForText', () => {
    it('Should return an array of contracts', (done) => {
        db.searchForText(1, 'xmpl')
            .then(contracts => {
                expect(contracts).toEqual([
                    { type: 'contract', data: { id: 10, address: '0x123' }},
                    { type: 'contract', data: { id: 11, address: '0xabcd' }}
                ]);
                done();
            })
    });

    it('Should return an empty array if no contract', (done) => {
        jest.spyOn(workspace, 'findContractsByText').mockResolvedValueOnce(null);
        db.searchForNumber(1, 2)
            .then(contracts => {
                expect(contracts).toEqual([]);
                done();
            })
    });
});

describe('getWorkspaceContractById', () => {
    it('Should return a contract if found', (done) => {
        db.getWorkspaceContractById(1, 10)
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            });
    });

    it('Should return null if no contract is found', async () => {
        const workspace = await Workspace.findByPk(1);
        jest.spyOn(workspace, 'findContractById').mockResolvedValueOnce(null);

        const contract = await db.getWorkspaceContractById(1, 10);
        expect(contract).toBe(null);
    });
});

describe('getWorkspaceBlock', () => {
    it('Should return the block without transactions', (done) => {
        db.getWorkspaceBlock(1, 2, false)
            .then(blocks => {
                expect(blocks).toEqual({ number: 1 });
                done();
            });
    });

    it('Should return the block with transactions', async () => {
        const workspace = await Workspace.findByPk(1);
        jest.spyOn(workspace, 'getBlocks').mockResolvedValueOnce([{ toJSON: () => ({ number: 1, transactions: [{ hash: '0x123' }]})}]);

        const block = await db.getWorkspaceBlock(1, 2, true);
        expect(block).toEqual({ number: 1, transactions: [{ hash: '0x123' }]});
    });
});

describe('getWorkspaceBlocks', () => {
    it('Should return blocks list', (done) => {
        db.getWorkspaceBlocks(1)
            .then(result => {
                expect(result).toEqual({
                    items: [{ number: 1 }, { number: 2 }],
                    total: 2
                });
                done();
            });
    });
});

describe('getWorkspaceTransaction', () => {
    it('Should return the transaction', (done) => {
        db.getWorkspaceTransaction(1, 'Ox123')
            .then(transaction => {
                expect(transaction).toEqual({
                    hash: '0x123'
                });
                done();
            });
    });
});

describe('getWorkspaceTransactions', () => {
    it('Should return transactions list', (done) => {
        db.getWorkspaceTransactions(1, 'Ox123')
            .then(result => {
                expect(result).toEqual({
                    items: [{ hash: '0x123' }, { hash: '0x456' }],
                    total: 2
                });
                done();
            });
    });
});

describe('getAddressTransactions', () => {
    it('Should return transactions list', (done) => {
        db.getAddressTransactions(1, 'Ox123')
            .then(result => {
                expect(result).toEqual({
                    items: [{ hash: '0x123' }, { hash: '0x456' }],
                    total: 2
                });
                done();
            });
    });
});

describe('getWorkspaceContracts', () => {
    it('Should return contracts list', (done) => {
        db.getWorkspaceContracts(1, 'Ox123')
            .then(result => {
                expect(result).toEqual({
                    items: [{ id: 10, address: '0x123' }, { id: 11, address: '0xabcd' }],
                    total: 2
                });
                done();
            });
    });
});

describe('getWorkspaceContract', () => {
    it('Should return contract', (done) => {
        db.getWorkspaceContract(1, 'My Workspace', '0x123')
            .then(contract => {
                expect(contract).toEqual({
                    id: 10,
                    address: '0x123'
                });
                done();
            });
    });

    it('Should return null if contract does not exist', async () => {
        const user = await User.findByAuthIdWithWorkspace(1, 'My Workspace');
        jest.spyOn(user.workspaces[0], 'findContractByAddress').mockResolvedValueOnce(null);

        const contract = await db.getWorkspaceContract(1, 'My Workspace', '0x123')
        expect(contract).toEqual(null);
    });
});

describe('getUserById', () => {
    it('Should return an user if it exists', (done) => {
        db.getUserById(1)
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [expect.anything()]});
                done();
            });
    });

    it('Should return null if user does not exist', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce(null);
        db.getUserById(1)
            .then(user => {
                expect(user).toEqual(null);
                done();
            });
    });
});

describe('getUser', () => {
    it('Should return an user if it exists', (done) => {
        db.getUser(1)
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [expect.anything()]});
                done();
            });
    });

    it('Should return null if user does not exist', async () => {
        jest.spyOn(User, 'findByAuthId').mockResolvedValueOnce(null);
        const user = await db.getUser(1);
        expect(user).toEqual(null);
    });
});

describe('getUserWorkspaces', () => {
    it('Should return user workspaces', (done) => {
        db.getUserWorkspaces('123')
            .then(workspaces => {
                expect(workspaces).toEqual([{ id: 1, name: 'My Workspace' }]);
                done();
            });
    });
});

describe('addIntegration', () => {
    it('Should call the workspace function', async () => {
        await db.addIntegration('123', 'My Workspace', 'api');
        const workspace = await Workspace.findByPk(1);
        expect(workspace.addIntegration).toHaveBeenCalledWith('api');
    });
});

describe('removeIntegration', () => {
    it('Should call the workspace function', async () => {
        await db.removeIntegration('123', 'My Workspace', 'api');
        const workspace = await Workspace.findByPk(1);
        expect(workspace.removeIntegration).toHaveBeenCalledWith('api');
    });
});

describe('createWorkspace', () => {
    it('Should return created workspace', (done) => {
        db.createWorkspace('123', 'My Workspace', 'api')
            .then(workspace => {
                expect(workspace).toEqual({ id: 1, name: 'My Workspace' });
                done();
            });
    });
});

describe('getWorkspaceByName', () => {
    it('Should return the workspace if it exists', (done) => {
        db.getWorkspaceByName('123', 'My Workspace')
            .then(workspace => {
                expect(workspace).toEqual({ id: 1, name: 'My Workspace' });
                done();
            });
    });

    it('Should return null if the workspace does not exists', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({ workspaces: [] });
        db.getWorkspaceByName('123', 'My Workspace')
            .then(workspace => {
                expect(workspace).toEqual(null);
                done();
            });
    });
});

describe('storeBlock', () => {
    it('Should return the stored block if it does not exists', (done) => {
        db.storeBlock('123', 'My Workspace', { number: 1 })
            .then(block => {
                expect(block).toEqual({ number: 1 });
                done();
            });
    });

    it('Should return null if the block already exists', async () => {
        const user = await User.findByAuthIdWithWorkspace('123', 'My Workspace');
        jest.spyOn(user.workspaces[0], 'findBlockByNumber').mockResolvedValueOnce({ number: 1 });

        const block = await db.storeBlock('123', 'My Workspace', { number: 1 });
        expect(block).toEqual(null);
    });
});

describe('storeTransaction', () => {
    it('Should return the stored transaction if it does not exists', async () => {
        const user = await User.findByAuthIdWithWorkspace('123', 'My Workspace');
        jest.spyOn(user.workspaces[0], 'findBlockByNumber').mockResolvedValueOnce({ number: 1 });
        jest.spyOn(user.workspaces[0], 'findTransaction').mockResolvedValueOnce(null);

        const transaction = await db.storeTransaction('123', 'My Workspace', { hash: '0x123' });
        expect(transaction).toEqual({ hash: '0x123' });
    });

    it('Should return null if the transaction exists', async () => {
        const user = await User.findByAuthIdWithWorkspace('123', 'My Workspace');
        jest.spyOn(user.workspaces[0], 'findBlockByNumber').mockResolvedValueOnce({ number: 1 });
        jest.spyOn(user.workspaces[0], 'findTransaction').mockResolvedValueOnce({ hash: '0x123' });

        const transaction = await db.storeTransaction('123', 'My Workspace', { hash: '0x123' });
        expect(transaction).toBe(null);
    });

    it('Should throw an error if the block does not exist', async () => {
        await expect(db.storeTransaction('123', 'My Workspace', { hash: '0x123', blockNumber: 1 }))
            .rejects.toThrow(`Couldn't find block`);
    });
});

describe('storeTransactionTokenTransfers', () => {
    it('Should call the creation method for each transfer', async () => {
        const transaction = await workspace.findTransaction(1);
        await db.storeTransactionTokenTransfers('123', 'My Workspace', '0x123', [{ token: '0xabc' }, { token: '0xdef' }]);
        expect(transaction.safeCreateTokenTransfer).toHaveBeenCalledTimes(2);
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        await expect(db.storeTransactionTokenTransfers('123', 'My Workspace', '0x123', [{ token: '0xabc' }, { token: '0xdef' }]))
            .rejects.toThrow(`Couldn't find transaction`);
    });
});

describe('storeContractData', () => {
    it('Should return contract', (done) => {
        db.storeContractData('123', 'My Workspace', '0x123', [{ address: '0xabc', name: 'My Contract' }])
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            })
    });
});

describe('getContractData', () => {
    it('Should return contract if it exists', (done) => {
        db.getContractData('123', 'My Workspace', '0x123')
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            });
    });

    it('Should return null if the contract does not exist', async () => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);

        const contract = await db.getContractData('123', 'My Workspace', '0x123');
        expect(contract).toEqual(null);
    });
});

describe('getContractByHashedBytecode', () => {
    it('Should return contract if it exists', (done) => {
        db.getContractByHashedBytecode('123', 'My Workspace', '0x123')
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            });
    });

    it('Should return null if the contract does not exist', async () => {
        jest.spyOn(workspace, 'findContractByHashedBytecode').mockResolvedValueOnce(null);

        const contract = await db.getContractByHashedBytecode('123', 'My Workspace', '0x123');
        expect(contract).toEqual(null);
    });
});

describe('storeAccountPrivateKey', () => {
    it('Should return account', (done) => {
        db.storeAccountPrivateKey('123', 'My Workspace', '0x123', '0xabcd')
            .then(account => {
                expect(account).toEqual({ address: '0x123' });
                done();
            });
    });
});

describe('storeTrace', () => {
    it('Should call the store method for each step', async () => {
        const transaction = await workspace.findTransaction(1);
        await db.storeTrace('123', 'My Workspace', '0x123', [{ op: 'CALL' }, { op: 'CALLDATA' }]);
        expect(transaction.safeCreateTransactionTrace).toHaveBeenCalledWith([{ op: 'CALL' }, { op: 'CALLDATA' }]);
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        await expect(db.storeTrace('123', 'My Workspace', '0x123', [{ op: 'CALL' }, { op: 'CALLDATA' }]))
            .rejects.toThrow(`Couldn't find transaction`);
    });
});

describe('storeTransactionData', () => {
    it('Should return the transaction', (done) => {
        db.storeTransactionData('123', 'My Workspace', '0x123', { name: 'My Contract' })
            .then(transaction => {
                expect(transaction).toEqual({ hash: '0x123' });
                done()
            });
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        await expect(db.storeTransactionData('123', 'My Workspace', '0x123', { name: 'My Contract' }))
            .rejects.toThrow(`Couldn't find transaction`);
    });
});

describe('storeTokenBalanceChanges', () => {
    const balanceChanges = [
        { src: '0x456' },
        { src: '0x789' }
    ];

    it('Should call the creation method for each balance change', async () => {
        const tokenTransfer = (await workspace.getTokenTransfers(1))[0];
        await db.storeTokenBalanceChanges('123', 'My Workspace', '0x123', balanceChanges);
        expect(tokenTransfer.safeCreateBalanceChange).toHaveBeenCalledTimes(2);
    });

    it('Should throw an error if the token transfer does not exist', async () => {
        jest.spyOn(workspace, 'getTokenTransfers').mockResolvedValueOnce([]);
        await expect(db.storeTokenBalanceChanges('123', 'My Workspace', '0x123', balanceChanges))
            .rejects.toThrow(`Couldn't find token transfer`);
    });
});

describe('storeFailedTransactionError', () => {
    it('Should return the transaction', (done) => {
        db.storeFailedTransactionError('123', 'My Workspace', '0x123', { parsedError: 'Error' })
            .then(transaction => {
                expect(transaction).toEqual({ hash: '0x123' });
                done()
            });
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(workspace, 'findTransaction').mockResolvedValueOnce(null);
        await expect(db.storeFailedTransactionError('123', 'My Workspace', '0x123', { parsedError: 'Error' }))
            .rejects.toThrow(`Couldn't find transaction`);
    });
});

describe('updateAccountBalance', () => {
    it('Should return the account', (done) => {
        db.updateAccountBalance('123', 'My Workspace', '0x123', '10000')
            .then(account => {
                expect(account).toEqual({ address: '0x123' });
                done()
            });
    });
});

describe('setCurrentWorkspace', () => {
    it('Should return the user', (done) => {
        db.setCurrentWorkspace('123', 'Another Workspace')
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [expect.anything()] });
                done()
            });
    });
});

describe('updateWorkspaceSettings', () => {
    it('Should return the updated workspace', (done) => {
        db.updateWorkspaceSettings('123', 'My Workspace', { rpcServer: 'http://localhost:8545' })
            .then(workspace => {
                expect(workspace).toEqual({ id: 1, name: 'My Workspace' });
                done()
            });
    });
});

describe('getUserbyStripeCustomerId', () => {
    it('Should return user if it exists', (done) => {
        db.getUserbyStripeCustomerId('123', 'My Workspace', 'cus_1')
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [expect.anything()] });
                done();
            });
    });

    it('Should return null if the contract does not exist', async () => {
        jest.spyOn(User, 'findByStripeCustomerId').mockResolvedValueOnce(null);

        const user = await db.getUserbyStripeCustomerId('123', 'My Workspace', 'cus_1');
        expect(user).toEqual(null);
    });
});

describe('getUnprocessedContracts', () => {
    it('Should return an array of contracts', (done) => {
        db.getUnprocessedContracts('123', 'My Workspace')
            .then(contracts => {
                expect(contracts).toEqual([{ id: 10, address: '0x123' }, { id: 11, address: '0xabcd' }]);
                done();
            });
    });
});

describe('canUserSyncContract', () => {
    it('Should return true if the user is premium', (done) => {
        db.canUserSyncContract('123', 'My Workspace', '0x123')
            .then(res => {
                expect(res).toBe(true);
                done();
            });
    });

    it('Should return true if the user is not premium but contract is already there', (done) => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({ workspaces: [workspace], isPremium: false });

        db.canUserSyncContract('123', 'My Workspace', '0x123')
            .then(res => {
                expect(res).toBe(true);
                done();
            });
    });

    it('Should return true if the user is not premium, contract is not already there, and less than 10 already synced', (done) => {
        jest.spyOn(workspace, 'getContracts')
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ address: '0x123' }]);

        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({ workspaces: [workspace], isPremium: false });

        db.canUserSyncContract('123', 'My Workspace', '0x123')
            .then(res => {
                expect(res).toBe(true);
                done();
            });
    });

    it('Should return true if the user is not premium, contract is not already there, and has 10 already synced', (done) => {
        const contracts = [];
        for (let i = 0; i < 10; i++)
            contracts.push({ address: `Ox123${i}` });

        jest.spyOn(workspace, 'getContracts')
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(contracts);

        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({ workspaces: [workspace], isPremium: false });

        db.canUserSyncContract('123', 'My Workspace', '0x123')
            .then(res => {
                expect(res).toBe(false);
                done();
            });
    });
});

describe('getContractDeploymentTxByAddress', () => {
    it('Should return the transaction if it exists', (done) => {
        db.getContractDeploymentTxByAddress('123', 'My Workspace', '0x123')
            .then(transaction => {
                expect(transaction).toEqual({ hash: '0x123' });
                done();
            });
    });

    it('Should return null if the transaction does not exist', (done) => {
        jest.spyOn(workspace, 'getTransactions').mockResolvedValueOnce([]);
        db.getContractDeploymentTxByAddress('123', 'My Workspace', '0x123')
            .then(transaction => {
                expect(transaction).toBe(null);
                done();
            });
    });
});

describe('updateContractVerificationStatus', () => {
    it('Should should return null if status is not valid', (done) => {
        db.updateContractVerificationStatus('123', 'My Workspace', '0x123', 'invalid')
            .then(result => {
                expect(result).toBe(null);
                done();
            });
    });

    it('Should return the updated contract if the status is valid', (done) => {
        db.updateContractVerificationStatus('123', 'My Workspace', '0x123', 'success')
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            });
    });
});

describe('updateUserPlan', () => {
    it('Should throw an error if the plan is invalid', async () => {
        await expect(db.updateUserPlan('123', 'invalid'))
            .rejects.toThrow('[updateUserPlan] Invalid plan');
    });

    it('Should return the updated user if the status is valid', (done) => {
        db.updateUserPlan('123', 'premium')
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [expect.anything()] });
                done();
            });
    });
});

describe('getContractTransactions', () => {
    it('Should return contract transactions', (done) => {
        db.getContractTransactions('123', 'premium', '0x123')
            .then(transactions => {
                expect(transactions).toEqual([{ hash: '0x123' }]);
                done();
            });
    });
});

describe('getContract', () => {
    it('Should return the contract', (done) => {
        db.getContract('123', 'hardhat', '0x123')
            .then((contract) => {
                expect(contract).toEqual({
                    id: 10,
                    address: '0x123'
                });
                done();
            });
    });

    it('Should return null if the user does not exist', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce(null);
        db.getContract('123', 'hardhat', '0x123')
            .then((contract) => {
                expect(contract).toEqual(null);
                done();
            });
    });

    it('Should return null if the contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getContract('123', 'hardhat', '0x123')
            .then((contract) => {
                expect(contract).toEqual(null);
                done();
            });
    });
});

describe('getAccounts', () => {
    it('Should return the account list with the total', (done) => {
        jest.spyOn(workspace, 'getFilteredAccounts').mockResolvedValueOnce([{ toJSON: () => ({ address: '0x123' }) }]);
        jest.spyOn(workspace, 'countAccounts').mockResolvedValueOnce(1);
        db.getAccounts('123', 'hardhat')
            .then(({ items, total}) => {
                expect(items).toEqual([{ address: '0x123' }]);
                expect(total).toEqual(1);
                done();
            });
    });
});

describe('getPublicExplorerParamsBySlug', () => {
    it('Should return the explorer', (done) => {
        db.getPublicExplorerParamsBySlug('ethernal')
            .then(explorer => {
                expect(explorer).toEqual({ name: 'Ethernal', slug: 'ethernal' });
                done();
            })
    });

    it('Should return null if the explorer does not exist', (done) => {
        jest.spyOn(Explorer, 'findBySlug').mockResolvedValueOnce(null);
        db.getPublicExplorerParamsBySlug('ethernal')
            .then(explorer => {
                expect(explorer).toEqual(null);
                done();
            })
    });
});

describe('getPublicExplorerParamsByDomain', () => {
    it('Should return the explorer', (done) => {
        db.getPublicExplorerParamsBySlug('explorer.ethernal.com')
            .then(explorer => {
                expect(explorer).toEqual({ name: 'Ethernal', slug: 'ethernal' });
                done();
            })
    });

    it('Should return null if the explorer does not exist', (done) => {
        jest.spyOn(Explorer, 'findBySlug').mockResolvedValueOnce(null);
        db.getPublicExplorerParamsBySlug('explorer.ethernal.com')
            .then(explorer => {
                expect(explorer).toEqual(null);
                done();
            })
    });
});

describe('getProcessableTransactions', () => {
    it('Should return the list of transactions', (done) => {
        jest.spyOn(db, 'getProcessableTransactions').mockResolvedValueOnce([{ hash: '0x123' }]);
        db.getProcessableTransactions('123', 'hardhat')
            .then(transactions => {
                expect(transactions).toEqual([{ hash: '0x123' }]);
                done();
            })
    });
});

describe('getFailedProcessableTransactions', () => {
    it('Should return the list of transactions', (done) => {
        jest.spyOn(db, 'getFailedProcessableTransactions').mockResolvedValueOnce([{ hash: '0x123' }]);
        db.getFailedProcessableTransactions('123', 'hardhat')
            .then(transactions => {
                expect(transactions).toEqual([{ hash: '0x123' }]);
                done();
            })
    });
});
