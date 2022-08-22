import MockHelper from '../MockHelper';
import flushPromises from 'flush-promises'

import ContractVerification from '@/components/ContractVerification.vue';

jest.mock('axios', () => ({
    get: jest.fn()
}));
const axios = require('axios');

const helper = new MockHelper();

describe('ContractVerification.vue', () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should load the UI & the Solidity releases', (done) => {
        jest.spyOn(axios, 'get')
            .mockResolvedValue({ data: { builds: [
                { longVersion: '0.1.2' },
                { longVersion: '0.1.3', prerelease: 'nightly-0.1.3' },
            ]}});
        
        const wrapper = helper.mountFn(ContractVerification, {
            getters: {
                publicExplorer: jest.fn().mockReturnValue({ slug: 'ethernal' })
            }
        });

        setTimeout(() => {
            expect(wrapper.vm.allCompilerVersions.length).toEqual(2);
            expect(wrapper.vm.releasesCompilerVersions.length).toEqual(1);
            expect(wrapper.html()).toMatchSnapshot();
            done();
        }, 1000);
    });
});
