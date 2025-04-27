import flushPromises from 'flush-promises';
import ContractVerification from '@/components/ContractVerification.vue';

describe('ContractVerification.vue', () => {
    const mockCompilerVersions = {
        data: {
            builds: [
                { longVersion: '0.8.0' },
                { longVersion: '0.7.0' },
                { longVersion: '0.6.0', prerelease: 'nightly-0.6.0' }
            ]
        }
    };

    beforeEach(() => {
        vi.spyOn(server, 'getCompilerVersions').mockResolvedValueOnce(mockCompilerVersions);
        window.scrollTo = vi.fn();
    });

    it('Should load the UI with compiler versions', async () => {
        const wrapper = mount(ContractVerification, {
            props: {
                address: '0x123'
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: { slug: 'ethernal' }
                    }
                })]
            }
        });

        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle file upload', async () => {
        const wrapper = mount(ContractVerification, {
            props: {
                address: '0x123'
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: { slug: 'ethernal' }
                    }
                })]
            }
        });

        await flushPromises();

        const file = new File(['contract content'], 'Test.sol', { type: 'text/plain' });
        const input = wrapper.findComponent({ name: 'v-file-input' });
        await input.vm.$emit('update:modelValue', [file]);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle contract verification success', async () => {
        const verificationData = { verified: true };
        vi.spyOn(server, 'verifyContract').mockResolvedValueOnce({ data: verificationData });
        
        const wrapper = mount(ContractVerification, {
            props: {
                address: '0x123'
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: { slug: 'ethernal' }
                    }
                })]
            }
        });

        await flushPromises();

        // Fill required fields
        const contractNameInput = wrapper.findComponent({ name: 'v-text-field' });
        await contractNameInput.vm.$emit('update:modelValue', 'TestContract');

        const file = new File(['contract content'], 'Test.sol', { type: 'text/plain' });
        const fileInput = wrapper.findComponent({ name: 'v-file-input' });
        await fileInput.vm.$emit('update:modelValue', [file]);

        // Simulate form validation
        wrapper.vm.canSubmit = true;
        await wrapper.vm.$nextTick();

        // Submit form
        const verifyButton = wrapper.findAll('button').find(btn => btn.text() === 'Verify');
        await verifyButton.trigger('click');
        await flushPromises();

        expect(wrapper.emitted('contractVerified')).toEqual([[verificationData]]);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle contract verification error', async () => {
        const errorMessage = 'Verification failed';
        vi.spyOn(server, 'verifyContract').mockRejectedValueOnce({ 
            response: { data: errorMessage }
        });
        
        const wrapper = mount(ContractVerification, {
            props: {
                address: '0x123'
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: { slug: 'ethernal' }
                    }
                })]
            }
        });

        await flushPromises();

        // Fill required fields
        const contractNameInput = wrapper.findComponent({ name: 'v-text-field' });
        await contractNameInput.vm.$emit('update:modelValue', 'TestContract');

        const file = new File(['contract content'], 'Test.sol', { type: 'text/plain' });
        const fileInput = wrapper.findComponent({ name: 'v-file-input' });
        await fileInput.vm.$emit('update:modelValue', [file]);

        // Simulate form validation
        wrapper.vm.canSubmit = true;
        await wrapper.vm.$nextTick();

        // Submit form
        const verifyButton = wrapper.findAll('button').find(btn => btn.text() === 'Verify');
        await verifyButton.trigger('click');
        await flushPromises();

        const alert = wrapper.find('.v-alert');
        expect(alert.exists()).toBe(true);
        expect(alert.text()).toContain(`Verification failed. ${errorMessage}`);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should handle library management', async () => {
        const wrapper = mount(ContractVerification, {
            props: {
                address: '0x123'
            },
            global: {
                plugins: [createTestingPinia({
                    initialState: {
                        explorer: { slug: 'ethernal' }
                    }
                })]
            }
        });

        await flushPromises();

        // Add library
        const addLibraryButton = wrapper.findAll('button').find(btn => btn.text() === 'Add Library');
        await addLibraryButton.trigger('click');
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});
