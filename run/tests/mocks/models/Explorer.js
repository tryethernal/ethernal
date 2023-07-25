const explorer = {
    name: 'Ethernal',
    slug: 'ethernal',
    toJSON: () => ({ name: 'Ethernal', slug: 'ethernal' })
};

const Explorer = {
    findOne: jest.fn(),
    findBySlug: jest.fn().mockResolvedValue(explorer),
    findByDomain: jest.fn().mockResolvedValue(explorer),
    safeCreateExplorer: jest.fn().mockResolvedValue(explorer)
};

module.exports = {
    Explorer: Explorer,
    explorer: explorer
};
