import MockHelper from '../MockHelper';

import HashLink from '@/components/HashLink.vue';

describe('HashLink.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display a shortened link to the address', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: false
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should display a full link to the address', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                hash: '0x2D481eeb2bA97955CD081Cf218f453A817259AB1',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    it('Should not display anything if no hash provided', (done) => {
        const wrapper = helper.mountFn(HashLink, {
            propsData: {
                type: 'address',
                fullHash: true
            }
        });

        expect(wrapper.html()).toMatchSnapshot();
                
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
