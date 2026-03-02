const Block = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    rawAttributes: { number: 'number' }
};

module.exports = { Block };
