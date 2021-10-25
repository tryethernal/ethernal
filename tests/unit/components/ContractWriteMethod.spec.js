import MockHelper from '../MockHelper';

import ContractWriteMethod from '@/components/ContractWriteMethod.vue';
import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';
import TokenContract from '../fixtures/TokenContract.json';

describe('ContractWriteMethod.vue', () => {
    let helper, props;

    beforeEach(() => {
        helper = new MockHelper({ rpcServer: 'http://localhost:8545' });
        props = {
            method: DSProxyFactoryContract.abi[2],
            contract: DSProxyFactoryContract,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };
    });

    it('Should display the UI to interact with a method', (done) => {
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        expect(wrapper.html()).toMatchSnapshot();

        done();
    });

    it('Should handle array input properly', async (done) => {
        props.method = {
            "inputs": [
                {
                    "internalType": "uint256[]",
                    "name": "values",
                    "type": "uint256[]"
                }
            ],
            "name": "reproWriteBug",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        };

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('input').setValue('[1,2]');
        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: null });
            expect(wrapper.vm.receipt).toStrictEqual({ status: true });
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    })

    it('Should display the tx hash and status when it succeeds with a receipt', async (done) => {
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: null });
            expect(wrapper.vm.receipt).toStrictEqual({ status: true });
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display only the tx hash when it succeeds without a receipt', async (done) => {
        helper.mocks.server.callContractWriteMethod = () => {
            const pendingTx = {
                hash: '0xabcd'
            };
            return new Promise((resolve) => resolve({ pendingTx: pendingTx }));
        };
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: null });
            expect(wrapper.vm.receipt).toStrictEqual({});
            expect(wrapper.vm.noReceipt).toBe(true);
            expect(wrapper.vm.noWaitFunction).toBe(true);
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display only the error message with the failed tx hash', async (done) => {
        helper.mocks.server.callContractWriteMethod = () => {
            const pendingTx = {
                hash: '0xabcd'
            };
            const error = {
                data: {
                    '0xabcd': {
                        error: 'Failed tx.',
                        reason: 'Wrong param.'
                    }
                }
            };
            return new Promise((resolve, reject) => reject(error));
        };
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: Wrong param.' });
            expect(wrapper.vm.receipt).toStrictEqual({});
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display the formatted error message with the failed tx hash', async (done) => {
        helper.mocks.server.callContractWriteMethod = () => {
            const pendingTx = {
                hash: '0xabcd'
            };
            const error = {
                data: {
                    '0xabcd': {
                        error: 'revert',
                        return: '0xcf4791810000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b'
                    }
                }
            };
            return new Promise((resolve, reject) => reject(error));
        };

        const props = {
            method: TokenContract.abi[1],
            contract: TokenContract,
            options: {
                from: '0x0',
                gasLimit: '6721975',
                gasPrice: undefined
            }
        };

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });
        const to = wrapper.findAll('input').at(0);
        await to.setValue('0xabcd');

        const amount = wrapper.findAll('input').at(1);
        await amount.setValue('1234');

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: InsufficientBalance(uint256 available: 0, uint256 required: 123)' });
            expect(wrapper.vm.receipt).toStrictEqual({});
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display only the error message if there is no tx hash', async (done) => {
        helper.mocks.server.callContractWriteMethod = () => {
            const error = {
                message: 'Failed tx'
            };
            return new Promise((resolve, reject) => reject(error));
        };
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: Failed tx' });
            expect(wrapper.vm.receipt).toStrictEqual({});
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    it('Should display only the error message if the tx cannot be sent', async (done) => {
        helper.mocks.server.callContractWriteMethod = () => {
            throw { reason: 'call revert exception (method="feeTo()", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.9)' };
        };
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await wrapper.vm.$nextTick();

        setTimeout(() => {
            expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: call revert exception' });
            expect(wrapper.vm.receipt).toStrictEqual({});
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500);
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });    
});
