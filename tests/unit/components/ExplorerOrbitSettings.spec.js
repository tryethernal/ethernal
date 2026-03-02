import ExplorerOrbitSettings from '@/components/ExplorerOrbitSettings.vue';

describe('ExplorerOrbitSettings.vue', () => {
    const mockOrbitConfig = {
        id: 1,
        parentChainRpcServer: 'https://mainnet.infura.io/v3/test',
        rollupContract: '0x1234567890123456789012345678901234567890',
        bridgeContract: '0x2345678901234567890123456789012345678901',
        inboxContract: '0x3456789012345678901234567890123456789012',
        sequencerInboxContract: '0x4567890123456789012345678901234567890123',
        outboxContract: '0x5678901234567890123456789012345678901234',
        l1GatewayRouter: '0x6789012345678901234567890123456789012345',
        l1Erc20Gateway: '0x7890123456789012345678901234567890123456',
        l1WethGateway: '0x8901234567890123456789012345678901234567',
        l1CustomGateway: '0x9012345678901234567890123456789012345678',
        l2GatewayRouter: '0x0123456789012345678901234567890123456789',
        l2Erc20Gateway: '0x1234567890123456789012345678901234567890',
        l2WethGateway: '0x2345678901234567890123456789012345678901',
        l2CustomGateway: '0x3456789012345678901234567890123456789012',
        challengeManagerContract: '0x4567890123456789012345678901234567890123',
        validatorWalletCreatorContract: '0x5678901234567890123456789012345678901234',
        stakeToken: '0x6789012345678901234567890123456789012345',
        parentMessageCountShift: 0
    };

    beforeEach(() => {
        vi.spyOn(server, 'getOrbitConfig').mockResolvedValueOnce({ data: { orbitConfig: mockOrbitConfig } });
        vi.spyOn(server, 'createOrbitConfig').mockResolvedValueOnce({ data: { config: mockOrbitConfig } });
        vi.spyOn(server, 'updateOrbitConfig').mockResolvedValueOnce({ data: { config: mockOrbitConfig } });
    });

    it('Should display the component with existing configuration', async () => {
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the component without existing configuration', async () => {
        vi.spyOn(server, 'getOrbitConfig').mockResolvedValueOnce({ data: { orbitConfig: {} } });
        
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the component with SSO enabled', async () => {
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { 
                explorerId: 1,
                sso: true
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show success message after creating configuration', async () => {
        vi.spyOn(server, 'getOrbitConfig').mockResolvedValueOnce({ data: { orbitConfig: {} } });
        
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        // Fill in required fields using the component's data
        wrapper.vm.config.parentChainRpcServer = 'https://mainnet.infura.io/v3/test';
        wrapper.vm.config.rollupContract = '0x1234567890123456789012345678901234567890';
        wrapper.vm.config.bridgeContract = '0x2345678901234567890123456789012345678901';
        wrapper.vm.config.inboxContract = '0x3456789012345678901234567890123456789012';
        wrapper.vm.config.sequencerInboxContract = '0x4567890123456789012345678901234567890123';
        wrapper.vm.config.outboxContract = '0x5678901234567890123456789012345678901234';
        wrapper.vm.config.l1GatewayRouter = '0x6789012345678901234567890123456789012345';
        wrapper.vm.config.l1Erc20Gateway = '0x7890123456789012345678901234567890123456';
        wrapper.vm.config.l1WethGateway = '0x8901234567890123456789012345678901234567';
        wrapper.vm.config.l1CustomGateway = '0x9012345678901234567890123456789012345678';
        wrapper.vm.config.l2GatewayRouter = '0x0123456789012345678901234567890123456789';
        wrapper.vm.config.l2Erc20Gateway = '0x1234567890123456789012345678901234567890';
        wrapper.vm.config.l2WethGateway = '0x2345678901234567890123456789012345678901';
        wrapper.vm.config.l2CustomGateway = '0x3456789012345678901234567890123456789012';

        // Submit form
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show success message after updating configuration', async () => {
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        // Update a field
        wrapper.vm.config.parentChainRpcServer = 'https://mainnet.infura.io/v3/updated';

        // Submit form
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error message when creating configuration fails', async () => {
        vi.spyOn(server, 'createOrbitConfig').mockRejectedValueOnce({ response: { data: 'Configuration failed' } });
        vi.spyOn(server, 'getOrbitConfig').mockResolvedValueOnce({ data: { orbitConfig: {} } });
        
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        // Fill in required fields using the component's data
        wrapper.vm.config.parentChainRpcServer = 'https://mainnet.infura.io/v3/test';
        wrapper.vm.config.rollupContract = '0x1234567890123456789012345678901234567890';
        wrapper.vm.config.bridgeContract = '0x2345678901234567890123456789012345678901';
        wrapper.vm.config.inboxContract = '0x3456789012345678901234567890123456789012';
        wrapper.vm.config.sequencerInboxContract = '0x4567890123456789012345678901234567890123';
        wrapper.vm.config.outboxContract = '0x5678901234567890123456789012345678901234';
        wrapper.vm.config.l1GatewayRouter = '0x6789012345678901234567890123456789012345';
        wrapper.vm.config.l1Erc20Gateway = '0x7890123456789012345678901234567890123456';
        wrapper.vm.config.l1WethGateway = '0x8901234567890123456789012345678901234567';
        wrapper.vm.config.l1CustomGateway = '0x9012345678901234567890123456789012345678';
        wrapper.vm.config.l2GatewayRouter = '0x0123456789012345678901234567890123456789';
        wrapper.vm.config.l2Erc20Gateway = '0x1234567890123456789012345678901234567890';
        wrapper.vm.config.l2WethGateway = '0x2345678901234567890123456789012345678901';
        wrapper.vm.config.l2CustomGateway = '0x3456789012345678901234567890123456789012';

        // Submit form
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should show error message when updating configuration fails', async () => {
        vi.spyOn(server, 'updateOrbitConfig').mockRejectedValueOnce({ response: { data: 'Update failed' } });
        
        const wrapper = mount(ExplorerOrbitSettings, {
            props: { explorerId: 1 }
        });
        await flushPromises();

        // Update a field
        wrapper.vm.config.parentChainRpcServer = 'https://mainnet.infura.io/v3/updated';

        // Submit form
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
