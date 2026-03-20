const RpcHealthCheck = {
    findOne: jest.fn()
};

const rpcHealthCheck = {
    id: 1,
    workspaceId: 1,
    isReachable: true,
    failedAttempts: 0
};

module.exports = {
    RpcHealthCheck,
    rpcHealthCheck
};