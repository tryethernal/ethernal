const { NodeVM } = require('vm2');
const ethers = require('ethers');
const web3 = require('web3');
const web3Quorum = require('web3js-quorum');

const transactionFn = (code, transaction) => {
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
        module.exports = async function(transaction) {
            const ethers = require('ethers');
            const Web3 = require('web3');
            const Web3Quorum = require('web3js-quorum');

            try {
                const web3 = new Web3Quorum(new Web3("https://b8c3-2001-861-5e47-8e00-ccf5-8329-a777-76d6.ngrok-free.app"));
                console.log(transaction)
                const payload = await web3.eth.getQuorumPayload(transaction.data);
                return payload != '0x' ? { data: payload } : null;
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
