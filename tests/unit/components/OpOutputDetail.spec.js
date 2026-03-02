import OpOutputDetail from '@/components/OpOutputDetail.vue';

describe('OpOutputDetail.vue', () => {
    it('Should call getOpOutputDetail on mount', async () => {
        vi.spyOn(server, 'getOpOutputDetail')
            .mockResolvedValue({ data: null });

        mount(OpOutputDetail, {
            props: {
                outputIndex: '50'
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpOutputDetail).toHaveBeenCalled();
    });
});
