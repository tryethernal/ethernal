require('./mocks/pm2');
const pm2 = require('pm2');

const supertest = require('supertest');
const app = require('../app');
const request = supertest(app);

beforeEach(() => jest.clearAllMocks());

describe('GET /processes', () => {
    it('Should return a list of processes', (done) => {
        jest.spyOn(pm2, 'list').mockImplementation(cb => cb(null, [{ process: 1 }]));
        request.get('/processes')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ process: 1 }]);
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'list').mockImplementation(cb => cb('error'));
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
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        request.get('/processes/my-explorer')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb('error'));
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
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        request.post('/processes/my-explorer/restart')
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error if invalid command', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb('error'));
        request.post('/processes/my-explorer/bla')
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid command');
                done();
            });
    });

    it('Should return 200 if already deleted', (done) => {
        jest.spyOn(pm2, 'delete').mockImplementation((_, cb) => cb({ message: 'process or namespace not found' }, null));
        request.post('/processes/my-explorer/delete')
            .expect(200)
            .then(() => done());
    });
});

describe('POST /processes', () => {
    it('Should return created process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        request.post('/processes')
            .send({ apiToken: 'abcd', slug: 'my-explorer', workspace: 'My Explorer' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

    it('Should return an error', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb('error'));
        request.post('/processes')
            .send({ apiToken: 'abcd', slug: 'my-explorer', workspace: 'My Explorer' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('error');
                done();
            });
    });
});
