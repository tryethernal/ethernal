import ExplorerDexSettingsDangerZone from '@/components/ExplorerDexSettingsDangerZone.vue';

describe('ExplorerDexSettingsDangerZone.vue', () => {
    it('Should display danger zone', async () => {
        const wrapper = mount(ExplorerDexSettingsDangerZone, {
            props: { v2DexId: 1 }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
