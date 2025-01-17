import flushPromises from 'flush-promises';

import ExplorerSync from '@/components/ExplorerSync.vue';

describe('ExplorerSync.vue', () => {
    it('Should display that sync is active', async () => {
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'online' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'stopped' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'launching' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'stopping' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unknown' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unreachable' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'transactionQuotaReached' }});
        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'getExplorerSyncStatus').mockResolvedValueOnce({ data: { status: 'unreachable' }});
        const wrapper = mount(ExplorerSync, {
            props: {
                explorer: {
                    id: 1
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should start sync', async () => {
        vi.spyOn(server, 'startExplorerSync').mockResolvedValueOnce();
        vi.spyOn(server, 'getExplorerSyncStatus')
            .mockResolvedValueOnce({ data: { status: 'stopped' }})
            .mockResolvedValueOnce({ data: { status: 'online' }});

        const wrapper = mount(ExplorerSync, {
            props: {
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
        vi.spyOn(server, 'stopExplorerSync').mockResolvedValueOnce();
        vi.spyOn(server, 'getExplorerSyncStatus')
            .mockResolvedValueOnce({ data: { status: 'online' }})
            .mockResolvedValueOnce({ data: { status: 'stopped' }});

        const wrapper = mount(ExplorerSync, {
            props: {
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
