import ContractFileExplorer from '@/components/ContractFileExplorer.vue';

describe('ContractFileExplorer.vue', () => {
    const mockSources = [
        {
            fileName: 'contracts/Token.sol',
            content: 'contract Token {}'
        },
        {
            fileName: 'contracts/utils/Helper.sol',
            content: 'contract Helper {}'
        }
    ];

    it('Should render the component with file tree', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should filter files when searching', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources
            }
        });

        const searchInput = wrapper.find('input');
        await searchInput.setValue('Token');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit select-file event when selecting a file', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources
            }
        });

        // Simulate file selection by directly triggering the watch handler
        await wrapper.setProps({ selectedFile: 'contracts/Token.sol' });
        await flushPromises();

        expect(wrapper.emitted('select-file')).toBeTruthy();
        expect(wrapper.emitted('select-file')[0][0]).toEqual([{
            id: 'contracts/Token.sol',
            title: 'Token.sol',
            content: 'contract Token {}'
        }]);
    });

    it('Should expand nodes when selectedFile prop changes', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources,
                selectedFile: 'contracts/utils/Helper.sol'
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should expand all nodes when calling expandAll', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources
            }
        });

        await wrapper.vm.expandAll();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should collapse all nodes when calling collapseAll', async () => {
        const wrapper = mount(ContractFileExplorer, {
            props: {
                sources: mockSources
            }
        });

        await wrapper.vm.expandAll();
        await flushPromises();
        
        await wrapper.vm.collapseAll();
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 