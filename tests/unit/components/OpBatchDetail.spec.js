import OpBatchDetail from '@/components/OpBatchDetail.vue';

vi.mock('vue-router', () => ({
    useRouter: vi.fn(() => ({
        afterEach: vi.fn(),
        currentRoute: {
            value: {
                fullPath: '/batch/100',
                split: vi.fn(() => ['/batch/100'])
            }
        }
    }))
}));


describe('OpBatchDetail.vue', () => {
    it('Should call getOpBatchDetail on mount', async () => {
        vi.spyOn(server, 'getOpBatchDetail')
            .mockResolvedValue({ data: null });

        vi.spyOn(server, 'getOpBatchTransactions')
            .mockResolvedValue({ data: { items: [], total: 0 } });

        mount(OpBatchDetail, {
            props: {
                batchIndex: '100'
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink'],
                provide: { $router: router }
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpBatchDetail).toHaveBeenCalled();
    });
});
