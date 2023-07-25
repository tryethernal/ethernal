require('../mocks/lib/axios');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
const { ExplorerDomain } = require('../mocks/models');

const axios = require('axios');
const flags = require('../../lib/flags');
const updateApproximatedRecord = require('../../jobs/updateApproximatedRecord');

beforeEach(() => jest.clearAllMocks());

describe('updateApproximatedRecord', () => {
    it('Should return an error if approximate is not enabled', (done) => {
        jest.spyOn(flags, 'isApproximatedEnabled').mockReturnValueOnce(false);;

        updateApproximatedRecord({ data: { explorerDomain: 'domain.com' }})
            .then(res => {
                expect(res).toEqual('Approximated integration is not enabled.');
                done();
            });
    });

    it('Should create a new host', (done) => {
        jest.spyOn(ExplorerDomain, 'findByPk').mockResolvedValueOnce({ domain: 'domain.com' });

        updateApproximatedRecord({ data: { explorerDomain: 'domain.com' }})
            .then(res => {
                expect(res).toEqual('Host created.');
                done();
            });
    });

    it('Should says host already exists', (done) => {
        jest.spyOn(ExplorerDomain, 'findByPk').mockResolvedValueOnce({ domain: 'domain.com' });
        jest.spyOn(axios, 'post').mockRejectedValueOnce();

        updateApproximatedRecord({ data: { explorerDomain: 'domain.com' }})
            .then(res => {
                expect(res).toEqual('Host already exists.');
                done();
            });
    });

    it('Should says host has been deleted', (done) => {
        jest.spyOn(ExplorerDomain, 'findByPk').mockResolvedValueOnce(null);

        updateApproximatedRecord({ data: { explorerDomain: 'domain.com' }})
            .then(res => {
                expect(res).toEqual('Host deleted.');
                done();
            });
    });

    it('Should says host was already deleted', (done) => {
        jest.spyOn(ExplorerDomain, 'findByPk').mockResolvedValueOnce(null);
        jest.spyOn(axios, 'delete').mockRejectedValueOnce();

        updateApproximatedRecord({ data: { explorerDomain: 'domain.com' }})
            .then(res => {
                expect(res).toEqual('Host has already been deleted.');
                done();
            });
    });
});
