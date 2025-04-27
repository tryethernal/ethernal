import ContractCodeEditor from '@/components/ContractCodeEditor.vue';

describe('ContractCodeEditor.vue', () => {
    const mockSources = [
        {
            fileName: 'Contract.sol',
            content: 'contract Test { }'
        },
        {
            fileName: 'lib/Library.sol',
            content: 'library Lib { }'
        }
    ];

    it('Should show the component with file explorer', async () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should open first root file by default', async () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });
        await flushPromises();

        const tabs = wrapper.findAll('.v-tab');
        expect(tabs.length).toBe(1);
        expect(tabs[0].text()).toContain('Contract.sol');
    });

    it('Should handle file selection from explorer', async () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });
        await flushPromises();

        // Simulate file selection from explorer
        await wrapper.findComponent({ name: 'ContractFileExplorer' }).vm.$emit('select-file', [{
            id: 'lib/Library.sol',
            title: 'Library.sol',
            content: 'library Lib { }'
        }]);

        const tabs = wrapper.findAll('.v-tab');
        expect(tabs.length).toBe(2);
        expect(tabs[1].text()).toContain('Library.sol');
    });

    it('Should close tab when clicking close button', async () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });
        await flushPromises();

        // Open second file
        await wrapper.findComponent({ name: 'ContractFileExplorer' }).vm.$emit('select-file', [{
            id: 'lib/Library.sol',
            title: 'Library.sol',
            content: 'library Lib { }'
        }]);

        // Close first tab
        const closeButton = wrapper.find('.v-btn.ml-1.mr-n2');
        await closeButton.trigger('click');

        const tabs = wrapper.findAll('.v-tab');
        expect(tabs.length).toBe(1);
        expect(tabs[0].text()).toContain('Library.sol');
    });

    it('Should expand/collapse all files in explorer', async () => {
        const mockExpandAll = vi.fn();
        const mockCollapseAll = vi.fn();

        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources
            },
            global: {
                stubs: {
                    ContractFileExplorer: {
                        template: '<div></div>',
                        methods: {
                            expandAll: mockExpandAll,
                            collapseAll: mockCollapseAll
                        }
                    }
                }
            }
        });
        await flushPromises();

        // Test expand all
        const expandBtn = wrapper.findAll('.v-btn').find(btn => btn.text() === 'Expand All');
        await expandBtn.trigger('click');
        expect(mockExpandAll).toHaveBeenCalled();
        expect(wrapper.vm.isExpanded).toBe(true);

        // Test collapse all
        const collapseBtn = wrapper.findAll('.v-btn').find(btn => btn.text() === 'Collapse All');
        await collapseBtn.trigger('click');
        expect(mockCollapseAll).toHaveBeenCalled();
        expect(wrapper.vm.isExpanded).toBe(false);
    });

    it('Should handle selectedFile prop changes', async () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: mockSources,
                selectedFile: ''
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });
        await flushPromises();

        // Update selectedFile prop
        await wrapper.setProps({ selectedFile: 'lib/Library.sol' });

        const tabs = wrapper.findAll('.v-tab');
        expect(tabs.length).toBe(1);
        expect(tabs[0].text()).toContain('Library.sol');
    });

    it('Should show empty state when no files are selected', () => {
        const wrapper = mount(ContractCodeEditor, {
            props: {
                sources: []
            },
            global: {
                stubs: ['ContractFileExplorer']
            }
        });

        const emptyState = wrapper.find('.text-medium-emphasis');
        expect(emptyState.exists()).toBe(true);
        expect(emptyState.text()).toContain('Select a file to view its content');
    });
});
