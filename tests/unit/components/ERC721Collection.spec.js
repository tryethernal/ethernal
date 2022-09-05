import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ERC721Collection from '@/components/ERC721Collection.vue';

const helper = new MockHelper();

describe('ERC721Collection.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load & display tokens', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721Tokens')
            .mockResolvedValue({ data: { total: 1, items: [{ tokenId: '1', owner: '0xabc', attributes: { name: 'Ethernal' }}]}});
        
        const wrapper = helper.mountFn(ERC721Collection, {
            propsData: {
                address: 'Ox123',
                totalSupply: 100
            },
            stubs: ['ERC721-Token-Card']
        });
        await flushPromises();
        
        expect(wrapper.vm.tokens.length).toEqual(12);
        expect(wrapper.html()).toMatchSnapshot();
    });
});
