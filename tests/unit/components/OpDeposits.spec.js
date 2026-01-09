import OpDeposits from '@/components/OpDeposits.vue';

describe('OpDeposits.vue', () => {
    it('Should call getOpDeposits on mount', async () => {
        vi.spyOn(server, 'getOpDeposits')
            .mockResolvedValue({
                data: {
                    items: [],
                    total: 0
                }
            });

        mount(OpDeposits, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpDeposits).toHaveBeenCalled();
    });
});
