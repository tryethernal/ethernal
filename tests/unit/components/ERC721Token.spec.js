import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ERC721Token from '@/components/ERC721Token.vue';

const helper = new MockHelper();

describe('ERC721Token.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should display a message when the token is not found', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TokenById')
            .mockResolvedValue({ data: null });

        const wrapper = helper.mountFn(ERC721Token, {
            propsData: {
                hash: '0x123',
                index: 0
            },
            stubs: ['ERC721-Token-Transfer-Modal', 'Hash-Link', 'Token-Transfers']
        });
        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should load & display an erc721 token', async () => {
        jest.spyOn(helper.mocks.server, 'getErc721TokenById')
            .mockResolvedValue({ data: {
                metadata: {},
                attributes: {
                    name: 'My Token #1',
                    description: 'This NFT is the best',
                    external_url: 'http://myimage',
                    image_data: `<svg id='luchador1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><style>#luchador1 .lucha-base { fill: #f7c23c; } #luchador1 .lucha-alt { fill: #e0369f; } #luchador1 .lucha-eyes { fill: #339842; } #luchador1 .lucha-skin { fill: #50270e; } #luchador1 .lucha-breathe { animation: 0.5s lucha-breathe infinite alternate ease-in-out; } @keyframes lucha-breathe { from { transform: translateY(0px); } to { transform: translateY(1%); } }</style><g class='lucha-breathe'><path class='lucha-skin' d='M22 12v-1h-1v-1h-1V9h-1V5h-1V3h-1V2h-1V1h-1V0H9v1H8v1H7v1H6v2H5v4H4v1H3v1H2v1H1v8h4v-1h1v-2H5v-3h1v1h1v1h1v2h8v-2h1v-1h1v-1h1v3h-1v2h1v1h4v-8z'/><path class='lucha-base' d='M15 9v9h1V9zM8 10v8h1V9H8z'/><path d='M8 10v8h1V9H8zM15 9v9h1V9z' fill='#000' opacity='.15'/><path class='lucha-base' d='M5 16H1v3h4v-1h1v-1H5zM22 16h-3v1h-1v1h1v1h4v-3z'/><path class='lucha-alt' d='M3 16H1v1h4v-1H4zM22 16h-3v1h4v-1z'/><path class='lucha-base' d='M18 5V3h-1V2h-1V1h-1V0H9v1H8v1H7v1H6v2H5v5h1v2h1v1h1v1h1v1h6v-1h1v-1h1v-1h1v-2h1V5z'/><g class='lucha-alt'><path d='M11 2h2V1h1V0h-4v1h1zM6 10v2h1v-1h1v-1H7zM17 10h-1v1h1v1h1v-2z'/><path d='M16 3h1V2h-1V1h-1v1h-1v1h-1v1h-2V3h-1V2H9V1H8v1H7v1h1v1h1v1h1v1h1v9h2V6h1V5h1V4h1z'/></g><path fill='#FFF' d='M9 6H6v3h4V6zM17 6h-3v3h4V6z'/><path class='lucha-eyes' d='M16 6h-2v3h3V6zM8 6H7v3h3V6H9z'/><path fill='#FFF' d='M7 6h1v1H7zM16 6h1v1h-1z' opacity='.4'/><path fill='#000' d='M15 7h1v1h-1zM8 7h1v1H8z'/><path class='lucha-skin' d='M14 10H9v3h6v-3z'/><path fill='#000' opacity='.9' d='M13 11h-3v1h4v-1z'/></g><path class='lucha-skin' d='M16 23v-6H8v6H7v1h4v-4h2v4h4v-1z'/><path class='lucha-base' d='M15 17H8v1h1v1h2v1h2v-1h2v-1h1v-1z'/><path class='lucha-base' d='M9 21H8v2H7v1h4v-3h-1zM16 23v-2h-3v3h4v-1z'/></svg>`,
                    properties: [{ trait_type: 'Object', value: 'thing' }],
                    levels: [{ trait_type: 'Level', value: 2 }],
                    boosts: [{ trait_type: 'Boost', display_type: 'boost_number', value: 3 }],
                    stats: [{ trait_type: 'Strength', display_type: 'number', value: 4 }],
                    dates: [{ trait_type: 'Birthday', display_type: 'date', value: 1662365851 }]
                },
                contract: {
                    name: 'My NFT Collection',
                }
            }
        });
        jest.spyOn(helper.mocks.server, 'getErc721TokenTransfers')
            .mockResolvedValue({ data: [{ src: '0x123', dst: '0xabc' }]});

        const wrapper = helper.mountFn(ERC721Token, {
            propsData: {
                hash: '0x123',
                index: 0
            },
            stubs: ['ERC721-Token-Transfer-Modal', 'Hash-Link', 'Token-Transfers']
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
