require('../mocks/lib/axios');
require('../mocks/lib/utils');

const axios = require('axios');

const PM2 = require('../../lib/pm2');

beforeEach(() => jest.clearAllMocks());

const host = 'http://pm2';
const secret= 'secret';

describe('start', () => {
    it('Should throw an error if missing parameter', async () => {
        const pm2 = new PM2(host, secret);
        expect(() => pm2.start()).toThrow('Missing parameter');
    });

    it('Should start a process', (done) => {
        const pm2 = new PM2(host, secret);
        pm2.start('slug', 'workspace', 'apiToken')
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes?secret=secret', { slug: 'slug', workspace: 'workspace', apiToken: 'apiToken' });
                done();
            });
    });
});

describe('find', () => {
    it('Should throw an error if missing parameter', async () => {
        const pm2 = new PM2(host, secret);
        expect(() => pm2.find()).toThrow('Missing parameter');
    });

    it('Should return a process', (done) => {
        jest.spyOn(axios, 'get').mockResolvedValue({ data: { id: 1 }});
        const pm2 = new PM2(host, secret);
        pm2.find('slug')
            .then(res => {
                expect(axios.get).toHaveBeenCalledWith('http://pm2/processes/slug?secret=secret');
                expect(res).toEqual({ data: { id: 1 }});
                done();
            });
    });
});

describe('delete', () => {
    it('Should throw an error if missing parameter', async () => {
        const pm2 = new PM2(host, secret);
        expect(() => pm2.delete()).toThrow('Missing parameter');
    });

    it('Should send the delete request', (done) => {
        const pm2 = new PM2(host, secret);
        pm2.delete('slug')
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes/slug/delete?secret=secret');
                done();
            });
    })
})