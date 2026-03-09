const Transaction = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn()
};

module.exports = { Transaction };
