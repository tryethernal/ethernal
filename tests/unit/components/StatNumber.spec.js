import StatNumber from '@/components/StatNumber.vue';

describe('StatNumber.vue', () => {
    it('Should show a link', () => {
        const wrapper = mount(StatNumber, {
            props: {
                type: 'link',
                title: 'Stat',
                value: 1,
                loading: false,
                href: '/blocks/1'
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show format if erc20', () => {
        const wrapper = mount(StatNumber, {
            props: {
                title: 'Stat',
                value: "83742318000000000000000000",
                loading: false,
                decimals: 18,
                tokenType: 'erc20',
                long: true
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show a number', () => {
        const wrapper = mount(StatNumber, {
            props: {
                title: 'Stat',
                value: '1',
                tokenType: 'erc721',
                loading: false
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the info tooltip', () => {
        const wrapper = mount(StatNumber, {
            props: {
                title: 'Stat',
                value: 1,
                loading: false,
                infoTooltip: 'Info Tooltip'
            }
        });
        expect(wrapper.html()).toMatchSnapshot();
    });
});
