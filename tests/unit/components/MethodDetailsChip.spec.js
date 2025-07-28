import MethodDetailsChip from '@/components/MethodDetailsChip.vue';

describe('MethodDetailsChip.vue', () => {
    it('Should show method name when methodDetails.name exists', async () => {
        const transaction = {
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890',
            methodDetails: {
                name: 'transfer',
                label: 'transfer(address to, uint256 amount)'
            }
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show sighash when methodDetails.name does not exist', async () => {
        const transaction = {
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890',
            methodDetails: null
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show sighash when methodDetails exists but name is empty', async () => {
        const transaction = {
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890',
            methodDetails: {
                name: '',
                label: 'transfer(address to, uint256 amount)'
            }
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show sighash when data is 0x', async () => {
        const transaction = {
            data: '0x',
            methodDetails: null
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show method label in tooltip when methodDetails.label exists', async () => {
        const transaction = {
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890',
            methodDetails: {
                name: 'transfer',
                label: 'transfer(address to, uint256 amount)'
            }
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show data in tooltip when methodDetails.label does not exist', async () => {
        const transaction = {
            data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890',
            methodDetails: {
                name: 'transfer',
                label: null
            }
        };

        const wrapper = mount(MethodDetailsChip, {
            props: { transaction }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
