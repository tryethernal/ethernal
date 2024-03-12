const Block = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    rawAttributes: { number: 'number' }
};

module.exports = { Block };
