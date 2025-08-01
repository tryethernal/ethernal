jest.mock('sequelize', () => ({
    literal: jest.fn(),
    json: jest.fn(),
    Op: {
        or: 'or'
    }
}));
require('../mocks/lib/env');
require('../mocks/lib/queue');
const { ExplorerV2Dex, ExplorerFaucet, Workspace, Block, User, workspace, Explorer, ExplorerDomain, StripePlan, Transaction, StripeSubscription, Contract } = require('../mocks/models');
const db = require('../../lib/firebase');
const env = require('../../lib/env');

beforeEach(() => jest.clearAllMocks());

describe('getFilteredNativeAccounts', () => {
    it('Should return the filtered native accounts', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getFilteredNativeAccounts: jest.fn().mockResolvedValueOnce([{
                address: '0x123',
                balance: 100,
                share: 0.1,
                transaction_count: 10
            }])
        });
        db.getFilteredNativeAccounts(1, 1, 10)
            .then((res) => {
                expect(res).toEqual([{
                    address: '0x123',
                    balance: 100,
                    share: 0.1,
                    transaction_count: 10
                }]);
                done();
            });
    });

    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getFilteredNativeAccounts(1, 1, 10)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });
});

describe('getWorkspaceTokenTransfers', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getWorkspaceTokenTransfers(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the workspace token transfers', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getFilteredTokenTransfers: jest.fn().mockResolvedValueOnce([{
                address: '0x123',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18
            }])
        });
        db.getWorkspaceTokenTransfers(1)
            .then((res) => {
                expect(res).toEqual([{
                    address: '0x123',
                    name: 'Test Token',
                    symbol: 'TEST',
                    decimals: 18
                }]);
                done();
            });
    });
});

describe('getTopTokensByHolders', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getTopTokensByHolders(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the top tokens by holders', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getTopTokensByHolders: jest.fn().mockResolvedValueOnce([{
                address: '0x123',
                name: 'Test Token',
                symbol: 'TEST',
                decimals: 18
            }])
        });
        db.getTopTokensByHolders(1)
            .then((res) => {
                expect(res).toEqual([{
                    address: '0x123',
                    name: 'Test Token',
                    symbol: 'TEST',
                    decimals: 18
                }]);
                done();
            });
    });
});

describe('getWorkspaceContractStats', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getWorkspaceContractStats(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the workspace contract stats', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getContractStats: jest.fn().mockResolvedValueOnce({
                totalContracts: 100,
                contractsLast24Hours: 100,
                verifiedContracts: 100,
                verifiedContractsLast24Hours: 100
            })
        });
        db.getWorkspaceContractStats(1)
            .then((res) => {
                expect(res).toEqual({
                    totalContracts: 100,
                    contractsLast24Hours: 100,
                    verifiedContracts: 100,
                    verifiedContractsLast24Hours: 100
                });
                done();
            });
    });
});

describe('getVerifiedContracts', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getVerifiedContracts(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the verified contracts', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getVerifiedContracts: jest.fn().mockResolvedValueOnce([{
                address: '0x123',
            }])
        });
        db.getVerifiedContracts(1)
            .then((res) => {
                expect(res).toEqual([{
                    address: '0x123',
                }]);
                done();
            });
    });
});

describe('getTransactionTraceSteps', () => {
    it('Should throw an error if no transaction', (done) => {
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce(null);
        db.getTransactionTraceSteps(1, '0x123')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find transaction'));
                done();
            });
    });

    it('Should return the transaction trace steps', (done) => {
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce({
            getTraceSteps: jest.fn().mockResolvedValueOnce([{
                step: 1,
                from: '0x123',
                to: '0x456',
                value: 100
            }])
        });
        db.getTransactionTraceSteps(1, '0x123')
            .then((res) => {
                expect(res).toEqual([{
                    step: 1,
                    from: '0x123',
                    to: '0x456',
                    value: 100
                }]);
                done();
            });
    });
});

describe('getWorkspaceTransactionTraceSteps', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getWorkspaceTransactionTraceSteps(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the workspace transaction trace steps', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getTransactionTraceSteps: jest.fn().mockResolvedValueOnce([{
                step: 1,
                from: '0x123',
                to: '0x456',
                value: 100
            }])
        });
        db.getWorkspaceTransactionTraceSteps(1)
            .then((res) => {
                expect(res).toEqual([{
                    step: 1,
                    from: '0x123',
                    to: '0x456',
                    value: 100
                }]);
                done();
            });
    });
});

describe('getTransactionTokenBalanceChanges', () => {
    it('Should throw an error if no transaction', (done) => {
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce(null);
        db.getTransactionTokenBalanceChanges(1, '0x123')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find transaction'));
                done();
            });
    });

    it('Should return the transaction token balance changes', (done) => {
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce({
            getTokenBalanceChanges: jest.fn().mockResolvedValueOnce([{
                day: '2022-04-05',
                tokenBalanceChanges: 100
            }])
        });
        db.getTransactionTokenBalanceChanges(1, '0x123')
            .then((res) => {
                expect(res).toEqual([{
                    day: '2022-04-05',
                    tokenBalanceChanges: 100
                }]);
                done();
            });
    });
});

describe('getAddressTokenTransferHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getAddressTokenTransferHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the address token transfer history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAddressTokenTransferHistory: jest.fn().mockResolvedValueOnce([{
                day: '2022-04-05',
                tokenTransferCount: 100
            }])
        });
        db.getAddressTokenTransferHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([{
                    day: '2022-04-05',
                    tokenTransferCount: 100
                }]);
                done();
            });
    });
});

describe('getAddressSpentTransactionFeeHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getAddressSpentTransactionFeeHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the address spent transaction fee history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAddressSpentTransactionFeeHistory: jest.fn().mockResolvedValueOnce([{
                day: '2022-04-05',
                spentTransactionFees: 100
            }])
        });
        db.getAddressSpentTransactionFeeHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([{
                    day: '2022-04-05',
                    spentTransactionFees: 100
                }]);
                done();
            });
    });
});

describe('getAddressTransactionHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getAddressTransactionHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the address transaction history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAddressTransactionHistory: jest.fn().mockResolvedValueOnce([{
                transactionHash: '0x123',
                timestamp: '2022-04-05',
                from: '0x123',
                to: '0x456',
                value: 100
            }])
        });
        db.getAddressTransactionHistory(1, '0x123', '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([{
                    transactionHash: '0x123',
                    timestamp: '2022-04-05',
                    from: '0x123',
                    to: '0x456',
                    value: 100
                }]);
                done();
            });
    });
});

describe('countAddressTransactionTraceSteps', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.countAddressTransactionTraceSteps(1, '0x123')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the count of address transaction trace steps', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            countAddressTransactionTraceSteps: jest.fn().mockResolvedValueOnce(100)
        });
        db.countAddressTransactionTraceSteps(1, '0x123')
            .then((res) => {
                expect(res).toEqual(100);
                done();
            });
    });
});

