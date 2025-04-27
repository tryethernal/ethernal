import flushPromises from 'flush-promises'

import AddressAssets from '@/components/AddressAssets.vue';

const stubs = ['AddressTokenAssets', 'NFTGallery'];

describe('AddressAssets.vue', () => {
    it('Should load address assets', async () => {
        const wrapper = mount(AddressAssets, {
            props: {
                address: '0x1234567890123456789012345678901234567890'
            },
            global: {
                stubs
            }
        });
        await flushPromises();

        expect(wrapper.html()).toMatchSnapshot();
    });
});
