jest.mock('../../../lib/opsgenie', () => ({
    createIncident: jest.fn().mockResolvedValue('OK')
}));
