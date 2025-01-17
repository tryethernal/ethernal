import flushPromises from 'flush-promises';

import ExplorerStatus from '@/components/ExplorerStatus.vue';

describe('ExplorerStatus.vue', () => {
    it('Should show all statuses', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date().toISOString(),
            startingBlock: 0,
            isRpcReachable: true,
            rpcHealthCheckedAt: new Date().toISOString()
        };

        vi.spyOn(server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = mount(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show explorer section', async() => {
        const statuses = {
            isRpcReachable: true,
            rpcHealthCheckedAt: new Date()
        };

        vi.spyOn(server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = mount(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show rpc section', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date().toISOString(),
            startingBlock: 0
        };

        vi.spyOn(server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = mount(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show integrity checks', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedAt: new Date().toISOString(),
            startingBlock: 0
        };

        vi.spyOn(server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = mount(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show unhealthy statuses', async() => {
        const statuses = {
            syncStatus: 'recovering',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date().toISOString(),
            startingBlock: 0,
            isRpcReachable: false,
            rpcHealthCheckedAt: new Date().toISOString()
        };

        vi.spyOn(server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = mount(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
