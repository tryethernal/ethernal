require('../mocks/models');
require('../mocks/lib/analytics');
require('../mocks/lib/firebase');
require('../mocks/lib/firebase-admin');
require('../mocks/lib/crypto');
require('../mocks/lib/stripe');
require('../mocks/lib/queue');
require('../mocks/lib/flags');
require('../mocks/lib/errors');
require('../mocks/middlewares/auth');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/passportLocalStrategy');

const express = require('express');
const supertest = require('supertest');

const db = require('../../lib/firebase');
const { unmanagedError } = require('../../lib/errors');

const app = express();
app.use(express.json());
app.use('/opOutputs', require('../../api/opOutputs'));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    res.status(400).json({ error: error.message });
});

const request = supertest(app);
const BASE_URL = '/opOutputs';

describe('OpOutputs API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        unmanagedError.mockImplementation((error, req, next) => {
            if (next && typeof next === 'function') {
                next(error);
            }
        });
    });

    describe(`GET ${BASE_URL}`, () => {
        it('should return paginated list of OP outputs', (done) => {
            const mockData = {
                rows: [
                    { id: 1, outputIndex: 50, outputRoot: '0xabc', status: 'proposed' },
                    { id: 2, outputIndex: 51, outputRoot: '0xdef', status: 'finalized' }
                ],
                count: 100
            };

            db.getWorkspaceOpOutputs.mockResolvedValue(mockData);

            request.get(`${BASE_URL}`)
                .query({ page: 1, itemsPerPage: 10, order: 'DESC' })
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual({
                        items: mockData.rows,
                        total: 100
                    });
                    done();
                })
                .catch(done);
        });

        it('should handle errors', (done) => {
            const error = new Error('Database error');
            db.getWorkspaceOpOutputs.mockRejectedValue(error);

            request.get(`${BASE_URL}`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Database error' });
                    done();
                })
                .catch(done);
        });
    });

    describe(`GET ${BASE_URL}/:outputIndex`, () => {
        it('should return output details', (done) => {
            const mockOutput = {
                id: 1,
                outputIndex: 50,
                outputRoot: '0xabc',
                l2BlockNumber: 1000,
                status: 'finalized'
            };

            db.getOpOutput.mockResolvedValue(mockOutput);

            request.get(`${BASE_URL}/50`)
                .expect(200)
                .then(({ body }) => {
                    expect(body).toEqual(mockOutput);
                    done();
                })
                .catch(done);
        });

        it('should handle output not found', (done) => {
            const error = new Error('Could not find output');
            db.getOpOutput.mockRejectedValue(error);

            request.get(`${BASE_URL}/999`)
                .expect(400)
                .then(({ body }) => {
                    expect(body).toEqual({ error: 'Could not find output' });
                    done();
                })
                .catch(done);
        });
    });
});
