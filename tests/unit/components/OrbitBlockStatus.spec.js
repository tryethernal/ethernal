import OrbitBlockStatus from '@/components/OrbitBlockStatus.vue';

describe('OrbitBlockStatus.vue', () => {
    it('Should show processed_on_rollup status', async () => {
        const wrapper = mount(OrbitBlockStatus, {
            props: {
                status: 'processed_on_rollup'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show pending_on_parent status', async () => {
        const wrapper = mount(OrbitBlockStatus, {
            props: {
                status: 'pending_on_parent'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show confirmed_on_parent_chain status', async () => {
        const wrapper = mount(OrbitBlockStatus, {
            props: {
                status: 'confirmed_on_parent_chain'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show finalized_on_parent status', async () => {
        const wrapper = mount(OrbitBlockStatus, {
            props: {
                status: 'finalized_on_parent'
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
