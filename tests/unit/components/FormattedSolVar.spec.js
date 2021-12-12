const ethers = require('ethers');
import MockHelper from '../MockHelper';

import FormattedSolVar from '@/components/FormattedSolVar.vue';

describe('FormattedSolVar.vue', () => {
    let helper, db;

    beforeEach(() => {
        helper = new MockHelper();
        db = helper.mocks.admin;
    });

    it('Should display an address with the contract name', async (done) => {
        await db.collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'My Contract' });

        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'address' },
                value: '0x123'
            }
        });

        setTimeout(() => {
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1500)
    });

    it('Should display the value as an int', (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'uint256' },
                value: ethers.BigNumber.from('0x1dcd6500')
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the name of the variable if passed', (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'uint256', name: 'amount' },
                value: ethers.BigNumber.from('0x1dcd6500')
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should switch the value to big number', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'uint256' },
                value: ethers.BigNumber.from('0x1dcd6500')
            }
        });

        await wrapper.find('#switchCommified').trigger('click');

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(() => helper.clearFirebase());
});