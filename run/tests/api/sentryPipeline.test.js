process.env.ENABLE_SENTRY_PIPELINE = 'true';

require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/models');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/sentryPipeline';

beforeEach(() => {
    jest.clearAllMocks();
});

describe(`GET ${BASE_URL}/runs`, () => {
    it('Should return paginated runs', (done) => {
        const mockResult = {
            items: [{ id: 1, status: 'discovered', sentryTitle: 'Test error' }],
            total: 1
        };
        jest.spyOn(db, 'getSentryPipelineRuns').mockResolvedValueOnce(mockResult);

        request.get(`${BASE_URL}/runs?page=1&itemsPerPage=25`)
            .expect(200)
            .then(({ body }) => {
                expect(body.items).toHaveLength(1);
                expect(body.total).toBe(1);
                expect(db.getSentryPipelineRuns).toHaveBeenCalledWith(1, 25, undefined);
                done();
            });
    });

    it('Should filter by status', (done) => {
        jest.spyOn(db, 'getSentryPipelineRuns').mockResolvedValueOnce({ items: [], total: 0 });

        request.get(`${BASE_URL}/runs?status=completed`)
            .expect(200)
            .then(() => {
                expect(db.getSentryPipelineRuns).toHaveBeenCalledWith(1, 25, 'completed');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/runs/:id`, () => {
    it('Should return a single run', (done) => {
        const mockRun = { id: 1, status: 'fixing', conversationLog: [{ role: 'assistant', text: 'Looking...' }] };
        jest.spyOn(db, 'getSentryPipelineRun').mockResolvedValueOnce(mockRun);

        request.get(`${BASE_URL}/runs/1`)
            .expect(200)
            .then(({ body }) => {
                expect(body.id).toBe(1);
                expect(body.conversationLog).toHaveLength(1);
                done();
            });
    });

    it('Should return 404 for missing run', (done) => {
        jest.spyOn(db, 'getSentryPipelineRun').mockResolvedValueOnce(null);

        request.get(`${BASE_URL}/runs/999`)
            .expect(404)
            .then(({ body }) => {
                expect(body.error).toBe('Run not found');
                done();
            });
    });
});

describe(`GET ${BASE_URL}/stats`, () => {
    it('Should return stats', (done) => {
        const mockStats = { total: 10, completed: 7, failed: 1, successRate: 70, avgDuration: 120, active: 2 };
        jest.spyOn(db, 'getSentryPipelineStats').mockResolvedValueOnce(mockStats);

        request.get(`${BASE_URL}/stats?period=7d`)
            .expect(200)
            .then(({ body }) => {
                expect(body.total).toBe(10);
                expect(body.successRate).toBe(70);
                done();
            });
    });
});