describe('getAddressTransactionTraceSteps', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getAddressTransactionTraceSteps(1, '0x123')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the address transaction trace steps', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAddressTransactionTraceSteps: jest.fn().mockResolvedValueOnce([{
                step: 1,
                from: '0x123',
                to: '0x456',
                value: 100
            }])
        });
        db.getAddressTransactionTraceSteps(1, '0x123', 1, 10)
            .then((res) => {
                expect(res).toEqual([{
                    step: 1,
                    from: '0x123',
                    to: '0x456',
                    value: 100
                }]);
                done();
            });
    });
});

describe('getLast24hBurntFees', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLast24hBurntFees(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the last 24h burnt fees', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLast24hBurntFees: jest.fn().mockResolvedValueOnce(100)
        });
        db.getLast24hBurntFees(1)
            .then((res) => {
                expect(res).toEqual(100);
                done();
            });
    });
});

describe('getLast24hTotalGasUsed', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLast24hTotalGasUsed(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the last 24h total gas used', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLast24hTotalGasUsed: jest.fn().mockResolvedValueOnce(100)
        });
        db.getLast24hTotalGasUsed(1)
            .then((res) => {
                expect(res).toEqual(100);
                done();
            });
    });
});

describe('getLast24hGasUtilisationRatio', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLast24hGasUtilisationRatio(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the last 24h gas utilization ratio', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLast24hGasUtilisationRatio: jest.fn().mockResolvedValueOnce(100)
        });
        db.getLast24hGasUtilisationRatio(1)
            .then((res) => {
                expect(res).toEqual(100);
                done();
            });
    });
});

describe('getLast24hAverageTransactionFee', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLast24hAverageTransactionFee(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return the last 24h average transaction fee', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLast24hAverageTransactionFee: jest.fn().mockResolvedValueOnce(100)
        });
        db.getLast24hAverageTransactionFee(1)
            .then((res) => {
                expect(res).toEqual(100);
                done();
            });
    });
});

describe('getLast24hTransactionFees', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLast24hTransactionFees(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return transaction fee history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLast24hTransactionFees: jest.fn().mockResolvedValueOnce([{ day: '2022-04-05', transactionFees: 100 }])
        });
        db.getLast24hTransactionFees(1)
            .then((res) => {
                expect(res).toEqual([{ day: '2022-04-05', transactionFees: 100 }]);
                done();
            });
    });
});
describe('getTransactionFeeHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getTransactionFeeHistory(1, '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return transaction fee history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getTransactionFeeHistory: jest.fn().mockResolvedValueOnce([{ day: '2022-04-05', transactionFees: 100 }])
        });
        db.getTransactionFeeHistory(1, '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([{ day: '2022-04-05', transactionFees: 100 }]);
                done();
            });
    });
});

describe('getBlockSizeHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getBlockSizeHistory(1, '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return block size history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getBlockSizeHistory: jest.fn().mockResolvedValueOnce([])
        });
        db.getBlockSizeHistory(1, '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getBlockTimeHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getBlockTimeHistory(1, '2022-04-05', '2022-04-15')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return block time history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getBlockTimeHistory: jest.fn().mockResolvedValueOnce([])
        });
        db.getBlockTimeHistory(1, '2022-04-05', '2022-04-15')
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getLatestGasSpenders', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLatestGasSpenders(1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas spenders', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLatestGasSpenders: jest.fn().mockResolvedValueOnce([])
        });
        db.getLatestGasSpenders(1, 1)
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getLatestGasConsumers', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLatestGasConsumers(1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas consumers', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLatestGasConsumers: jest.fn().mockResolvedValueOnce([])
        });
        db.getLatestGasConsumers(1, 1)
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getGasUtilizationRatioHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getGasUtilizationRatioHistory(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas utilization ratio history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getGasUtilizationRatioHistory: jest.fn().mockResolvedValueOnce([])
        });
        db.getGasUtilizationRatioHistory(1, '2024-06-01', '2024-06-10')
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getGasLimitHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getGasLimitHistory(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas limit history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getGasLimitHistory: jest.fn().mockResolvedValueOnce([])
        });
        db.getGasLimitHistory(1, '2024-06-01', '2024-06-10')
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getGasPriceHistory', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getGasPriceHistory(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas price history', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getGasPriceHistory: jest.fn().mockResolvedValueOnce([])
        });
        db.getGasPriceHistory(1, '2024-06-01', '2024-06-10')
            .then((res) => {
                expect(res).toEqual([]);
                done();
            });
    });
});

describe('getLatestGasStats', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getLatestGasStats(1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return gas stats', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getLatestGasStats: jest.fn().mockResolvedValueOnce({
                blockNumber: 10,
                averageBlockSize: 10,
                averageUtilization: 10,
                averageBlockTime: 10,
                latestBlockNumber: 10,
                baseFeePerGas: 10,
                priorityFeePerGas: 10
            })
        });
        db.getLatestGasStats(1, 1)
            .then((res) => {
                expect(res).toEqual({
                    blockNumber: 10,
                    averageBlockSize: 10,
                    averageUtilization: 10,
                    averageBlockTime: 10,
                    latestBlockNumber: 10,
                    baseFeePerGas: 10,
                    priorityFeePerGas: 10
                });
                done();
            });
    });
});

describe('getV2DexPairCount', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce(null);
        db.getV2DexPairCount('123', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should return pair count', (done) => {
        const countPairs = jest.fn().mockResolvedValue(10);
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce({ countPairs });
        db.getV2DexPairCount('123', 1)
            .then((res) => {
                expect(countPairs).toHaveBeenCalled();
                expect(res).toEqual(10);
                done();
            });
    });
});

describe('deleteV2Dex', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce(null);
        db.deleteV2Dex('123', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should call destroy function', (done) => {
        const safeDestroy = jest.fn().mockResolvedValue();
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce({ safeDestroy });
        db.deleteV2Dex('123', 1)
            .then(() => {
                expect(safeDestroy).toHaveBeenCalled();
                done();
            });
    });
});

describe('deactivateV2Dex', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce(null);
        db.deactivateV2Dex('123', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should update dex state', (done) => {
        const update = jest.fn().mockResolvedValue();
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce({ update });
        db.deactivateV2Dex('123', 1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ active: false });
                done();
            });
    });
});

describe('activateV2Dex', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce(null);
        db.activateV2Dex('123', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should update dex state', (done) => {
        const update = jest.fn().mockResolvedValue();
        jest.spyOn(ExplorerV2Dex, 'findOne').mockResolvedValueOnce({ update });
        db.activateV2Dex('123', 1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ active: true });
                done();
            });
    });
});

