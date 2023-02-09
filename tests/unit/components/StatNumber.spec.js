import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import StatNumber from '@/components/StatNumber.vue';

describe('StatNumber.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should show a link', () => {
        const wrapper = helper.mountFn(StatNumber, {
            propsData: {
                type: 'link',
                title: 'Stat',
                value: 1,
                loading: false,
                href: '/blocks/1'
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the full number', () => {
        const wrapper = helper.mountFn(StatNumber, {
            propsData: {
                title: 'Stat',
                value: "83742318000000000000000000",
                loading: false,
                long: true
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a number', () => {
        const wrapper = helper.mountFn(StatNumber, {
            propsData: {
                title: 'Stat',
                value: 1,
                loading: false
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the info tooltip', () => {
        const wrapper = helper.mountFn(StatNumber, {
            propsData: {
                title: 'Stat',
                value: 1,
                loading: false,
                infoTooltip: 'Info Tooltip'
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the loading skeleton', async () => {
        const wrapper = helper.mountFn(StatNumber, {
            propsData: {
                title: 'Stat',
                value: 1,
                loading: true,
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});
