process.env.ENABLE_SENTRY_PIPELINE = 'true';
process.env.GITHUB_ACTIONS_WEBHOOK_SECRET = 'test-secret-123';

require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/models');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);
const { SentryPipelineRun } = require('../../models');

const BASE_URL = '/webhooks/github-actions';
const WEBHOOK_SECRET = 'test-secret-123';

beforeEach(() => {
    jest.clearAllMocks();
});

describe(`POST ${BASE_URL}`, () => {
    it('Should reject requests without authorization', (done) => {
        request.post(BASE_URL)
            .send({ status: 'discovered' })
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toBe('Missing authorization header');
                done();
            });
    });

    it('Should reject requests with invalid token', (done) => {
        request.post(BASE_URL)
            .set('Authorization', 'Bearer wrong-secret')
            .send({ status: 'discovered' })
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toBe('Invalid authorization token');
                done();
            });
    });

    it('Should create a new run', (done) => {
        const mockRun = {
            id: 1,
            status: 'discovered',
            toJSON: () => ({ id: 1, status: 'discovered' }),
            update: jest.fn()
        };
        SentryPipelineRun.findOne.mockResolvedValue(null);
        SentryPipelineRun.create.mockResolvedValue(mockRun);

        request.post(BASE_URL)
            .set('Authorization', `Bearer ${WEBHOOK_SECRET}`)
            .send({
                workflowRunId: 12345,
                githubIssueNumber: 100,
                status: 'discovered',
                sentryTitle: 'Test error',
                currentStep: 'Discovered by scanner'
            })
            .expect(200)
            .then(({ body }) => {
                expect(body.id).toBe(1);
                expect(body.status).toBe('discovered');
                expect(SentryPipelineRun.create).toHaveBeenCalled();
                done();
            });
    });

    it('Should update an existing run by workflowRunId', (done) => {
        const mockRun = {
            id: 1,
            status: 'triaging',
            currentStep: 'Investigating',
            sentryTitle: 'Test error',
            toJSON: () => ({ id: 1, status: 'triaging' }),
            update: jest.fn().mockResolvedValue(true)
        };
        SentryPipelineRun.findOne.mockResolvedValue(mockRun);

        request.post(BASE_URL)
            .set('Authorization', `Bearer ${WEBHOOK_SECRET}`)
            .send({
                workflowRunId: 12345,
                status: 'triaging',
                currentStep: 'Claude is investigating'
            })
            .expect(200)
            .then(({ body }) => {
                expect(mockRun.update).toHaveBeenCalled();
                done();
            });
    });
});