describe('getV2DexQuote', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce(null);
        db.getV2DexQuote(1, '0x123', '0xabc', '1000')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should return a quote', (done) => {
        const getQuote = jest.fn().mockResolvedValue({ amount: '1000' });
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({ getQuote });
        db.getV2DexQuote(1, '0x123', '0xabc', '1000')
            .then((res) => {
                expect(getQuote).toHaveBeenCalledWith('0x123', '0xabc', '1000', undefined, undefined);
                expect(res).toEqual({ amount: '1000' });
                done();
            });
    });
});

describe('createV2DexPair', () => {
    it('Should throw an error if no dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce(null);
        db.createV2DexPair(1, 1, '0x123', '0xabc', '0x456')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should create the dex pair', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            safeCreatePair: jest.fn().mockResolvedValue({ id: 1 })
        });
        db.createV2DexPair(1, 1, '0x123', '0xabc', '0x456')
            .then((res) => {
                expect(res).toEqual({ id: 1 });
                done();
            });
    });
});

describe('createExplorerV2Dex', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        db.createExplorerV2Dex(1, 1, '0x123', '0xabc', '0x456')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find explorer'));
                done();
            });
    });

    it('Should create explorer v2 dex', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            safeCreateV2Dex: jest.fn().mockResolvedValue({ id: 1 })
        });
        db.createExplorerV2Dex(1, 1, '0x123', '0xabc', '0x456')
            .then((res) => {
                expect(res).toEqual({ id: 1 });
                done();
            });
    });
});

describe('fetchPairsWithLatestReserves', () => {
    it('Should throw an error if could not find dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce(null);
        db.fetchPairsWithLatestReserves(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find dex'));
                done();
            });
    });

    it('Should return latest reserves', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            getPairsWithLatestReserves: jest.fn().mockResolvedValue([{ reserve0: '10000', reserve1: '20000' }])
        });
        db.fetchPairsWithLatestReserves(1)
            .then((res) => {
                expect(res).toEqual([{ reserve0: '10000', reserve1: '20000' }]);
                done();
            });
    });
});

describe('getFaucetTransactionHistory', () => {
    it('Should return transaction history', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce({
            getTransactionHistory: jest.fn().mockResolvedValue([{ amount: '1', date: '2024-06-10' }])
        });
        db.getFaucetTransactionHistory(1)
            .then((res) => {
                expect(res).toEqual([{ amount: '1', date: '2024-06-10' }]);
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce(null);
        db.getFaucetTransactionHistory(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('getFaucetTokenVolume', () => {
    it('Should return token volume', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce({
            getTokenVolume: jest.fn().mockResolvedValue([{ amount: '1', date: '2024-06-10' }])
        });
        db.getFaucetTokenVolume(1, '2024-06-01', '2024-06-10')
            .then((res) => {
                expect(res).toEqual([{ amount: '1', date: '2024-06-10' }]);
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce(null);
        db.getFaucetTokenVolume(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('getFaucetRequestVolume', () => {
    it('Should return request volume', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce({
            getRequestVolume: jest.fn().mockResolvedValue([{ count: 1, date: '2024-06-10' }])
        });
        db.getFaucetRequestVolume(1, '2024-06-01', '2024-06-10')
            .then((res) => {
                expect(res).toEqual([{ count: 1, date: '2024-06-10' }]);
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce(null);
        db.getFaucetRequestVolume(1, '2024-06-01', '2024-06-10')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('deleteFaucet', () => {
    it('Should delete faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce({
            safeDestroy: jest.fn().mockResolvedValue(true)
        });
        db.deleteFaucet('1', 1)
            .then((res) => {
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce(null);
        db.deleteFaucet('1', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('getExplorerFaucet', () => {
    it('Should return faucet', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({
            getFaucet: jest.fn().mockResolvedValue({ amount: '123' })
        });
        db.getExplorerFaucet(1)
            .then((res) => {
                expect(res).toEqual({ amount: '123' });
                done();
            });
    });

    it('Should throw an error if could not find explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        db.getExplorerFaucet(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find explorer'));
                done();
            });
    });
});

describe('createFaucetDrip', () => {
    it('Should return created faucet drip', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce({
            safeCreateDrip: jest.fn().mockResolvedValue({ amount: '123' })
        });
        db.createFaucetDrip(1, '0x123', '123', '0xabc')
            .then((res) => {
                expect(res).toEqual({ amount: '123' });
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce(null);
        db.createFaucetDrip(1, '0x123', '123', '0xabc')
            .catch(error => {
                expect(error).toEqual(new Error(`Can't find faucet`));
                done();
            });
    });
});

describe('getFaucetCooldown', () => {
    it('Should return faucet cooldown', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce({
            getCooldown: jest.fn().mockResolvedValue(120)
        });
        db.getFaucetCooldown('1', '0x123')
            .then((res) => {
                expect(res).toEqual(120);
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findByPk').mockResolvedValueOnce(null);
        db.getFaucetCooldown('1', '0x123')
            .catch(error => {
                expect(error).toEqual(new Error(`Can't find faucet`));
                done();
            });
    });
});

describe('deactivateFaucet', () => {
    it('Should return deactivated faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce({
            deactivate: jest.fn().mockResolvedValue({ amount: '123' })
        });
        db.deactivateFaucet('1', 1)
            .then((res) => {
                expect(res).toEqual({ amount: '123' });
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce(null);
        db.deactivateFaucet('1', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('activateFaucet', () => {
    it('Should return activated faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce({
            activate: jest.fn().mockResolvedValue({ amount: '123' })
        });
        db.activateFaucet('1', 1)
            .then((res) => {
                expect(res).toEqual({ amount: '123' });
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce(null);
        db.activateFaucet('1', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});


describe('updateFaucet', () => {
    it('Should return updated faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce({
            safeUpdate: jest.fn().mockResolvedValue({ amount: '123' })
        });
        db.updateFaucet('1', 1, '1000', 10)
            .then((res) => {
                expect(res).toEqual({ amount: '123' });
                done();
            });
    });

    it('Should throw an error if could not find faucet', (done) => {
        jest.spyOn(ExplorerFaucet, 'findOne').mockResolvedValueOnce(null);
        db.updateFaucet('1', 1, '1000', 10)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find faucet'));
                done();
            });
    });
});

describe('createFaucet', () => {
    it('Should return created faucet', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({
            safeCreateFaucet: jest.fn().mockResolvedValue({ address: '0x123' })
        });
        db.createFaucet('1', 1, '1000', 10)
            .then((res) => {
                expect(res).toEqual({ address: '0x123' });
                done();
            });
    });

    it('Should throw an error if could not find explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        db.createFaucet('1', 1, '1000', 10)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find explorer'));
                done();
            });
    });
});

describe('destroyStripeQuotaExtension', () => {
    it('Should throw an error if no subscription', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce(null);
        db.destroyStripeQuotaExtension(1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find Stripe subscription'));
                done();
            });
    });

    it('Should destroy stripe quota extension locally', (done) => {
        const safeDestroyStripeQuotaExtension = jest.fn();
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce({ id: 1, safeDestroyStripeQuotaExtension });
        db.destroyStripeQuotaExtension(1)
            .then(() => {
                expect(safeDestroyStripeQuotaExtension).toHaveBeenCalledWith();
                done();
            });
    });
});

describe('updateStripeQuotaExtension', () => {
    it('Should throw an error if no subscription', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce(null);
        db.updateStripeQuotaExtension(1, 10000)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find Stripe subscription'));
                done();
            });
    });

    it('Should update stripe quota extension locally', (done) => {
        const safeUpdateStripeQuotaExtension = jest.fn();
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce({ id: 1, safeUpdateStripeQuotaExtension });
        db.updateStripeQuotaExtension(1, 10000)
            .then(() => {
                expect(safeUpdateStripeQuotaExtension).toHaveBeenCalledWith(10000);
                done();
            });
    });
});

describe('createStripeQuotaExtension', () => {
    it('Should throw an error if no subscription', (done) => {
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce(null);
        db.createStripeQuotaExtension(1, 1, 1, 10000)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find Stripe subscription'));
                done();
            });
    });

    it('Should create stripe quota extension locally', (done) => {
        const safeCreateStripeQuotaExtension = jest.fn();
        jest.spyOn(StripeSubscription, 'findByPk').mockResolvedValueOnce({ id: 1, safeCreateStripeQuotaExtension });
        db.createStripeQuotaExtension(1, 1, 1, 10000)
            .then(() => {
                expect(safeCreateStripeQuotaExtension).toHaveBeenCalledWith(1, 1, 10000);
                done();
            });
    });
});

describe('getTransactionLogs', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        db.getTransactionLogs(1, '0xa')
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should return logs & count', (done) => {
        const getTransactionLogs = jest.fn().mockResolvedValueOnce({ count: 1, rows: [{ data: '0x' }]});
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getTransactionLogs });
        db.getTransactionLogs(1, '0xa')
            .then(res => {
                expect(res).toEqual({ count: 1, logs: [{ data: '0x' }]});
                done();
            });
    });
});

