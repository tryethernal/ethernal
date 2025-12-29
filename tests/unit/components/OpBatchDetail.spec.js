import OpBatchDetail from '@/components/OpBatchDetail.vue';

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
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpBatchDetail).toHaveBeenCalled();
    });
});
