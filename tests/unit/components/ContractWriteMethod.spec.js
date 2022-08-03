import MockHelper from '../MockHelper';
import { ethers } from '../mocks/ethers';
import ethereum from '../mocks/ethereum';

window.ethereum = ethereum;

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
            signature: 'build()',
            options: {
                from: { address: '0x0' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };
    });

    it('Should send the transaction with Metamask if public explorer', async () => {
        jest.spyOn(window.ethereum, 'request')
            .mockResolvedValue('0x1234');

        const wrapper = helper.mountFn(ContractWriteMethod, {
            propsData: props,
            getters: {
                isPublicExplorer: jest.fn().mockReturnValue(true)
            }
        });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0x1234', message: null });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the UI to interact with a method', () => {
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should make the UI unavailable if not active flag', () => {
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
        props.active = false;
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle array input properly', async () => {
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
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
        expect(wrapper.html()).toMatchSnapshot();
    })

    it('Should display the tx hash and status when it succeeds with a receipt', async () => {
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({ status: true });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the tx hash when it succeeds without a receipt', async () => {
        jest.spyOn(helper.mocks.server, 'callContractWriteMethod')
            .mockResolvedValue({ hash: '0xabcd' });

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toEqual({ txHash: '0xabcd', message: null });
        expect(wrapper.vm.receipt).toEqual({});
        expect(wrapper.vm.noReceipt).toBe(true);
        expect(wrapper.vm.noWaitFunction).toBe(true);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message with the failed tx hash', async () => {
        jest.spyOn(helper.mocks.server, 'callContractWriteMethod')
            .mockRejectedValue({
                data: {
                    '0xabcd': {
                        error: 'Failed tx.',
                        reason: 'Wrong param.'
                    }
                }
            });

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: Wrong param.' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the formatted error message with the failed tx hash', async () => {
        jest.spyOn(helper.mocks.server, 'callContractWriteMethod').
            mockRejectedValue({
                data: {
                    '0xabcd': {
                        error: 'revert',
                        return: '0xcf4791810000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b'
                    }
                }
            });

        const props = {
            method: TokenContract.abi[1],
            contract: TokenContract,
            options: {
                from: { address: '0x0' },
                gasLimit: '6721975',
                gasPrice: undefined
            },
            active: true
        };

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });
        const to = wrapper.findAll('input').at(0);
        await to.setValue('0xabcd');

        const amount = wrapper.findAll('input').at(1);
        await amount.setValue('1234');

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: '0xabcd', message: 'Error: InsufficientBalance(uint256 available: 0, uint256 required: 123)' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message if there is no tx hash', async () => {
        jest.spyOn(helper.mocks.server, 'callContractWriteMethod')
            .mockRejectedValue({
                message: 'Failed tx'
            });

        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: Failed tx' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display only the error message if the tx cannot be sent', async () => {
        jest.spyOn(helper.mocks.server, 'callContractWriteMethod').mockImplementation(function() {
            throw { reason: 'call revert exception (method="feeTo()", errorSignature=null, errorArgs=[null], reason=null, code=CALL_EXCEPTION, version=abi/5.0.9)' };
        });
        const wrapper = helper.mountFn(ContractWriteMethod, { propsData: props });

        await wrapper.find('button').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.vm.result).toStrictEqual({ txHash: null, message: 'Error: call revert exception' });
        expect(wrapper.vm.receipt).toStrictEqual({});
        expect(wrapper.html()).toMatchSnapshot();
    });
});
