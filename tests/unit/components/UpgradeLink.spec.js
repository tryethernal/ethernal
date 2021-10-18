import MockHelper from '../MockHelper';

import UpgradeLink from '@/components/UpgradeLink.vue';

describe('UpgradeLink.vue', () => {
    let helper;

    beforeEach(() => {
        helper = new MockHelper();
    });

    it('Should display a link to the billing page', (done) => {
        const wrapper = helper.mountFn(UpgradeLink);
        expect(wrapper.html()).toMatchSnapshot();
        done();
    });

    afterEach(async () => {
        await helper.clearFirebase();
    });
});
