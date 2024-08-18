import MockHelper from '../MockHelper';

import ExplorerDexSettingsDangerZone from '@/components/ExplorerDexSettingsDangerZone.vue';

let helper;

beforeEach(() => {
    jest.clearAllMocks()
    helper = new MockHelper();
});

describe('ExplorerDexSettingsDangerZone.vue', () => {
    it('Should display danger zone', async () => {
        const wrapper = helper.mountFn(ExplorerDexSettingsDangerZone, {
            propsData: { v2DexId: 1 }
        });

        expect(wrapper.html()).toMatchSnapshot();
    });
});
