import ExplorerOpSettings from '@/components/ExplorerOpSettings.vue';

describe('ExplorerOpSettings.vue', () => {
    it('Should call getOpConfig and getAvailableL1Parents on mount', async () => {
        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableL1Parents')
            .mockResolvedValue({ data: { publicParents: [], customParents: [] } });

        mount(ExplorerOpSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(server.getOpConfig).toHaveBeenCalled();
        expect(server.getAvailableL1Parents).toHaveBeenCalled();
    });

    it('Should display L1 parent chain selection', async () => {
        const mockPublicParents = [
            { networkId: 1, name: 'Ethereum Mainnet' }
        ];

        vi.spyOn(server, 'getOpConfig')
            .mockResolvedValue({ data: null });
        vi.spyOn(server, 'getAvailableL1Parents')
            .mockResolvedValue({ data: { publicParents: mockPublicParents, customParents: [] } });

        const wrapper = mount(ExplorerOpSettings, {
            props: {
                explorerId: 1
            },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.text()).toContain('L1 Parent Chain');
    });

    describe('Challenge period (finalizationPeriodSeconds)', () => {
        beforeEach(() => {
            window.scrollTo = vi.fn();
        });

        const mountComponent = () => mount(ExplorerOpSettings, {
            props: { explorerId: 1 },
            global: {
                stubs: ['Hash-Link', 'router-link', 'HashLink']
            }
        });

        const getChallengePeriodInput = (wrapper) => {
            const input = wrapper.findAll('input[type="number"]')
                .find(i => i.element.closest('.v-input').textContent.includes('Challenge Period'));
            expect(input).toBeTruthy();
            return input;
        };

        it('Should display the saved finalizationPeriodSeconds of an existing config', async () => {
            vi.spyOn(server, 'getOpConfig').mockResolvedValue({
                data: {
                    opConfig: {
                        id: 1,
                        optimismPortalAddress: '0x1234567890123456789012345678901234567890',
                        batchInboxAddress: '0x2345678901234567890123456789012345678901',
                        finalizationPeriodSeconds: 1209600
                    }
                }
            });
            vi.spyOn(server, 'getAvailableL1Parents')
                .mockResolvedValue({ data: { publicParents: [], customParents: [] } });

            const wrapper = mountComponent();
            await flushPromises();

            expect(getChallengePeriodInput(wrapper).element.value).toBe('1209600');
        });

        it('Should send finalizationPeriodSeconds when creating a config', async () => {
            vi.spyOn(server, 'getOpConfig').mockResolvedValue({ data: { opConfig: null } });
            vi.spyOn(server, 'getAvailableL1Parents')
                .mockResolvedValue({ data: { publicParents: [], customParents: [] } });
            vi.spyOn(server, 'createOpConfig').mockResolvedValue({
                data: { config: { id: 1, finalizationPeriodSeconds: 1209600, parentChainId: 1 } }
            });

            const wrapper = mountComponent();
            await flushPromises();

            wrapper.vm.selectedL1Type = 'network-1';
            wrapper.vm.config.optimismPortalAddress = '0x1234567890123456789012345678901234567890';
            wrapper.vm.config.batchInboxAddress = '0x2345678901234567890123456789012345678901';
            await flushPromises();

            await getChallengePeriodInput(wrapper).setValue('1209600');
            await wrapper.find('form').trigger('submit');
            await flushPromises();

            expect(server.createOpConfig).toHaveBeenCalledTimes(1);
            const payload = server.createOpConfig.mock.calls[0][1];
            expect(Number(payload.finalizationPeriodSeconds)).toBe(1209600);
            expect(payload).not.toHaveProperty('challengePeriodSeconds');
        });

        it('Should send finalizationPeriodSeconds when updating a config', async () => {
            vi.spyOn(server, 'getOpConfig').mockResolvedValue({
                data: {
                    opConfig: {
                        id: 1,
                        optimismPortalAddress: '0x1234567890123456789012345678901234567890',
                        batchInboxAddress: '0x2345678901234567890123456789012345678901',
                        finalizationPeriodSeconds: 604800
                    }
                }
            });
            vi.spyOn(server, 'getAvailableL1Parents')
                .mockResolvedValue({ data: { publicParents: [], customParents: [] } });
            vi.spyOn(server, 'updateOpConfig').mockResolvedValue({
                data: { config: { id: 1, finalizationPeriodSeconds: 86400, parentChainId: 1 } }
            });

            const wrapper = mountComponent();
            await flushPromises();

            await getChallengePeriodInput(wrapper).setValue('86400');
            await wrapper.find('form').trigger('submit');
            await flushPromises();

            expect(server.updateOpConfig).toHaveBeenCalledTimes(1);
            const payload = server.updateOpConfig.mock.calls[0][1];
            expect(Number(payload.finalizationPeriodSeconds)).toBe(86400);
            expect(payload).not.toHaveProperty('challengePeriodSeconds');
        });
    });
});
