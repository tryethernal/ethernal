jest.mock('../../../lib/opsgenie', () => ({
    createIncident: jest.fn().mockResolvedValue('OK'),
    closeIncident: jest.fn().mockResolvedValue('OK')
}));