describe('markWorkspaceForDeletion', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce(null);
        db.markWorkspaceForDeletion(1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Could not find workspace'));
                done();
            });
    });

    it('Should update the workspace', (done) => {
        const update = jest.fn();
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ update });
        db.markWorkspaceForDeletion(1, 1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ pendingDeletion: true, public: false });
                done();
            });
    });
});

describe('updateQuicknodeSubscription', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        db.updateQuicknodeSubscription(1, 1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find explorer'));
                done();
            });
    });

    it('Should throw an error if no subscription', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ stripeSubscription: null });
        db.updateQuicknodeSubscription(1, 1, 1)
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find subscription'));
                done();
            });
    });

    it('Should update the subscription', (done) => {
        const update = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ stripeSubscription: { update }});
        db.updateQuicknodeSubscription(1, 1, 1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ stripePlanId: 1 });
                done();
            });
    });
});

describe('createQuicknodeWorkspace', () => {
    it('Should throw an error if no user', (done) => {
        jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
        db.createQuicknodeWorkspace(1, 1, 'a', 'a', 1)
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find user'));
                done();
            });
    });

    it('Should create a workspace', (done) => {
        const safeCreateWorkspace = jest.fn();
        jest.spyOn(User, 'findOne').mockResolvedValueOnce({ safeCreateWorkspace });
        db.createQuicknodeWorkspace(1, 1, 'a', 'a', 1)
            .then(() => {
                expect(safeCreateWorkspace).toHaveBeenCalled();
                done();
            });
    });
})

describe('workspaceNeedsBatchReset', () => {
    it('Should throw an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce(null);
        db.workspaceNeedsBatchReset(1, 1, new Date(0), new Date(1000))
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find workspace'));
                done();
            });
    });

    it('Should return false if under limit', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([{ id: 1 }]);
        jest.spyOn(env, 'getMaxBlockForSyncReset').mockImplementation(() => 2);
        jest.spyOn(Workspace, 'findOne').mockResolvedValue({ getBlocks });
        db.workspaceNeedsBatchReset(1, 1)
            .then(res => {
                expect(res).toEqual(false);
                done();
            });
    });

    it('Should return true if at the limit', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
        jest.spyOn(env, 'getMaxBlockForSyncReset').mockImplementation(() => 2);
        jest.spyOn(Workspace, 'findOne').mockResolvedValue({ getBlocks });
        db.workspaceNeedsBatchReset(1, 1)
            .then(res => {
                expect(res).toEqual(true);
                done();
            });
    });
});

describe('resetExplorerTransactionQuota', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        db.resetExplorerTransactionQuota(1, 1)
            .catch(error => {
                expect(error).toEqual(new Error(`Can't find explorer`));
                done();
            });
    });

    it('Should reset quota', (done) => {
        const resetTransactionQuota = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ resetTransactionQuota });
        db.resetExplorerTransactionQuota(1, 1)
            .then(() => {
                expect(resetTransactionQuota).toHaveBeenCalled();
                done();
            });
    });
});

describe('makeExplorerDemo', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        db.makeExplorerDemo(1, 1, {})
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find explorer'));
                done();
            });
    });

    it('Should update explorer', (done) => {
        const update = jest.fn();
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ update });
        db.makeExplorerDemo(1, 1, {})
            .then(() => {
                expect(update).toHaveBeenCalledWith({ isDemo: true });
                done();
            });
    });
});

describe('migrateDemoExplorer', () => {
    it('Should throw an error if no user', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce(null);
        db.migrateDemoExplorer(1, 1, {})
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find user'));
                done();
            });
    });

    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        db.migrateDemoExplorer(1, 1, {})
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find explorer'));
                done();
            });
    });

    it('Should call explorer creation function', (done) => {
        const migrateDemoTo = jest.fn();
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ migrateDemoTo });
        db.migrateDemoExplorer(1, 1, {})
            .then(() => {
                expect(migrateDemoTo).toHaveBeenCalledWith(1, {});
                done();
            });
    });
});

