jest.mock('pm2', () => ({
    connect: jest.fn(cb => cb()),
    list: jest.fn(cb => cb()),
    describe: jest.fn((_, cb) => cb()),
    stop: jest.fn((_, cb) => cb()),
    reload: jest.fn((_, cb) => cb()),
    restart: jest.fn((_, cb) => cb()),
    delete: jest.fn((_, cb) => cb()),
    start: jest.fn((_, cb) => cb()),
    resume: jest.fn((_, cb) => cb())
}));
const pm2 = require('pm2');
const pm2Lib = require('../../lib/pm2');

describe('list', () => {
    it('Should resolve with processes list', (done) => {
        jest.spyOn(pm2, 'list').mockImplementation(cb => cb(null, [{ process: 1 }]));
        pm2Lib.list()
            .then(processes => {
                expect(processes).toEqual([{ process: 1 }]);
                done();
            });
    });
});

describe('show', () => {
    it('Should resolve with process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.show('slug')
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});

describe('stop', () => {
    it('Should resolve with stopped process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.stop('slug')
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});

describe('reload', () => {
    it('Should resolve with reloaded process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.reload('slug')
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});

describe('restart', () => {
    it('Should resolve with restarted process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.restart('slug')
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});

describe('restart', () => {
    it('Should return with resumed process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.resume('slug')
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});

describe('delete', () => {
    it('Should resolve with nothing', (done) => {
        pm2Lib.delete('slug')
            .then(process => {
                expect(process).toEqual();
                done();
            });
    });

    it('Should resolve with nothing if process cannot be found', (done) => {
        jest.spyOn(pm2, 'delete').mockImplementation((_, cb) => cb({ message: 'process or namespace not found' }, null));
        pm2Lib.delete('slug')
            .then(process => {
                expect(process).toEqual();
                done();
            });
    });
});

describe('start', () => {
    it('Should resolve with started process', (done) => {
        jest.spyOn(pm2, 'describe').mockImplementation((_, cb) => cb(null, [{ process: 1 }]));
        pm2Lib.start('slug', 1)
            .then(process => {
                expect(process).toEqual({ process: 1 });
                done();
            });
    });
});