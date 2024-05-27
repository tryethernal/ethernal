require('../mocks/lib/rateLimiter');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');
const { Transaction } = require('../mocks/models');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');
const { enqueue } = require('../../lib/queue');

const receiptSync = require('../../jobs/receiptSync');

beforeEach(() => jest.resetAllMocks());

describe('receiptSync', () => {
    it('Should throw an error if receipt is not available', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                id: 1,
                rpcServer: 'rpc',
                explorer: {
                    shouldSync: true,
                    stripeSubscription: { status: 'active' }
                }
            }
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn().mockResolvedValueOnce(null)
        }));

        receiptSync({ data : { transactionId: 1 }})
            .catch(error => {
                expect(error.message).toEqual('Failed to fetch receipt');
                done();
            });
    });

    it('Should return if already a receipt', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                rpcServer: 'rpc',
                explorer: {
                    stripeSubscription: { status: 'active' }
                }
            },
            receipt: {}
        });

        receiptSync({ data : { transactionId: 1 }})
            .then(res => {
                expect(res).toEqual('Receipt has already been synced');
                done();
            });
    });

    it('Should re-enqueue if rate limited', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            hash: '0x123',
            workspace: {
                id: 1,
                rpcServer: 'rpc',
                rateLimitInterval: 5000,
                explorer: {
                    stripeSubscription: { status: 'active' }
                }
            },
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn().mockRejectedValueOnce({ message: 'Rate limited' })
        }));

        receiptSync({ opts: { priority: 1 }, data : { transactionId: 1, source: 'cli-light', rateLimited: true }})
            .then(res => {
                expect(enqueue).toHaveBeenCalledWith('receiptSync', 'receiptSync-1-0x123', {
                    transactionId: 1,
                    source: 'cli-light',
                    rateLimited: true
                }, 1, null, 5000);
                expect(res).toEqual('Re-enqueuing: Rate limited');
                done();
            });
    });

    it('Should return if RPC is unreachable', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                rpcServer: 'rpc',
                rpcHealthCheckEnabled: true,
                rpcHealthCheck: {
                    isReachable: false
                },
                explorer: {
                    shouldSync: true,
                    stripeSubscription: { status: 'active' }
                }
            },
        });

        receiptSync({ data : { transactionId: 1 }})
            .then(res => {
                expect(res).toEqual('RPC is unreachable');
                done();
            });
    });

    it('Should return if no transaction', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce(null);

        receiptSync({ data : { transactionId: 1 }})
            .then(res => {
                expect(res).toEqual('Missing transaction');
                done();
            });
    });

    it('Should return if no subscription', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                rpcServer: 'rpc',
                explorer: {
                    shouldSync: true
                }
            }
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn().mockResolvedValue(null)
        }));

        receiptSync({ data : { transactionId: 1 }})
            .then(res => {
                expect(res).toEqual('No active subscription');
                done();
            });
    });

    it('Should store the receipt', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                rpcServer: 'rpc',
                explorer: {
                    shouldSync: true,
                    stripeSubscription: { status: 'active' }
                }
            }
        });
        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn().mockResolvedValueOnce({ transactionHash: '0x123' })
        }));

        receiptSync({ data : { transactionId: 1 }})
            .then(() => {
                expect(db.storeTransactionReceipt).toHaveBeenCalledWith(1, { transactionHash: '0x123' });
                done();
            });
    });
});