describe('getExplorerById', () => {
    it('Should not look for demo explorers', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1})});
        db.getExplorerById(1, 1)
            .then(() => {
                expect(Explorer.findOne).toHaveBeenCalledWith({
                    where: { id: 1, userId: 1 },
                    include: expect.anything()
                });
                done();
            })
    });

    it('Should look for demo explorers', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1})});
        db.getExplorerById(1, 1, true)
            .then(() => {
                expect(Explorer.findOne).toHaveBeenCalledWith({
                    where: {'or': [{ id: 1, userId: 1, isDemo: false }, { id: 1, userId: 1, isDemo: true }]},
                    include: expect.anything()
                });
                done();
            })
    });

    it('Should return explorer', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1})});
        db.getExplorerById(1, 1)
            .then(res => {
                expect(res).toEqual({ toJSON: expect.anything() });
                done();
            })
    });

    it('Should return null if explorer is not found', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        db.getExplorerById(1, 1)
            .then(res => {
                expect(res).toEqual(null)
                done();
            });
    });
});

describe('createExplorerWithWorkspace', () => {
    it('Should throw an error if no user', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce(null);
        db.createExplorerWithWorkspace(1, { name: 'explorer' })
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find user'));
                done();
            });
    });

    it('Should create the explorer and workspace', (done) => {
        const safeCreateWorkspaceWithExplorer = jest.fn();
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ safeCreateWorkspaceWithExplorer });
        db.createExplorerWithWorkspace(1, { name: 'explorer' })
            .then(() => {
                expect(safeCreateWorkspaceWithExplorer).toHaveBeenCalledWith({ name: 'explorer' });
                done();
            });
    });
});

describe('stopExplorerSync', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        db.stopExplorerSync(1)
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find explorer'));
                done();
            });
    });

    it('Should update the explorer', (done) => {
        const update = jest.fn();
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ update });
        db.stopExplorerSync(1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ shouldSync: false });
                done();
            });
    });
});

describe('startExplorerSync', () => {
    it('Should throw an error if no explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        db.startExplorerSync(1)
            .catch(error => {
                expect(error).toEqual(new Error('Cannot find explorer'));
                done();
            });
    });

    it('Should update the explorer', (done) => {
        const update = jest.fn();
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ update });
        db.startExplorerSync(1)
            .then(() => {
                expect(update).toHaveBeenCalledWith({ shouldSync: true });
                done();
            });
    });
});

describe('resetFailedAttempts', () => {
    it('Should return null if no healthcheck', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ rpcHealthCheck: null });
        db.resetFailedAttempts(1)
            .then(res => {
                expect(res).toEqual(null);
                done();
            })
    });

    it('Should call reset method', (done) => {
        const resetFailedAttempts = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ rpcHealthCheck: { resetFailedAttempts }});
        db.resetFailedAttempts(1)
            .then(() => {
                expect(resetFailedAttempts).toHaveBeenCalled();
                done();
            });
    });
});


describe('incrementFailedAttempts', () => {
    it('Should return null if no healthcheck', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ rpcHealthCheck: null });
        db.incrementFailedAttempts(1)
            .then(res => {
                expect(res).toEqual(null);
                done();
            })
    });

    it('Should call increment method', (done) => {
        const incrementFailedAttempts = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ rpcHealthCheck: { incrementFailedAttempts }});
        db.incrementFailedAttempts(1)
            .then(() => {
                expect(incrementFailedAttempts).toHaveBeenCalled();
                done();
            });
    });
});

describe('canUserSyncBlock', () => {
    it('Should return true if user is premium', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ isPremium: true });
        db.canUserSyncBlock(1)
            .then(res => {
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should return true if user has only one workspace', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ isPremium: false, workspaces: [{ id: 1 }]});
        db.canUserSyncBlock(1)
            .then(res => {
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should return false if user is not premium and has multiple workspaces', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ isPremium: false, workspaces: [{ id: 1 }, { id: 2 }]});
        db.canUserSyncBlock(1)
            .then(res => {
                expect(res).toEqual(false);
                done();
            });
    });
});

describe('deleteWorkspace', () => {
    it('Should delete the workspace', (done) => {
        const workspace = { userId: 1, safeDelete: jest.fn() };
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(workspace);
        db.deleteWorkspace(1, 1)
            .then(() => {
                expect(workspace.safeDelete).toHaveReturnedWith();
                done();
            });
    });

    it('Should retun an error if workspace/user mismatch', (done) => {
        const workspace = { userId: 1 };
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(workspace);
        db.deleteWorkspace(2, 1)
            .catch(error => {
                expect(error.message).toEqual('Cannot find workspace');
                done();
            });
    });
});

describe('storeTransactionReceipt', () => {
    const safeCreateReceipt = jest.fn();
    jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({ safeCreateReceipt });
    it('Should call the receipt creation function', (done) => {
        db.storeTransactionReceipt(1, { transactionHash: '0x123' })
            .then(() => {
                expect(safeCreateReceipt).toHaveBeenCalledWith({ transactionHash: '0x123' });
                done();
            });
    });
});

describe('disableUserTrial', () => {
    it('Should call the disableTrials function', (done) => {
        const disableTrialMode = jest.fn();
        jest.spyOn(User, 'findByPk').mockResolvedValue({ disableTrialMode });
        db.disableUserTrial(1)
            .then(() => {
                expect(disableTrialMode).toHaveBeenCalled();
                done();
            })
    });

    it('Should throw an error if cannot find user', async () => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.disableUserTrial(1))
            .rejects.toThrow('Cannot find user');
    });
});

describe('getExplorerDomainById', () => {
    it('Should return domain if found', (done) => {
        jest.spyOn(ExplorerDomain, 'findOne').mockResolvedValue({ toJSON: jest.fn().mockReturnValue({ id: 1})});
        db.getExplorerDomainById(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should return null if not found', (done) => {
        jest.spyOn(ExplorerDomain, 'findOne').mockResolvedValue(null);
        db.getExplorerDomainById(1, 1)
            .then(res => {
                expect(res).toEqual(null);
                done();
            })
    });
});

describe('deleteExplorerDomain', () => {
    it('Should return if domain has ben deleted', (done) => {
        jest.spyOn(ExplorerDomain, 'findOne').mockResolvedValueOnce({ destroy: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.deleteExplorerDomain(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if not found', async () => {
        jest.spyOn(ExplorerDomain, 'findOne').mockResolvedValueOnce(null);
        await expect(db.deleteExplorerDomain(1, 1))
            .rejects.toThrow('Could not find domain');
    });
});

describe('createExplorerDomain', () => {
    it('Should return created domain', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ safeCreateDomain: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.createExplorerDomain(1, 'domain')
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if not found', async () => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.createExplorerDomain(1, 1))
            .rejects.toThrow('Cannot find explorer');
    });
});

describe('deleteExplorer', () => {
    it('Should return if explorer has been deleted', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeDelete: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.deleteExplorer(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.deleteExplorer(1, 1))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('createExplorerFromWorkspace', () => {
    it('Should return created explorer', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ safeCreateExplorer: jest.fn().mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1 })})});
        db.createExplorerFromWorkspace(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should return null if could not create explorer', (done) => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ safeCreateExplorer: jest.fn().mockReturnValue(null)});
        db.createExplorerFromWorkspace(1, 1)
            .then(res => {
                expect(res).toEqual(null);
                done();
            })
    });

    it('Should throw an error if workspace is not found', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce(null);
        await expect(db.createExplorerFromWorkspace(1, 1))
            .rejects.toThrow(`Could not find workspace`);
    });
});

