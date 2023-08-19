import MockHelper from '../MockHelper';

import ImportArtifactModal from '@/components/ImportArtifactModal.vue';
import DSProxyFactoryContract from '../fixtures/DSProxyFactoryContract.json';

describe('ImportArtifactModal.vue', () => {
    let helper;

    beforeEach(async () => {
        helper = new MockHelper();
    });

    it('Should let the user edit the name and ABI when parameters are valid', async () => {
        const wrapper = helper.mountFn(ImportArtifactModal);
        await wrapper.setData({ dialog: true });

        const syncContractDataMock = jest.spyOn(helper.mocks.server, 'syncContractData');

        await wrapper.find('#contractName').setValue(DSProxyFactoryContract.name);
        await wrapper.find('#contractAbi').setValue(JSON.stringify(DSProxyFactoryContract.abi));
        await wrapper.find('#updateContract').trigger('click');

        await new Promise(process.nextTick);

        expect(syncContractDataMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should warn the user if the ABI is not valid', async () => {
        const wrapper = helper.mountFn(ImportArtifactModal);
        await wrapper.setData({ dialog: true });

        const syncContractDataMock = jest.spyOn(helper.mocks.server, 'syncContractData');

        await wrapper.find('#contractName').setValue(DSProxyFactoryContract.name);
        await wrapper.find('#contractAbi').setValue('{ "a": 1 }');
        await wrapper.find('#updateContract').trigger('click');

        await new Promise(process.nextTick);

        expect(wrapper.vm.errorMessage).toBe('Invalid ABI');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should warn the user if the ABI is not valid json', async () => {
        const wrapper = helper.mountFn(ImportArtifactModal);
        await wrapper.setData({ dialog: true });

        await wrapper.find('#contractName').setValue(DSProxyFactoryContract.name);
        await wrapper.find('#contractAbi').setValue('{ a: 1 }');
        await wrapper.find('#updateContract').trigger('click');
        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should let the user upload a file containing contract metadata', async () => {
        const wrapper = helper.mountFn(ImportArtifactModal);
        await wrapper.setData({ dialog: true });
        const syncContractDataMock = jest.spyOn(helper.mocks.server, 'syncContractData');

        const fileContent = JSON.stringify(DSProxyFactoryContract);
        wrapper.vm.onFileLoaded({ target: { result: fileContent }});

        await wrapper.find('#updateContract').trigger('click');
        await new Promise(process.nextTick);

        expect(syncContractDataMock).toHaveBeenCalled();
        expect(wrapper.vm.abi).toBe(JSON.stringify(DSProxyFactoryContract.abi));
        expect(wrapper.vm.name).toBe(DSProxyFactoryContract.name);
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should warn the user if the file is invalid', async () => {
        const wrapper = helper.mountFn(ImportArtifactModal);
        await wrapper.setData({ dialog: true });
        const syncContractDataMock = jest.spyOn(helper.mocks.server, 'syncContractData');


        const fileContent = JSON.stringify({ a: 1 });
        wrapper.vm.onFileLoaded({ target: { result: fileContent }});
        await wrapper.find('#updateContract').trigger('click');
        await new Promise(process.nextTick);

        expect(syncContractDataMock).toHaveBeenCalled();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
