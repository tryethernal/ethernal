const { NodeVM } = require('vm2');
const ethers = require('ethers');
const web3 = require('web3');
const web3Quorum = require('web3js-quorum');

const transactionFn = (code, transaction, rpcServer) => {
    const vm = new NodeVM({
        sandbox: {},
        eval: false,
        wasm: false,
        require: {
            external: true,
            modules: ['ethers', 'web3', 'web3js-quorum'],
            mock: {
                ethers: {
                    utils: ethers.utils,
                    BigNumber: ethers.BigNumber
                },
                web3: web3,
                'web3js-quorum': web3Quorum
            }
        }
    });

    const fn = vm.run(`
        module.exports = async function(transaction, rpcServer) {
            const ethers = require('ethers');
            const Web3 = require('web3');
            const Web3Quorum = require('web3js-quorum');

            try {
                ${code}
            } catch(error) {
                console.log(error)
                return {
                    success: false,
                    error: error
                };
            }
        };
    `);

    return fn(transaction, rpcServer);
};

module.exports = {
    transactionFn: transactionFn
};
