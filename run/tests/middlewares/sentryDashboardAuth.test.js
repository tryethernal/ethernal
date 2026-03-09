const sentryDashboardAuth = require('../../middlewares/sentryDashboardAuth');

const mockRequest = (authHeader) => ({
    headers: authHeader ? { authorization: authHeader } : {}
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENTRY_DASHBOARD_USERNAME = 'admin';
    process.env.SENTRY_DASHBOARD_PASSWORD = 'secret123';
});

afterEach(() => {
    delete process.env.SENTRY_DASHBOARD_USERNAME;
    delete process.env.SENTRY_DASHBOARD_PASSWORD;
});

describe('sentryDashboardAuth', () => {
    it('Should return 401 with WWW-Authenticate when no Authorization header', () => {
        const req = mockRequest();
        const res = mockResponse();
        const next = jest.fn();

        sentryDashboardAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Sentry Dashboard"');
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return 401 when credentials are invalid', () => {
        const credentials = Buffer.from('wrong:wrong').toString('base64');
        const req = mockRequest(`Basic ${credentials}`);
        const res = mockResponse();
        const next = jest.fn();

        sentryDashboardAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should call next when credentials match', () => {
        const credentials = Buffer.from('admin:secret123').toString('base64');
        const req = mockRequest(`Basic ${credentials}`);
        const res = mockResponse();
        const next = jest.fn();

        sentryDashboardAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('Should return 401 when Authorization header is not Basic', () => {
        const req = mockRequest('Bearer sometoken');
        const res = mockResponse();
        const next = jest.fn();

        sentryDashboardAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('Should return 500 when env vars are not configured', () => {
        delete process.env.SENTRY_DASHBOARD_USERNAME;
        delete process.env.SENTRY_DASHBOARD_PASSWORD;

        const credentials = Buffer.from('admin:secret123').toString('base64');
        const req = mockRequest(`Basic ${credentials}`);
        const res = mockResponse();
        const next = jest.fn();

        sentryDashboardAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });
});
