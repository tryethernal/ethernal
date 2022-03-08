const ethers = require('ethers');
import MockHelper from '../MockHelper';

import FormattedSolVar from '@/components/FormattedSolVar.vue';

describe('FormattedSolVar.vue', () => {
    let helper, db;

    beforeEach(() => {
        helper = new MockHelper();
        db = helper.mocks.admin;
    });

    it('Should display data:image as img tag', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'string' },
                value: "data:image/png;base64,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"
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display links as a tag', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'string' },
                value: "https://www.tryethernal.com"
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display svg as an image', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'string' },
                value: "<svg id='luchador1234' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><style>#luchador1234 .lucha-base { fill: #d22f94; } #luchador1234 .lucha-alt { fill: #ea184d; } #luchador1234 .lucha-eyes { fill: #3ba599; } #luchador1234 .lucha-skin { fill: #f39c77; } #luchador1234 .lucha-breathe { animation: 0.5s lucha-breathe infinite alternate ease-in-out; } @keyframes lucha-breathe { from { transform: translateY(0px); } to { transform: translateY(1%); } }</style><g class='lucha-breathe'><path class='lucha-skin' d='M22 12v-1h-1v-1h-1V9h-1V5h-1V3h-1V2h-1V1h-1V0H9v1H8v1H7v1H6v2H5v4H4v1H3v1H2v1H1v8h4v-1h1v-2H5v-3h1v1h1v1h1v2h8v-2h1v-1h1v-1h1v3h-1v2h1v1h4v-8z'/><path class='lucha-base' d='M22 14h-3v3h4v-3zM3 14H1v3h4v-3H4z'/><path class='lucha-alt' d='M22 14h-3v1h4v-1zM3 14H1v1h4v-1H4z'/><path class='lucha-base' d='M18 5V3h-1V2h-1V1h-1V0H9v1H8v1H7v1H6v2H5v5h1v2h1v1h1v1h1v1h6v-1h1v-1h1v-1h1v-2h1V5z'/><g class='lucha-alt'><path d='M18 5V3h-1V2h-1v2h-1v1h-1v1h-1v3h-2V6h-1V5H9V4H8V2H7v1H6v2H5v4h1v1h2v3h1v1h6v-1h1v-3h2V9h1V5z'/></g><path fill='#FFF' d='M9 6H6v3h4V6zM17 6h-3v3h4V6z'/><path class='lucha-eyes' d='M16 6h-2v3h3V6zM8 6H7v3h3V6H9z'/><path fill='#FFF' d='M7 6h1v1H7zM16 6h1v1h-1z' opacity='.4'/><path fill='#000' d='M15 7h1v1h-1zM8 7h1v1H8z'/><path class='lucha-skin' d='M14 10H9v3h6v-3z'/><path fill='#000' opacity='.9' d='M13 11h-3v1h4v-1z'/></g><path class='lucha-skin' d='M16 23v-6H8v6H7v1h4v-4h2v4h4v-1z'/><path class='lucha-base' d='M15 17H8v1h1v1h2v1h2v-1h2v-1h1v-1z'/><path class='lucha-alt' d='M15 17H8v6h3v-3h2v3h3v-6z'/><path class='lucha-base' d='M9 21H8v2H7v1h4v-3h-1zM16 23v-2h-3v3h4v-1z'/></svg>"
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display formatted json', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'string' },
                value: JSON.stringify({
                    name: 'Ethernal',
                    symbol: 'ETL'
                })
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
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

    it('Should not be switchable if type is uint256', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'uint256' },
                value: ethers.BigNumber.from('0x1dcd6500')
            }
        });
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should display the name of the variable if passed', async (done) => {
        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'uint256', name: 'amount' },
                value: ethers.BigNumber.from('0x1dcd6500')
            }
        });

        await wrapper.vm.$nextTick();
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    it('Should switch the value to raw hash', async (done) => {
        await db.collection('contracts')
            .doc('0x123')
            .set({ address: '0x123', name: 'My Contract' });

        const wrapper = helper.mountFn(FormattedSolVar, {
            propsData: {
                input: { type: 'address' },
                value: '0x123'
            }
        });

        await wrapper.find('#switchFormatted').trigger('click');

        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(() => helper.clearFirebase());
});