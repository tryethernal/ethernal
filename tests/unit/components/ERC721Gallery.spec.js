import flushPromises from 'flush-promises'
import ERC721Gallery from '@/components/ERC721Gallery.vue';

const stubs = [
    'ERC721-Token-Card'
];

describe('ERC721Gallery.vue', () => {
    it('Should load cards from total supply', async () => {
        vi.spyOn(server, 'getErc721TotalSupply')
            .mockResolvedValue({ data: { totalSupply: '10' }});

        const wrapper = mount(ERC721Gallery, {
            props: {
                address: 'Ox123',
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display info message if no minted tokens', async () => {
        vi.spyOn(server, 'getErc721TotalSupply')
            .mockResolvedValueOnce({ data: { totalSupply: '0' }});

        const wrapper = mount(ERC721Gallery, {
            props: {
                address: 'Ox123',
            },
            global: {
                stubs
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
