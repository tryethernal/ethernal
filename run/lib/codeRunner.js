const { NodeVM } = require('vm2');
const ethers = require('ethers');
const web3 = require('web3')

const transactionFn = (code, transaction) => {
    const vm = new NodeVM({
        sandbox: {},
        eval: false,
        wasm: false,
        require: {
            external: true,
            modules: ['ethers', 'web3'],
            mock: {
                ethers: {
                    utils: ethers.utils,
                    BigNumber: ethers.BigNumber
                },
                web3: {
                    utils: web3.utils
                }
            }
        }
    });

    const fn = vm.run(`
        module.exports = function(transaction) {
            const ethers = require('ethers');
            const web3 = require('web3');

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

    return fn(transaction);
};

module.exports = {
    transactionFn: transactionFn
};
