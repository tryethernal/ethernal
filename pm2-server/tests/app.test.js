require('./mocks/lib/pm2');
require('./mocks/lib/env');
const pm2 = require('../lib/pm2');

const supertest = require('supertest');

// Mock the middleware module to bypass authentication
jest.mock('../lib/middleware', () => ({
    secretMiddleware: (req, res, next) => next()
}));

const app = require('../app');
const request = supertest(app);

beforeEach(() => {
    jest.clearAllMocks();
});

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
    it('Should start existing stopped process', (done) => {
        jest.spyOn(pm2, 'show').mockResolvedValue({ pm2_env: { status: 'stopped' }});
        jest.spyOn(pm2, 'resume').mockResolvedValue({ process: 1 });
        request.post('/processes')
            .send({ slug: 'my-explorer', workspaceId: 1 })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ process: 1 });
                done();
            });
    });

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

describe('POST /log-listener', () => {
    it('Should return 400 when slug is missing', (done) => {
        request.post('/log-listener')
            .send({ jsonArgs: { arg1: 'value1' } })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should return 400 when jsonArgs is missing', (done) => {
        request.post('/log-listener')
            .send({ slug: 'test-process' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should return 400 when both slug and jsonArgs are missing', (done) => {
        request.post('/log-listener')
            .send({})
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should successfully start log listener when all parameters are valid', (done) => {
        const mockPm2Process = { id: 1, name: 'test-process', status: 'online' };
        jest.spyOn(pm2, 'startLogListener').mockResolvedValue(mockPm2Process);

        request.post('/log-listener')
            .send({ slug: 'test-process', jsonArgs: { arg1: 'value1' } })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual(mockPm2Process);
                expect(pm2.startLogListener).toHaveBeenCalledWith('test-process', { arg1: 'value1' });
                done();
            });
    });

    it('Should handle pm2.startLogListener errors', (done) => {
        const errorMessage = 'PM2 process failed to start';
        jest.spyOn(pm2, 'startLogListener').mockRejectedValue(new Error(errorMessage));

        request.post('/log-listener')
            .send({ slug: 'test-process', jsonArgs: { arg1: 'value1' } })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe(errorMessage);
                done();
            });
    });
});

describe('POST /safe-block-listener', () => {
    it('Should return 400 when slug is missing', (done) => {
        request.post('/safe-block-listener')
            .send({ workspaceId: 'workspace-123' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should return 400 when workspaceId is missing', (done) => {
        request.post('/safe-block-listener')
            .send({ slug: 'safe-block-process' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should return 400 when both slug and workspaceId are missing', (done) => {
        request.post('/safe-block-listener')
            .send({})
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe('Missing parameter');
                done();
            });
    });

    it('Should successfully start safe block listener when all parameters are valid', (done) => {
        const mockPm2Process = { id: 2, name: 'safe-block-process', status: 'online' };
        jest.spyOn(pm2, 'startSafeBlockListener').mockResolvedValue(mockPm2Process);

        request.post('/safe-block-listener')
            .send({ slug: 'safe-block-process', workspaceId: 'workspace-123' })
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual(mockPm2Process);
                expect(pm2.startSafeBlockListener).toHaveBeenCalledWith('safe-block-process', 'workspace-123');
                done();
            });
    });

    it('Should handle pm2.startSafeBlockListener errors', (done) => {
        const errorMessage = 'Safe block listener failed to start';
        jest.spyOn(pm2, 'startSafeBlockListener').mockRejectedValue(new Error(errorMessage));

        request.post('/safe-block-listener')
            .send({ slug: 'safe-block-process', workspaceId: 'workspace-123' })
            .expect(400)
            .then(({ text }) => {
                expect(text).toBe(errorMessage);
                done();
            });
    });
});
