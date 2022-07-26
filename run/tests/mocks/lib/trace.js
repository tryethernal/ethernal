jest.mock('../../../lib/trace', () => ({
    parseTrace: jest.fn().mockResolvedValue([{ op: 'CALL' }, { op: 'CALLSTATIC' }]),
    processTrace: jest.fn()
}));