describe('deleteExplorerSubscription', () => {
    it('Should return if explorer has been deleted', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeDeleteSubscription: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.deleteExplorerSubscription(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.deleteExplorerSubscription(1, 1))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('cancelExplorerSubscription', () => {
    it('Should return if explorer has been canceled', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCancelSubscription: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.cancelExplorerSubscription(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.cancelExplorerSubscription(1, 1))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('revertExplorerSubscriptionCancelation', () => {
    it('Should return if cancelation has been reverted', (done) => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeRevertSubscriptionCancelation: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.revertExplorerSubscriptionCancelation(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.revertExplorerSubscriptionCancelation(1, 1))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('updateExplorerSubscription', () => {
    it('Should update subscription', (done) => {
        const safeUpdateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'active',
            current_period_end: 1,
            customer: { invoice_settings: {} }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        db.updateExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'active');
                done();
            })
    });

    it('Should throw an error if plan is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ id: 1 });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateExplorerSubscription(1, 1, 1, {}))
            .rejects.toThrow(`Can't find plan`);
    });

    it('Should update the subscription to a free plan without a stripe subscription', (done) => {
        const safeUpdateSubscription = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 0 });

        db.updateExplorerSubscription(1, 1, 1, null)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, undefined, new Date(0), 'active');
                done();
            })
    });

    it('Should update to a trial without a card', (done) => {
        const safeUpdateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'trialing',
            current_period_end: 1,
            customer: { invoice_settings: {} }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        db.updateExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial');
                done();
            })
    });

    it('Should update to a trial with a card if customer has a default source', (done) => {
        const safeUpdateSubscription = jest.fn();
        const stripeSubscription = {
            status: 'trialing',
            id: '1',
            current_period_end: 1,
            customer: { default_source: 'yes' }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        db.updateExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial_with_card');
                done();
            })
    });

    it('Should update to a trial with a card if customer has a default payment method', (done) => {
        const safeUpdateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'trialing',
            current_period_end: 1,
            customer: { invoice_settings: { default_payment_method: 'yes' }}
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        db.updateExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial_with_card');
                done();
            })
    });

    it('Should update a subscription without a subscription object', (done) => {
        const safeUpdateSubscription = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeUpdateSubscription });
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        db.updateExplorerSubscription(1, 1, 1)
            .then(() => {
                expect(safeUpdateSubscription).toHaveBeenCalledWith(1, undefined, new Date(0), 'active');
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        jest.spyOn(StripePlan, 'findByPk').mockResolvedValueOnce({ price: 1 });

        await expect(db.updateExplorerSubscription(1, 1, 1))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('createExplorerSubscription', () => {
    it('Should create an active subscription', (done) => {
        const safeCreateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'active',
            current_period_end: 1,
            customer: { invoice_settings: {} }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCreateSubscription });
        db.createExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeCreateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'active');
                done();
            })
    });

    it('Should create a trial without a card', (done) => {
        const safeCreateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'trialing',
            current_period_end: 1,
            customer: { invoice_settings: {} }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCreateSubscription });
        db.createExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeCreateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial');
                done();
            })
    });

    it('Should create a trial with a card if customer has a default source', (done) => {
        const safeCreateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'trialing',
            current_period_end: 1,
            customer: { default_source: 'yes' }
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCreateSubscription });
        db.createExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeCreateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial_with_card');
                done();
            })
    });

    it('Should create a trial with a card if customer has a default payment method', (done) => {
        const safeCreateSubscription = jest.fn();
        const stripeSubscription = {
            id: '1',
            status: 'trialing',
            current_period_end: 1,
            customer: { invoice_settings: { default_payment_method: 'yes' }}
        }
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCreateSubscription });
        db.createExplorerSubscription(1, 1, 1, stripeSubscription)
            .then(() => {
                expect(safeCreateSubscription).toHaveBeenCalledWith(1, '1', new Date(1000), 'trial_with_card');
                done();
            })
    });

    it('Should create a subscription without a subscription object', (done) => {
        const safeCreateSubscription = jest.fn();
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ safeCreateSubscription });
        db.createExplorerSubscription(1, 1, 1)
            .then(() => {
                expect(safeCreateSubscription).toHaveBeenCalledWith(1, undefined, new Date(0), 'active');
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.createExplorerSubscription(1, 1, 1, 1, new Date()))
            .rejects.toThrow(`Can't find explorer`);
    });
});

describe('getExplorerPlans', () => {
    it('Should return plans', (done) => {
        jest.spyOn(StripePlan, 'findAll').mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
        db.getExplorerPlans()
            .then(res => {
                expect(res).toEqual([{ id: 1 }, { id: 2 }]);
                done();
            })
    });
});

describe('getStripePlan', () => {
    it('Should return plan', (done) => {
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1 })});
        db.getStripePlan()
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should return null if plan does not exist', (done) => {
        jest.spyOn(StripePlan, 'findOne').mockResolvedValueOnce(null);
        db.getStripePlan()
            .then(res => {
                expect(res).toEqual(null);
                done();
            })
    });
});

describe('updateExplorerBranding', () => {
    it('Should return updated explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ safeUpdateBranding: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.updateExplorerBranding(1, {})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.updateExplorerBranding(1, {}))
            .rejects.toThrow('Cannot find explorer');
    });
});

describe('updateExplorerSettings', () => {
    it('Should return updated explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ safeUpdateSettings: jest.fn().mockResolvedValueOnce({ id: 1})});
        db.updateExplorerSettings(1, {})
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        await expect(db.updateExplorerSettings(1, {}))
            .rejects.toThrow('Cannot find explorer');
    });
});

describe('updateExplorerWorkspace', () => {
    it('Should return updated explorer', (done) => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ userId: 1,  update: jest.fn().mockResolvedValueOnce({ id: 1})});
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, userId: 1 });

        db.updateExplorerWorkspace(1, 1)
            .then(res => {
                expect(res).toEqual({ id: 1 });
                done();
            })
    });

    it('Should throw an error if explorer is not found', async () => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateExplorerWorkspace(1, {}))
            .rejects.toThrow('Cannot find explorer');
    });

    it('Should throw an error if workspace is not found', async () => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ update: jest.fn().mockResolvedValueOnce({ id: 1})});
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.updateExplorerWorkspace(1, {}))
            .rejects.toThrow('Cannot find workspace');
    });

    it('Should throw an error if workspace user and explorer user do not match', async () => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce({ userId: 1, update: jest.fn().mockResolvedValueOnce({ id: 1})});
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ userId: 2 });
        await expect(db.updateExplorerWorkspace(1, {}))
            .rejects.toThrow('Invalid workspace');
    });
});

