import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';

import ExplorerStatus from '@/components/ExplorerStatus.vue';

describe('ExplorerStatus.vue', () => {
    let helper;

    beforeAll(() => {
        jest.useFakeTimers('modern');
        jest.setSystemTime(new Date(1990, 5, 9, 10, 32, 45));
    });

    beforeEach(async () => {
        helper = new MockHelper();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('Should show all statuses', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date(),
            startingBlock: 0,
            isRpcReachable: true,
            rpcHealthCheckedAt: new Date()
        };

        jest.spyOn(helper.mocks.server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = helper.mountFn(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show explorer section', async() => {
        const statuses = {
            isRpcReachable: true,
            rpcHealthCheckedAt: new Date()
        };

        jest.spyOn(helper.mocks.server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = helper.mountFn(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show rpc section', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date(),
            startingBlock: 0
        };

        jest.spyOn(helper.mocks.server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = helper.mountFn(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not show integrity checks', async() => {
        const statuses = {
            syncStatus: 'healthy',
            latestCheckedAt: new Date(),
            startingBlock: 0
        };

        jest.spyOn(helper.mocks.server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = helper.mountFn(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show unhealthy statuses', async() => {
        const statuses = {
            syncStatus: 'recovering',
            latestCheckedBlock: 10,
            latestCheckedAt: new Date(),
            startingBlock: 0,
            isRpcReachable: false,
            rpcHealthCheckedAt: new Date()
        };

        jest.spyOn(helper.mocks.server, 'getExplorerStatus')
            .mockResolvedValue({ data: statuses });

        const wrapper = helper.mountFn(ExplorerStatus);
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
