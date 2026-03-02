/**
 * @fileoverview Sandboxed code execution using VM2.
 * Allows running user-defined code in isolation for contract and transaction processing.
 * @module lib/codeRunner
 */

const { NodeVM } = require('vm2');
const ethers = require('ethers');
const web3 = require('web3');
const web3Quorum = require('web3js-quorum');

/**
 * Executes user-provided code in a sandboxed VM for contract processing.
 * Code has access to contract and metadata objects.
 * @param {string} code - JavaScript code to execute
 * @param {Object} contract - Contract object passed to the code
 * @param {Object} metadata - Metadata object passed to the code
 * @returns {Promise<*>} Result of code execution or null on error
 */
const contractFn = (code, contract, metadata) => {
    const vm = new NodeVM({
        sandbox: {},
        eval: false,
        wasm: false,
    });
    const fn = vm.run(`
        module.exports = async function(code, contract, metadata) {
            try {
                ${code}
            } catch(error) {
                console.log(error)
                return null;
            }
        };
    `);

    return fn(code, contract, metadata);
}

/**
 * Executes user-provided code in a sandboxed VM for transaction processing.
 * Code has access to ethers, web3, and web3js-quorum libraries.
 * @param {string} code - JavaScript code to execute
 * @param {Object} transaction - Transaction object passed to the code
 * @param {string} rpcServer - RPC server URL passed to the code
 * @returns {Promise<Object>} Result with success boolean and optional error
 */
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
    transactionFn, contractFn
};
