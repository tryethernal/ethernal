import Contracts from '@/components/Contracts.vue';

describe('Contracts.vue', () => {
    it('Should show the contracts list', async () => {
        const contracts = [
            {
                address: '0x0',
                creationTransaction: { timestamp: '2022-05-06T17:11:26.000Z' },
                name: 'My Contract',
            },
            {
                address: '0x1',
                name: 'Another Contract',
            }
        ];

        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { items: contracts, total: 2 }});

        const wrapper = mount(Contracts, {
            global: {
                stubs: ['Hash-Link', 'Import-Contract-Modal', 'Remove-Contract-Confirmation-Modal']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.vm.contracts).toStrictEqual(contracts);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show the loading message when empty contracts list', async () => {
        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { items: [], total: 0 }});

        const wrapper = mount(Contracts, {
            global: {
                stubs: ['Hash-Link', 'Import-Contract-Modal', 'Remove-Contract-Confirmation-Modal']
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display a warning message for free users with 10 contracts', async () => {
        const contracts = [];
        for (let i = 0; i < 10; i++)
            contracts.push({ address: `0x${i}`, name: `0x${i}`, creationTransaction: { timestamp: '2022-05-06T17:11:26.000Z' }});

        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { items: contracts, total: 10 }});

        const wrapper = mount(Contracts, {
            global: {
                stubs: ['Hash-Link', 'Import-Contract-Modal', 'Remove-Contract-Confirmation-Modal'],
                plugins: [createTestingPinia({ initialState: { user: { plan: 'free', isAdmin: true } } })]
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display a warning message for premium users with 10 contracts', async () => {
        const contracts = [];
        for (let i = 0; i < 10; i++)
            contracts.push({ address: `0x${i}`, name: `0x${i}`, creationTransaction: { timestamp: '2022-05-06T17:11:26.000Z' }});

        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { items: contracts, total: 10 }});

        const wrapper = mount(Contracts, {
            global: {
                stubs: ['Hash-Link', 'Import-Contract-Modal', 'Remove-Contract-Confirmation-Modal'],
                plugins: [createTestingPinia({ initialState: { user: { plan: 'premium', isAdmin: true } } })]
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display a warning message for public explorers', async () => {
        const contracts = [];
        for (let i = 0; i < 10; i++)
            contracts.push({ address: `0x${i}`, name: `0x${i}`, creationTransaction: { timestamp: '2022-05-06T17:11:26.000Z' }});

        vi.spyOn(server, 'getContracts')
            .mockResolvedValue({ data: { items: contracts, total: 10 }});

        const wrapper = mount(Contracts, {
            global: {
                stubs: ['Hash-Link', 'Import-Contract-Modal', 'Remove-Contract-Confirmation-Modal'],
                plugins: [createTestingPinia({
                    initialState: {
                        user: { plan: 'free', isAdmin: true },
                        currentWorkspace: { public: true }
                    }
                })]
            }
        });
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });
});
