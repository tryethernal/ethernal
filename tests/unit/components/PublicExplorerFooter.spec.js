// Mock host
vi.mock('@/stores/env', () => ({
    useEnvStore: () => ({
        mainDomain: 'ethernal.local:8080',
        version: '1.2.3'
    }),
    host: 'localhost:3000'
}));

import { setActivePinia, createPinia } from 'pinia';
import { useEnvStore } from '@/stores/env';
import { useExplorerStore } from '@/stores/explorer';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import PublicExplorerFooter from '@/components/PublicExplorerFooter.vue';

describe('PrivateExplorerFooter.vue', () => {
    const mockEnv = {
        mainDomain: 'ethernal.local:8080',
        version: '1.2.3'
    };

    const mockExplorer = {
        name: 'Test Chain',
        token: 'TEST',
        rpcServer: 'https://rpc.test.com',
        domain: 'test.domain.com',
        themes: {
            links: [
                { name: 'Test Link', url: 'https://test.com', icon: 'mdi-test' }
            ]
        }
    };

    const mockCurrentWorkspace = {
        networkId: '1'
    };

    let pinia;

    beforeEach(() => {
        // Mock the stores
        pinia = createPinia();
        setActivePinia(pinia);

        // Create stores with initial state
        const envStore = useEnvStore();
        const explorerStore = useExplorerStore();
        const currentWorkspaceStore = useCurrentWorkspaceStore();

        // Set initial state
        Object.assign(envStore, mockEnv);
        Object.assign(explorerStore, mockExplorer);
        Object.assign(currentWorkspaceStore, mockCurrentWorkspace);
    });

    it('Should render the footer with explorer information', async () => {
        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [pinia],
                stubs: {
                    'v-footer': {
                        template: '<div class="v-footer"><slot /></div>'
                    },
                    'v-container': {
                        template: '<div class="v-container"><slot /></div>'
                    },
                    'v-btn': {
                        template: '<button class="v-btn"><slot /></button>'
                    },
                    'v-icon': {
                        template: '<span class="v-icon"><slot /></span>'
                    },
                    'v-divider': {
                        template: '<hr class="v-divider" />'
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render links in a grid with correct spacing', async () => {
        // Create mock data with multiple links to test grid layout
        const mockExplorerWithLinks = {
            ...mockExplorer,
            themes: {
                links: [
                    { name: 'Link 1', url: 'https://test1.com', icon: 'mdi-test' },
                    { name: 'Link 2', url: 'https://test2.com', icon: 'mdi-test' },
                    { name: 'Link 3', url: 'https://test3.com', icon: 'mdi-test' },
                    { name: 'Link 4', url: 'https://test4.com', icon: 'mdi-test' },
                    { name: 'Link 5', url: 'https://test5.com', icon: 'mdi-test' }
                ]
            }
        };

        const explorerStore = useExplorerStore();
        Object.assign(explorerStore, mockExplorerWithLinks);

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [pinia],
                stubs: {
                    'v-footer': {
                        template: '<div class="v-footer"><slot /></div>'
                    },
                    'v-container': {
                        template: '<div class="v-container"><slot /></div>'
                    },
                    'v-btn': {
                        template: '<button class="v-btn"><slot /></button>'
                    },
                    'v-icon': {
                        template: '<span class="v-icon"><slot /></span>'
                    },
                    'v-divider': {
                        template: '<hr class="v-divider" />'
                    }
                }
            }
        });

        // Verify the links grid exists
        const linksGrid = wrapper.find('.links-grid');
        expect(linksGrid.exists()).toBe(true);
        
        // Verify all links are rendered
        const links = wrapper.findAll('.links-grid a');
        expect(links).toHaveLength(5);

        // Verify the links are rendered in the correct order
        for (let i = 0; i < 5; i++) {
            expect(links[i].text()).toContain(`Link ${i + 1}`);
        }

        // Take a snapshot to verify the structure
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should render the footer without links when themes.links is empty', async () => {
        const noLinksExplorer = { ...mockExplorer, themes: { links: [] } };
        const explorerStore = useExplorerStore();
        Object.assign(explorerStore, noLinksExplorer);

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [pinia],
                stubs: {
                    'v-footer': {
                        template: '<div class="v-footer"><slot /></div>'
                    },
                    'v-container': {
                        template: '<div class="v-container"><slot /></div>'
                    },
                    'v-btn': {
                        template: '<button class="v-btn"><slot /></button>'
                    },
                    'v-icon': {
                        template: '<span class="v-icon"><slot /></span>'
                    },
                    'v-divider': {
                        template: '<hr class="v-divider" />'
                    }
                }
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should attempt to add network to MetaMask when button is clicked', async () => {
        // Mock window.ethereum
        const mockEthereum = {
            request: vi.fn().mockResolvedValueOnce({})
        };
        window.ethereum = mockEthereum;

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [pinia],
                stubs: {
                    'v-footer': {
                        template: '<div class="v-footer"><slot /></div>'
                    },
                    'v-container': {
                        template: '<div class="v-container"><slot /></div>'
                    },
                    'v-btn': {
                        template: '<button class="v-btn"><slot /></button>'
                    },
                    'v-icon': {
                        template: '<span class="v-icon"><slot /></span>'
                    },
                    'v-divider': {
                        template: '<hr class="v-divider" />'
                    }
                }
            }
        });

        await wrapper.find('.v-btn').trigger('click');

        expect(mockEthereum.request).toHaveBeenCalledWith({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0x1',
                chainName: 'Test Chain',
                nativeCurrency: {
                    name: 'TEST',
                    symbol: 'TEST',
                    decimals: 18
                },
                rpcUrls: ['https://rpc.test.com'],
                blockExplorerUrls: ['https://test.domain.com']
            }]
        });
    });

    it('Should handle MetaMask addition when ethereum is not available', async () => {
        // Remove window.ethereum
        window.ethereum = undefined;
        const consoleSpy = vi.spyOn(console, 'error');

        const wrapper = mount(PublicExplorerFooter, {
            global: {
                plugins: [pinia],
                stubs: {
                    'v-footer': {
                        template: '<div class="v-footer"><slot /></div>'
                    },
                    'v-container': {
                        template: '<div class="v-container"><slot /></div>'
                    },
                    'v-btn': {
                        template: '<button class="v-btn"><slot /></button>'
                    },
                    'v-icon': {
                        template: '<span class="v-icon"><slot /></span>'
                    },
                    'v-divider': {
                        template: '<hr class="v-divider" />'
                    }
                }
            }
        });

        await wrapper.find('.v-btn').trigger('click');
        
        expect(consoleSpy).not.toHaveBeenCalled();
    });
}); 