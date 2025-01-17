import UpgradeLink from '@/components/UpgradeLink.vue';

describe('UpgradeLink.vue', () => {
    it('Should display a link to the billing page', () => {
        const wrapper = mount(UpgradeLink);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
