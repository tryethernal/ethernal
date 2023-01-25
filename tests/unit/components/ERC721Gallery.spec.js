import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'
import ERC721Gallery from '@/components/ERC721Gallery.vue';

const helper = new MockHelper();
const stubs = [
    'ERC721-Token-Card'
];

describe('ERC721Gallery.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load & display tokens', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721Tokens')
            .mockResolvedValue({ data: { total: 1, items: [{ tokenId: '1', owner: '0xabc', attributes: { name: 'Ethernal' }}]}});
        
        const wrapper = helper.mountFn(ERC721Gallery, {
            propsData: {
                address: 'Ox123',
                totalSupply: 100,
                has721Enumerable: true
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display info message if contract is not enumerable', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721Tokens')
            .mockResolvedValue({ data: { total: 1, items: [{ tokenId: '1', owner: '0xabc', attributes: { name: 'Ethernal' }}]}});
        
        const wrapper = helper.mountFn(ERC721Gallery, {
            propsData: {
                address: 'Ox123',
                totalSupply: 100,
                has721Enumerable: false
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display info message if contract is enumerable but there are no tokens minted', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721Tokens')
            .mockResolvedValue({ data: { total: 0, items: []}});
        
        const wrapper = helper.mountFn(ERC721Gallery, {
            propsData: {
                address: 'Ox123',
                totalSupply: 0,
                has721Enumerable: true
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});