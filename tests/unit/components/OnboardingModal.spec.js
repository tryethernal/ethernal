import OnboardingModal from '@/components/OnboardingModal.vue';

describe('OnboardingModal.vue', () => {
    it('Should let the user create a new workspace', async () => {
        vi.spyOn(server, 'initRpcServer').mockResolvedValue(true);
        vi.spyOn(server, 'getRpcAccounts')
            .mockResolvedValue(['0x123', '0x456']);

        vi.spyOn(server, 'createWorkspace').mockResolvedValue({ data: {
            workspace: {
                rpcServer: 'https://127.0.0.1',
                networkId: 1,
                settings: {
                    gasLimit: 1234567
                },
            },
            name: 'Hardhat'
        }});

        const wrapper = mount(OnboardingModal, {
            global: {
                stubs: ['Create-Workspace']
            }
        });

        await wrapper.setData({ dialog: true });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
