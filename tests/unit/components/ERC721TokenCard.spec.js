import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ERC721TokenCard from '@/components/ERC721TokenCard.vue';

const helper = new MockHelper();

describe('ERC721TokenCard.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should display an erc721 token card', async () => {
        const wrapper = helper.mountFn(ERC721TokenCard, {
            propsData: {
                owner: '0x123',
                index: 0,
                imageData: '<img src="http://image" />',
                name: 'Token #1',
                contractAddress: '0xabc',
                backgroundColor: '#1234'
            },
            stubs: ['Hash-Link']
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
