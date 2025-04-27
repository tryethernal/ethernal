import BaseChipGroup from '@/components/base/BaseChipGroup.vue';

describe('BaseChipGroup.vue', () => {
    it('Should render with default props', async () => {
        const wrapper = mount(BaseChipGroup);
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render with custom background color', async () => {
        const wrapper = mount(BaseChipGroup, {
            props: {
                backgroundColor: '#FF0000'
            }
        });
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should pass attributes to v-chip-group', async () => {
        const wrapper = mount(BaseChipGroup, {
            props: {
                mandatory: true,
                column: true
            }
        });
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});
