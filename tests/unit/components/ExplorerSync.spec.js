import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerSync from '@/components/ExplorerSync.vue';

beforeEach(() => jest.clearAllMocks());

describe('ExplorerSync.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display that sync is active', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'online' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display that sync is inactive', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'stopped' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display that sync is starting', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'launching' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display that sync is stopping', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'stopping' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display unknown status', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unknown' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display unreachable status', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unreachable' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display quota reached status', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'transactionQuotaReached' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display no subscription status', async () => {
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unreachable' }});
        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start sync', async () => {
        jest.spyOn(helper.mocks.server, 'startExplorerSync').mockResolvedValueOnce();
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus')
            .mockResolvedValueOnce({ data: { status: 'stopped' }})
            .mockResolvedValueOnce({ data: { status: 'online' }});

        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should stop sync', async () => {
        jest.spyOn(helper.mocks.server, 'stopExplorerSync').mockResolvedValueOnce();
        jest.spyOn(helper.mocks.server, 'getExplorerSyncStatus')
            .mockResolvedValueOnce({ data: { status: 'online' }})
            .mockResolvedValueOnce({ data: { status: 'stopped' }});

        const wrapper = helper.mountFn(ExplorerSync, {
            propsData: {
                explorer: {
                    id: 1,
                    stripeSubscription: {}
                }
            }
        });
        await flushPromises();

        await wrapper.find('button').trigger('click');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
