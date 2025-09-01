module.exports = {
    getEthernalSecret: () => process.env.ETHERNAL_SECRET,
    getApiHost: () => process.env.ETHERNAL_HOST || 'http://localhost:8888'
};
