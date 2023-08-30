require('../mocks/lib/rpc');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/lib/logger');
const { Transaction } = require('../mocks/models');

const db = require('../../lib/firebase');
const { ProviderConnector } = require('../../lib/rpc');

const receiptSync = require('../../jobs/receiptSync');

beforeEach(() => jest.resetAllMocks());

describe('receiptSync', () => {
    it('Should throw an error if receipt is not available', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            workspace: {
                rpcServer: 'rpc',
                explorer: {
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

    it('Should return if no transaction', (done) => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce(null);
        ProviderConnector.mockImplementationOnce(() => ({
            fetchTransactionReceipt: jest.fn().mockResolvedValueOnce(null)
        }));

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
                explorer: {}
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
