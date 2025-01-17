import flushPromises from 'flush-promises';
import ContractVerification from '@/components/ContractVerification.vue';

describe('ContractVerification.vue', () => {
    it('Should load the UI & the Solidity releases', async () => {
        vi.spyOn(server, 'getCompilerVersions')
            .mockResolvedValueOnce({ data: { builds: [
                { longVersion: '0.1.2' },
                { longVersion: '0.1.3', prerelease: 'nightly-0.1.3' },
            ]}});

        const wrapper = mount(ContractVerification, {
            global: {
                plugins: [createTestingPinia({ initialState: { explorer: { slug: 'ethernal' } } })]
            }
        });

        await flushPromises();

        expect(wrapper.vm.allCompilerVersions.length).toEqual(2);
        expect(wrapper.vm.releasesCompilerVersions.length).toEqual(1);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