describe('getUserExplorers', () => {
    it('Should return explorer list & count', (done) => {
        jest.spyOn(Explorer, 'findAndCountAll').mockResolvedValueOnce({ count: 1, rows: [{ toJSON: jest.fn().mockReturnValue({ id: 1})}]});
        db.getUserExplorers(1)
            .then(res => {
                expect(res).toEqual({ items: [{ id: 1 }], total: 1 });
                done();
            })
    });
});

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

describe('getAddressTransactionStats', () => {
    it('Should throw an error if workspace does not exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        await expect(db.getAddressTransactionStats(1, '0x123'))
            .rejects.toThrow('Cannot find workspace');
    });

    it('Should return transaction stats', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            tracing: true,
            countAddressTokenTransfers: jest.fn().mockResolvedValueOnce(1),
            getAddressTransactionStats: jest.fn().mockResolvedValueOnce({
                tokenTransferCount: 1,
            }),
            countAddressTransactionTraceSteps: jest.fn().mockResolvedValueOnce(1)
        });

        db.getAddressTransactionStats(1, '0x123')
            .then(res => {
                expect(res).toEqual({ tokenTransferCount: 1, internalTransactionCount: 1 });
                done();
            });
    });

    it('Should return transaction stats without internal transactions', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            tracing: false,
            countAddressTokenTransfers: jest.fn().mockResolvedValueOnce(1),
            getAddressTransactionStats: jest.fn().mockResolvedValueOnce({
                tokenTransferCount: 1
            })
        });

        db.getAddressTransactionStats(1, '0x123')
            .then(res => {
                expect(res).toEqual({ tokenTransferCount: 1 });
                done();
            });
    });
});

describe('getTransactionTokenTransfers', () => {
    it('Should return token transfers if transaction exists', (done) => {
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce({
            getFilteredTokenTransfers: jest.fn().mockResolvedValueOnce({
                items: [{ address: '0x123' }],
                total: 1
            })
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
        jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce(null);
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

        db.getTokenHolderHistory(1, '0x123', 'from', 'to')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});

describe('getTokenCirculatingSupply', () => {
    const getTokenCirculatingSupply = jest.fn().mockResolvedValueOnce([{ timestamp: 1, amount: 1 }]);
    it('Should return token circulating supply if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({
            getTokenCirculatingSupply
        });

        db.getTokenCirculatingSupply(1, 'from', 'to', '0x123')
            .then(res => {
                expect(res).toEqual([{ timestamp: 1, amount: 1 }]);
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);

        db.getTokenCirculatingSupply(1, 'from', 'to', '0x123')
            .catch(res => {
                expect(res.message).toEqual(`Can't find contract at this address`);
                done();
            });
    });
});


describe('getTokenTransferVolume', () => {
    it('Should return token volume if contract exists', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce({ address: '0x1' });
        jest.spyOn(workspace, 'getTokenTransferVolume').mockResolvedValueOnce([{ timestamp: 1, count: 1 }]);

        db.getTokenTransferVolume(1, 'from', 'to', '0x123')
            .then(res => {
                expect(res).toEqual([{ timestamp: 1, count: 1 }]);
                done();
            });
    });

    it('Should fail if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenTransferVolume(1, 'from', 'to', '0x123')
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
            getCurrentTokenCirculatingSupply: jest.fn().mockResolvedValueOnce(4)
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

    it('Should return null values if contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getTokenStats(1, '0x123')
            .then(res => {
                expect(res).toEqual(
                    {
                        tokenHolderCount: null,
                        transactionCount: null,
                        tokenTransferCount: null,
                        tokenCirculatingSupply: null
                    }
                );
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
                        items: [
                            { address: '0x123' }
                        ]
                    }
                );
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
    it('Should return an empty array if the contract does not exist', (done) => {
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getErc721TokenTransfers(1, '0x123', 1)
            .then(transfers => {
                expect(transfers).toEqual([]);
                done();
            });
    });

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

describe('getCumulativeDeployedContractCount', () => {
    it('Should return cumulative contract count', done => {
        const getCumulativeDeployedContractCount = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getCumulativeDeployedContractCount
        })

        db.getCumulativeDeployedContractCount(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getCumulativeDeployedContractCount(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getDeployedContractCount', () => {
    it('Should return contract count', done => {
        const getDeployedContractCount = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getDeployedContractCount
        })

        db.getDeployedContractCount(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getDeployedContractCount(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getUniqueWalletCount', () => {
    it('Should return wallet count', done => {
        const getUniqueWalletCount = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getUniqueWalletCount
        })

        db.getUniqueWalletCount(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getUniqueWalletCount(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getCumulativeWalletCount', () => {
    it('Should return cumulative wallet count', done => {
        const getCumulativeWalletCount = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getCumulativeWalletCount
        })

        db.getCumulativeWalletCount(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getCumulativeWalletCount(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getAverageGasPrice', () => {
    it('Should return average gas price', done => {
        const getAverageGasPrice = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAverageGasPrice
        })

        db.getAverageGasPrice(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getAverageGasPrice(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getAverageTransactionFee', () => {
    it('Should return average transaction fee', done => {
        const getAverageTransactionFee = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getAverageTransactionFee
        })

        db.getAverageTransactionFee(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getAverageTransactionFee(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getTransactionVolume', () => {
    it('Should return transaction volume', done => {
        const getTransactionVolume = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getTransactionVolume
        })
        db.getTransactionVolume(1, '2024-01-01', '2024-01-14')
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getTransactionVolume(1, '2024-01-01', '2024-01-14')
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getActiveWalletCount', () => {
    it('Should return active wallet count', done => {
        const countActiveWallets = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            countActiveWallets
        })
        db.getActiveWalletCount(1)
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getActiveWalletCount(1)
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
                done();
            });
    });
});

describe('getTotalTxCount', () => {
    it('Should return total tx count', done => {
        const getTransactionCount = jest.fn().mockResolvedValueOnce([{ timestamp: '2024-01-01', count: 1 }]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            getTransactionCount
        })
        db.getTotalTxCount(1)
            .then(res => {
                expect(res).toEqual([{ timestamp: '2024-01-01', count: 1 }]);
                done();
            });
    });

    it('Should return an error if no workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        db.getTotalTxCount(1)
            .catch(res => {
                expect(res.message).toEqual('Could not find workspace');
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
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            findTransaction: jest.fn().mockResolvedValueOnce({ toJSON: () => ({ hash: '0x123' }) })
        });

        db.searchForHash(1, '0x123')
            .then(transactions => {
                expect(transactions).toEqual([
                    { type: 'transaction', data: { hash: '0x123' }}
                ]);
                done();
            });
    });

    it('Should return block if hash matches', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            findTransaction: jest.fn().mockResolvedValueOnce(null),
            findBlockByHash: jest.fn().mockResolvedValueOnce({ toJSON: () => ({ number: 1 }) })
        });

        db.searchForHash(1, '0x123')
            .then(blocks => {
                expect(blocks).toEqual([
                    { type: 'block', data: { number: 1 }}
                ]);
                done();
            });
    });

    it('Should return an empty array if no match', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            findTransaction: jest.fn().mockResolvedValueOnce(null),
            findBlockByHash: jest.fn().mockResolvedValueOnce(null)
        });

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
    it('Should return the block', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValueOnce({ toJSON: () => ({ number: 1 })});
        db.getWorkspaceBlock(1, 2, false)
            .then(block => {
                expect(block).toEqual({ number: 1 });
                done();
            });
    });
});

describe('getWorkspaceBlocks', () => {
    it('Should return blocks list', (done) => {
        db.getWorkspaceBlocks(1)
            .then(result => {
                expect(result).toEqual({
                    items: [{ number: 1 }, { number: 2 }]
                });
                done();
            });
    });
});

describe('getWorkspaceTransaction', () => {
    it('Should return the transaction', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            findTransaction: jest.fn().mockResolvedValueOnce({ toJSON: () => ({ hash: '0x123' }) })
        });

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
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ toJSON: jest.fn().mockReturnValue({ id: 1, workspaces: [{ id: 1 }]}) });
        db.getUserById(1)
            .then(user => {
                expect(user).toEqual({ id: 1, workspaces: [{ id: 1 }]});
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
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findBlockByNumber: jest.fn().mockResolvedValueOnce({ number: 1 }),
                    findTransaction: jest.fn().mockResolvedValueOnce(null),
                    safeCreateTransaction: jest.fn().mockResolvedValueOnce({ toJSON: () => ({ hash: '0x123' }) })
                }
            ]
        });

        const transaction = await db.storeTransaction('123', 'My Workspace', { hash: '0x123' });
        expect(transaction).toEqual({ hash: '0x123' });
    });

    it('Should return null if the transaction exists', async () => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findBlockByNumber: jest.fn().mockResolvedValueOnce({ number: 1 }),
                    findTransaction: jest.fn().mockResolvedValueOnce({ hash: '0x123' })
                }
            ]
        });

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
        const safeCreateTokenTransfer = jest.fn().mockResolvedValueOnce({});
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce({
                        safeCreateTokenTransfer: safeCreateTokenTransfer
                    })
                }
            ]
        });
        await db.storeTransactionTokenTransfers('123', 'My Workspace', '0x123', [{ token: '0xabc' }, { token: '0xdef' }]);
        expect(safeCreateTokenTransfer).toHaveBeenCalledTimes(2);
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce(null)
                }
            ]
        });
        await expect(db.storeTransactionTokenTransfers('123', 'My Workspace', '0x123', [{ token: '0xabc' }, { token: '0xdef' }]))
            .rejects.toThrow(`Couldn't find transaction`);
    });
});

