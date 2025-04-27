import ContractDetails from '@/components/ContractDetails.vue';

const stubs = ['ContractCode', 'ContractReadWrite', 'ImportArtifactModal'];

describe('ContractDetails.vue', () => {
    const mockContract = {
        address: '0x123',
        name: 'TestContract',
        abi: JSON.stringify({ test: 'abi' })
    };

    beforeEach(() => {
        // Mock window.location.hash
        Object.defineProperty(window, 'location', {
            value: {
                hash: ''
            },
            writable: true
        });
    });

    it('Should show the component with code tab by default', async () => {
        const wrapper = mount(ContractDetails, {
            props: {
                contract: mockContract
            },
            global: {
                stubs,
                plugins: [
                    createTestingPinia({
                        initialState: {
                            user: { isAdmin: false }
                        }
                    })
                ]
            }
        });

        // Verify code tab is active
        const codeTab = wrapper.find('.v-chip-group .v-chip:first-child');
        expect(codeTab.classes()).toContain('text-primary');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show read contract tab when hash is readContract', async () => {
        window.location.hash = '#readContract';
        
        const wrapper = mount(ContractDetails, {
            props: {
                contract: mockContract
            },
            global: {
                stubs,
                plugins: [
                    createTestingPinia({
                        initialState: {
                            user: { isAdmin: false }
                        }
                    })
                ]
            }
        });

        await wrapper.vm.$nextTick();

        // Verify read tab is active
        const readTab = wrapper.find('.v-chip-group .v-chip:nth-child(2)');
        expect(readTab.classes()).toContain('text-primary');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show write contract tab when hash is writeContract', async () => {
        window.location.hash = '#writeContract';
        
        const wrapper = mount(ContractDetails, {
            props: {
                contract: mockContract
            },
            global: {
                stubs,
                plugins: [
                    createTestingPinia({
                        initialState: {
                            user: { isAdmin: false }
                        }
                    })
                ]
            }
        });

        await wrapper.vm.$nextTick();

        // Verify write tab is active
        const writeTab = wrapper.find('.v-chip-group .v-chip:nth-child(3)');
        expect(writeTab.classes()).toContain('text-primary');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should update filtered counts when ContractReadWrite emits update', async () => {
        const wrapper = mount(ContractDetails, {
            props: {
                contract: mockContract
            },
            global: {
                stubs,
                plugins: [
                    createTestingPinia({
                        initialState: {
                            user: { isAdmin: false }
                        }
                    })
                ]
            }
        });

        await wrapper.findComponent({ name: 'ContractReadWrite' }).vm.$emit('update-filtered-counts', { read: 5, write: 3 });
        await wrapper.vm.$nextTick();

        // Verify counts are updated
        const readCount = wrapper.find('.v-chip-group .v-chip:nth-child(2)');
        const writeCount = wrapper.find('.v-chip-group .v-chip:nth-child(3)');
        expect(readCount.text()).toContain('Read Contract (5)');
        expect(writeCount.text()).toContain('Write Contract (3)');

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show import modal link for admin users', async () => {
        const wrapper = mount(ContractDetails, {
            props: {
                contract: mockContract
            },
            global: {
                stubs,
                plugins: [
                    createTestingPinia({
                        initialState: {
                            user: { isAdmin: true }
                        }
                    })
                ]
            }
        });

        // Verify import modal link is shown
        const importLink = wrapper.find('.v-card-text a');
        expect(importLink.exists()).toBe(true);
        expect(importLink.text()).toBe('here');

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 