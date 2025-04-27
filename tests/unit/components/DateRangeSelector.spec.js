import DateRangeSelector from '@/components/DateRangeSelector.vue';

describe('DateRangeSelector.vue', () => {
    it('Should show the component with default 7 days range', async () => {
        const wrapper = mount(DateRangeSelector);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with 30 days range', async () => {
        const wrapper = mount(DateRangeSelector, {
            props: {
                initialRange: '30'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the component with all time range', async () => {
        const wrapper = mount(DateRangeSelector, {
            props: {
                initialRange: 'alltime'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit range when selecting custom dates', async () => {
        const wrapper = mount(DateRangeSelector);

        // Click the custom range chip (last chip in the group)
        const chips = wrapper.findAll('.v-chip');
        const customChip = chips[chips.length - 1];
        await customChip.trigger('click');
        
        // Set custom range
        const dates = [
            new Date('2024-01-01'),
            new Date('2024-01-31')
        ];
        await wrapper.vm.validateDate(dates);

        // Click apply button
        const applyButton = wrapper.find('.v-card-actions .v-btn:last-child');
        await applyButton.trigger('click');

        const emitted = wrapper.emitted('rangeUpdated');
        expect(emitted).toBeTruthy();
        expect(emitted[0][0]).toEqual({
            from: '2024-01-01',
            to: '2024-01-31'
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should close custom picker without changes when clicking close', async () => {
        const wrapper = mount(DateRangeSelector);

        // Click the custom range chip (last chip in the group)
        const chips = wrapper.findAll('.v-chip');
        const customChip = chips[chips.length - 1];
        await customChip.trigger('click');
        
        // Click close button
        const closeButton = wrapper.find('.v-card-actions .v-btn:first-child');
        await closeButton.trigger('click');

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 