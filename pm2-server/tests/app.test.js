require('./mocks/lib/pm2');
const pm2 = require('../lib/pm2');

const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

describe('GET /processes', () => {
    it('Should return a list of processes', (done) => {
        jest.spyOn(pm2, 'list').mockResolvedValue([{ process: 1 }]);
        request.get('/processes')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ process: 1 }]);
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'list').mockRejectedValue(new Error('error'));
        request.get('/processes')
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('error');
                done();
            });
    });
});

describe('GET /processes/:slug', () => {
    it('Should return a process', (done) => {
        jest.spyOn(pm2, 'show').mockResolvedValue({ process: 1 });
        request.get('/processes/my-explorer')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'show').mockRejectedValue(new Error('error'));
        request.get('/processes')
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('error');
                done();
            });
    });
});

describe('POST /processes/:slug/:command', () => {
    it('Should return a process', (done) => {
        jest.spyOn(pm2, 'restart').mockResolvedValue({ process: 1 });
        request.post('/processes/my-explorer/restart')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error if invalid command', (done) => {
        request.post('/processes/my-explorer/bla')
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid command');
                done();
            });
    });

    it('Should return 200 if already deleted', (done) => {
        jest.spyOn(pm2, 'delete').mockResolvedValue();
        request.post('/processes/my-explorer/delete')
            .expect(200)
            .then(() => done());
    });
});

describe('POST /processes', () => {
    it('Should return created process', (done) => {
        jest.spyOn(pm2, 'start').mockResolvedValue({ process: 1 });
        jest.spyOn(pm2, 'show').mockResolvedValue(null);
        request.post('/processes')
            .send({ slug: 'my-explorer', workspaceId: 1 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'start').mockRejectedValue(new Error('error'));
        request.post('/processes')
            .send({ slug: 'my-explorer', workspaceId: 1 })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('error');
                done();
            });
    });
});
