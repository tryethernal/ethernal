import MainNavBar from '@/components/MainNavBar.vue';
import { createVuetify } from 'vuetify';
import { createRouter, createWebHistory } from 'vue-router';
import { VApp, VLayout } from 'vuetify/components';
import { h } from 'vue';

describe('MainNavBar.vue', () => {
    const stubs = ['WalletConnector'];
    const vuetify = createVuetify();
    const router = createRouter({
        history: createWebHistory(),
        routes: []
    });

    beforeEach(() => {
        vi.spyOn(server, 'getWorkspaces').mockResolvedValueOnce({ data: [] });
    });

    it('Should show mobile navigation drawer when mobile prop is true', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia()]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: true,
                        drawer: true
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show desktop navigation bar when mobile prop is false', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia()]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show logo when provided', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia()]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false,
                        logo: 'test-logo.png'
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show admin menu items when user is admin', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia({
                    initialState: {
                        env: {
                            isAdmin: true
                        }
                    }
                })]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show faucet and dex when explorer is demo', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia({
                    initialState: {
                        explorer: {
                            isDemo: true
                        }
                    }
                })]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should emit drawer update event when drawer model value changes', async () => {
        const wrapper = mount(VApp, {
            global: {
                plugins: [
                    createVuetify(),
                    router,
                    createTestingPinia()
                ]
            },
            slots: {
                default: {
                    render: () => h(VLayout, {}, {
                        default: () => h(MainNavBar, {
                            mobile: true,
                            drawer: true,
                            'onUpdate:drawer': (value) => wrapper.vm.$emit('drawer-update', value)
                        })
                    })
                }
            }
        });

        await flushPromises();
        expect(wrapper.emitted('drawer-update')).toBeFalsy();

        const navDrawer = wrapper.findComponent({ name: 'VNavigationDrawer' });
        await navDrawer.vm.$emit('update:modelValue', false);
        
        expect(wrapper.emitted('drawer-update')).toBeTruthy();
        expect(wrapper.emitted('drawer-update')[0]).toEqual([false]);
    });

    it('Should show workspace name when no logo is provided', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia({
                    initialState: {
                        currentWorkspace: {
                            name: 'Test Workspace'
                        }
                    }
                })]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show bridge when explorer is demo', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia({
                    initialState: {
                        explorer: {
                            isDemo: true
                        }
                    }
                })]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show bridge when user is admin and workspace is public', async () => {
        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia({
                    initialState: {
                        env: {
                            isAdmin: true
                        },
                        currentWorkspace: {
                            public: true
                        }
                    }
                })]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should highlight blockchain menu when on blockchain related routes', async () => {
        const router = createRouter({
            history: createWebHistory(),
            routes: [{ path: '/transactions', component: { template: '<div></div>' } }]
        });
        await router.push('/transactions');

        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia()]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should highlight tokens menu when on tokens related routes', async () => {
        const router = createRouter({
            history: createWebHistory(),
            routes: [{ path: '/tokens', component: { template: '<div></div>' } }]
        });
        await router.push('/tokens');

        const wrapper = mount(VApp, {
            global: {
                stubs,
                plugins: [vuetify, router, createTestingPinia()]
            },
            slots: {
                default: {
                    render: () => h(MainNavBar, {
                        mobile: false
                    })
                }
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
}); 