describe('storeContractData', () => {
    it('Should return contract', (done) => {
        jest.spyOn(workspace, 'safeCreateOrUpdateContract').mockResolvedValueOnce({ toJSON: () => ({ id: 10, address: '0x123' })});
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
        jest.spyOn(Contract, 'findOne').mockResolvedValueOnce({ toJSON: () => ({ id: 10, address: '0x123' }) });
        db.getContractByHashedBytecode('123', 'My Workspace', '0x123')
            .then(contract => {
                expect(contract).toEqual({ id: 10, address: '0x123' });
                done();
            });
    });

    it('Should return null if the contract does not exist', async () => {
        jest.spyOn(Contract, 'findOne').mockResolvedValueOnce(null);

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
    it('Should call the store method', async () => {
        const safeCreateTransactionTrace = jest.fn();
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce({ safeCreateTransactionTrace })
                }
            ]
        });
        await db.storeTrace('123', 'My Workspace', '0x123', [{ op: 'CALL' }, { op: 'CALLDATA' }]);
        expect(safeCreateTransactionTrace).toHaveBeenCalledWith([{ op: 'CALL' }, { op: 'CALLDATA' }]);
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce(null)
                }
            ]
        });
        await expect(db.storeTrace('123', 'My Workspace', '0x123', [{ op: 'CALL' }, { op: 'CALLDATA' }]))
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
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce({ updateFailedTransactionError: jest.fn(), toJSON: () => ({ hash: '0x123' }) })
                }
            ]
        });
        db.storeFailedTransactionError('123', 'My Workspace', '0x123', { parsedError: 'Error' })
            .then(transaction => {
                expect(transaction).toEqual({ hash: '0x123' });
                done()
            });
    });

    it('Should throw an error if the transaction does not exist', async () => {
        jest.spyOn(User, 'findByAuthIdWithWorkspace').mockResolvedValueOnce({
            workspaces: [
                {
                    findTransaction: jest.fn().mockResolvedValueOnce(null)
                }
            ]
        });
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
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ getWorkspaces: jest.fn().mockResolvedValueOnce([workspace]) });
        db.getContractDeploymentTxByAddress('123', 'My Workspace', '0x123')
            .then(transaction => {
                expect(transaction).toEqual({ hash: '0x123' });
                done();
            });
    });

    it('Should return null if the transaction does not exist', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ getWorkspaces: jest.fn().mockResolvedValueOnce([workspace]) });
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
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ getWorkspaces: jest.fn().mockResolvedValueOnce([workspace]) });
        db.updateContractVerificationStatus('123', 'My Workspace', '0x123', 'invalid')
            .then(result => {
                expect(result).toBe(null);
                done();
            });
    });

    it('Should return the updated contract if the status is valid', (done) => {
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ getWorkspaces: jest.fn().mockResolvedValueOnce([workspace]) });
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
        jest.spyOn(User, 'findByPk').mockResolvedValueOnce({ getWorkspaces: jest.fn().mockResolvedValueOnce([workspace]) });
        jest.spyOn(workspace, 'findContractByAddress').mockResolvedValueOnce(null);
        db.getContract('123', 'hardhat', '0x123')
            .then((contract) => {
                expect(contract).toEqual(null);
                done();
            });
    });
});

describe('getImportedAccounts', () => {
    it('Should return the account list with the total', (done) => {
        jest.spyOn(workspace, 'getFilteredImportedAccounts').mockResolvedValueOnce([{ toJSON: () => ({ address: '0x123' }) }]);
        jest.spyOn(workspace, 'countAccounts').mockResolvedValueOnce(1);
        db.getImportedAccounts('123', 'hardhat', 1, 10)
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
