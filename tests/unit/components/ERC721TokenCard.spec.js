import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ERC721TokenCard from '@/components/ERC721TokenCard.vue';

const helper = new MockHelper();

describe('ERC721TokenCard.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should display an erc721 token card', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TokenByIndex')
            .mockResolvedValueOnce({
                data: {
                    owner: '0x123',
                    tokenId: '0',
                    metadata: {
                        image_data: '<img src="http://image" />',
                        name: 'Token #1',
                        contractAddress: '0xabc',
                        backgroundColor: '#1234'
                    }
                }
            })
        const wrapper = helper.mountFn(ERC721TokenCard, {
            propsData: {
                contractAddress: '0xabc',
                index: 1
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display message if cannot fetch', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TokenByIndex')
            .mockResolvedValueOnce({ data: null });

        const wrapper = helper.mountFn(ERC721TokenCard, {
            propsData: {
                contractAddress: '0xabc',
                index: 1
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
