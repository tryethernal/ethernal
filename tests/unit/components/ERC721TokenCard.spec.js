import flushPromises from 'flush-promises'

import ERC721TokenCard from '@/components/ERC721TokenCard.vue';

describe('ERC721TokenCard.vue', () => {

    it('Should display an erc721 token card', async () => {
        vi.spyOn(server, 'getErc721TokenByIndex')
            .mockResolvedValueOnce({
                data: {
                    owner: '0x123',
                    tokenId: '0',
                    attributes: {
                        image_data: '<img src="http://image" />',
                        name: 'Token #1',
                        backgroundColor: '#1234'
                    },
                    metadata: {
                        image_data: '<img src="http://image" />',
                        name: 'Token #1',
                        contractAddress: '0xabc',
                        backgroundColor: '#1234'
                    }
                }
            })
        const wrapper = mount(ERC721TokenCard, {
            props: {
                contractAddress: '0xabc',
                index: 1
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display message if cannot fetch', async () => {
        vi.spyOn(server, 'getErc721TokenByIndex')
            .mockResolvedValueOnce({ data: null });

        const wrapper = mount(ERC721TokenCard, {
            props: {
                contractAddress: '0xabc',
                index: 1
            },
            global: {
                stubs: ['Hash-Link']
            }
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
