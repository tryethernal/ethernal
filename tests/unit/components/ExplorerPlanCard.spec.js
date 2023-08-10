import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerPlanCard from '@/components/ExplorerPlanCard.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

const plan = {
    name: 'Explorer',
    slug: 'explo',
    price: 1000,
    capabilities: {
        txLimit: 1000,
        dataRetention: 7,
        customDomain: true,
        nativeToken: false,
        totalSupply: false,
        statusPage: false,
        branding: true
    }
};

describe('ExplorerPlanCard.vue', () => {
    it('Should display regular plan card', async () => {
        const wrapper = helper.mountFn(ExplorerPlanCard, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                plan,
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display current plan card', async () => {
        const wrapper = helper.mountFn(ExplorerPlanCard, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                plan,
                current: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display loading plan card', async () => {
        const wrapper = helper.mountFn(ExplorerPlanCard, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                plan,
                loading: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display disabled plan card', async () => {
        const wrapper = helper.mountFn(ExplorerPlanCard, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                plan,
                disabled: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display pending cancelation plan card', async () => {
        const wrapper = helper.mountFn(ExplorerPlanCard, {
            stubs: ['Explorer-Plan-Card'],
            propsData: {
                plan,
                current: true,
                pendingCancelation: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
