import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerQuotaManagementModal from '@/components/ExplorerQuotaManagementModal.vue';

let helper;
beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

const stripePlanData = {
    slug: 'transaction-quota',
    capabilities: {"quotaExtension": true, "ranges": [{"upTo": 100000, "cost": 0.005}, {"upTo": 1000000, "cost":0.0007}, { "upTo": 10000000, "cost": 0.00015}, {"upTo": "∞", "cost": 0.000045}]},
}

describe('ExplorerQuotaManagementModal.vue', () => {
    it('Should display current quota info', async () => {
        const wrapper = helper.mountFn(ExplorerQuotaManagementModal);
        jest.spyOn(helper.mocks.server, 'getQuotaExtensionPlan').mockResolvedValueOnce({ data: stripePlanData });

        wrapper.vm.open({
            subscription: {
                explorerId: 1,
                stripePlan: {
                    capabilities: { txLimit: 100000 }
                },
                stripeQuotaExtension: {
                    quota: 20000
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display base cost simulation', async () => {
        const wrapper = helper.mountFn(ExplorerQuotaManagementModal);
        jest.spyOn(helper.mocks.server, 'getQuotaExtensionPlan').mockResolvedValueOnce({ data: stripePlanData });

        wrapper.vm.open({
            subscription: {
                explorerId: 1,
                stripePlan: {
                    capabilities: { txLimit: 100000 }
                },
                stripeQuotaExtension: {
                    quota: 20000
                }
            }
        });
        await flushPromises();

        wrapper.setData({ rawExtraQuota: 4000000 });
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it.only('Should cancel quota if set to 0', async () => {
        const wrapper = helper.mountFn(ExplorerQuotaManagementModal);
        jest.spyOn(helper.mocks.server, 'getQuotaExtensionPlan').mockResolvedValueOnce({ data: stripePlanData });

        wrapper.vm.open({
            subscription: {
                explorerId: 1,
                stripePlan: {
                    capabilities: { txLimit: 100000 }
                },
                stripeQuotaExtension: {
                    quota: 20000
                }
            }
        });
        await flushPromises();

        wrapper.setData({ rawExtraQuota: 0, loading: false, stripePlanLoading: false, valid: true });
        await wrapper.vm.$nextTick();
        console.log(wrapper.html())
        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(helper.mocks.server.cancelQuotaExtension).toHaveBeenCalledWith(1);
    });
});
