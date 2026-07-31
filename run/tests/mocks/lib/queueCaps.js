jest.mock('../../../lib/queueCaps', () => ({
    getCap: jest.fn().mockReturnValue(Infinity),
    isLowTierWorkspace: jest.fn().mockResolvedValue(false),
    countWaitingForWorkspace: jest.fn().mockResolvedValue(0)
}));
