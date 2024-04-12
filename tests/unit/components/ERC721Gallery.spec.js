import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'
import ERC721Gallery from '@/components/ERC721Gallery.vue';

const helper = new MockHelper();
const stubs = [
    'ERC721-Token-Card'
];

describe('ERC721Gallery.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load cards from total supply', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TotalSupply')
            .mockResolvedValue({ data: { totalSupply: '10' }});

        const wrapper = helper.mountFn(ERC721Gallery, {
            propsData: {
                address: 'Ox123',
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display info message if no minted tokens', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TotalSupply')
            .mockResolvedValueOnce({ data: { totalSupply: '0' }});

        const wrapper = helper.mountFn(ERC721Gallery, {
            propsData: {
                address: 'Ox123',
            },
            stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});