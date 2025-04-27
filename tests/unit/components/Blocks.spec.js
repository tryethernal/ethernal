import Blocks from '@/components/Blocks.vue';

describe('Blocks.vue', () => {
    it('Should show the blocks list', async () => {
        vi.spyOn(server, 'getLast24hGasUtilisationRatio').mockResolvedValue({ data: { gasUtilisationRatio24h: 0.5 } });
        vi.spyOn(server, 'getLast24hTotalGasUsed').mockResolvedValue({ data: { totalGasUsed: 1000000 } });
        vi.spyOn(server, 'getLast24hBurntFees').mockResolvedValue({ data: { burntFees: 10000000000000000000 } });

        const wrapper = mount(Blocks, {
            global: {
                stubs: ['Block-List', 'Stat-Number']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});
