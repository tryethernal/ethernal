require('../mocks/lib/axios');
require('../mocks/lib/utils');

const axios = require('axios');

const PM2 = require('../../lib/pm2');

beforeEach(() => jest.clearAllMocks());

const host = 'http://pm2';
const secret= 'secret';

describe('restart', () => {
    it('Should throw an error if missing parameter', () => {
        const pm2 = new PM2(host, secret);
        expect(() => pm2.restart()).toThrow('Missing parameter');
    });

    it('Should restart the process', (done) => {
        const pm2 = new PM2(host, secret);
        pm2.restart('slug')
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes/slug/restart?secret=secret');
                done();
            });
    });
});

describe('start', () => {
    it('Should throw an error if missing parameter', (done) => {
        const pm2 = new PM2(host, secret);
        pm2.start()
            .catch(error => {
                expect(error).toEqual(new Error('Missing parameter'));
                done();
            });
    });

    it('Should start a process', (done) => {
        const pm2 = new PM2(host, secret);
        jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: null });
        pm2.start('slug', 1)
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes?secret=secret', { slug: 'slug', workspaceId: 1 });
                done();
            });
    });

    it('Should resume existing process', (done) => {
        const pm2 = new PM2(host, secret);
        jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { pm2_env: { status: 'stopped' }}});
        pm2.start('slug', 1)
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes/slug/resume?secret=secret');
                done();
            });
    });
});

describe('resume', () => {
    it('Should throw an error if missing parameter', () => {
        const pm2 = new PM2(host, secret);
        expect(() => pm2.restart()).toThrow('Missing parameter');
    });

    it('Should resume the process', (done) => {
        const pm2 = new PM2(host, secret);
        pm2.resume('slug')
            .then(() => {
                expect(axios.post).toHaveBeenCalledWith('http://pm2/processes/slug/resume?secret=secret');
                done();
            });
    });
});

describe('find', () => {
    it('Should throw an error if missing parameter', () => {
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
    it('Should throw an error if missing parameter', () => {
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