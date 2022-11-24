require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/middlewares/workspaceAuth');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/search';

describe(`GET ${BASE_URL}`, () => {
    beforeEach(() => jest.clearAllMocks());

    it('Should return an error if invalid search type', (done) => {
        request.get(`${BASE_URL}?type=abc&query=2`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('[GET /api/search] Invalid search type.');
                done();
            });
    });

    it('Should not return results if search type is text and less than 3 chars', (done) => {
        request.get(`${BASE_URL}?type=text&query=ab`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([]);
                done();
            });
    });

     it('Should return results if search type is number and chars number < 3', (done) => {
        jest.spyOn(db, 'searchForNumber').mockResolvedValueOnce([{ type: 'block', data: { number: 1 }}]);
        request.get(`${BASE_URL}?type=number&query=2`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ type: 'block', data: { number: 1 }}]);
                done();
            });
    });
});