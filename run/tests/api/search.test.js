jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({
        
    })
}));
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/flags');
require('../mocks/middlewares/workspaceAuth');
require('../mocks/middlewares/auth');
const db = require('../../lib/firebase');
const flags = require('../../lib/flags');

const axios = require('axios');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/search';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/icons`, () => {
    it('Should return a list of icons', (done) => {
        axios.get.mockResolvedValueOnce({
            data: [
                { name: 'icon', aliases: ['alias'], tags: ['tag'], styles: ['style'] },
                { name: 'other', aliases: ['other'], tags: ['other'], styles: ['other'] }
            ]
        });

        request.get(`${BASE_URL}/icons?icon=icon`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual([{ name: 'icon', aliases: ['alias'], tags: ['tag'], styles: ['style'] }]);
                done();
            });
    });
});

describe(`GET ${BASE_URL}/fonts`, () => {
    it('Should return an error if google api is not enabled', (done) => {
        jest.spyOn(flags, 'isGoogleApiEnabled').mockReturnValueOnce(false);

        request.get(`${BASE_URL}/fonts?font=font`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Enable Google Font API to use this endpoint.');
                done();
            });
    });

    it('Should return a list of fonts', (done) => {
        axios.get.mockResolvedValueOnce({
            data: {
                items: [
                    { family: 'font' },
                    { family: 'otherfont' },
                    { family: 'other' }
                ]
            }
        });

        request.get(`${BASE_URL}/fonts?font=font`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual(['font', 'otherfont']);
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return an error if invalid search type', (done) => {
        request.get(`${BASE_URL}?type=abc&query=2`)
            .expect(400)
            .then(({ text }) => {
                expect(text).toEqual('Invalid search type.');
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
