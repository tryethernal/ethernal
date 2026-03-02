import OpWithdrawals from '@/components/OpWithdrawals.vue';

describe('OpWithdrawals.vue', () => {
    it('Should call getOpWithdrawals on mount', async () => {
        vi.spyOn(server, 'getOpWithdrawals')
            .mockResolvedValue({
                data: {
                    items: [],
                    total: 0
                }
            });

        mount(OpWithdrawals, {
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpWithdrawals).toHaveBeenCalled();
    });
});
