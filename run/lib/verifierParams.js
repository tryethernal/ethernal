/**
 * @fileoverview Contract verification parameter parsers.
 * Transforms Etherscan-compatible API inputs into verification payloads.
 * @module lib/verifierParams
 */

const { sanitize } = require('./utils');

/**
 * Parses Solidity Standard JSON Input format verification request.
 * Used for multi-file contracts with full build configuration.
 * @param {Object} data - Etherscan-compatible verification request
 * @param {string} data.contractaddress - Contract address to verify
 * @param {string} data.sourceCode - JSON string containing sources and settings
 * @param {string} data.contractname - Contract file:name (e.g., "Token.sol:Token")
 * @param {string} data.compilerversion - Solidity compiler version
 * @param {string} [data.constructorArguements] - ABI-encoded constructor arguments
 * @param {string} [data.viaIR] - Whether IR compilation was used
 * @returns {Object} Sanitized verification payload
 */
const solidityStandardJsonInput = data => {
    const contractAddress = data.contractaddress.toLowerCase();
    const source = JSON.parse(data.sourceCode);
    const contractFile = data.contractname.split(':')[0];
    const contractName = data.contractname.split(':')[1];
    const compilerVersion = data.compilerversion;
    const constructorArguments = data.constructorArguements;
    const code = {
        sources: source.sources,
        libraries: source.settings.libraries
    }
    const optimizer = source.settings.optimizer ? source.settings.optimizer.enabled : false;
    const runs = source.settings.optimizer ? source.settings.optimizer.runs : 0;
    const evmVersion = source.settings.evmVersion;
    const viaIR = data.viaIR == 'true';

    return sanitize({
        contractAddress,
        compilerVersion,
        constructorArguments,
        code,
        contractName,
        contractFile,
        optimizer,
        runs,
        evmVersion,
        viaIR
    });
};

/**
 * Parses single-file Solidity verification request.
 * Used for simple contracts in a single source file.
 * @param {Object} data - Etherscan-compatible verification request
 * @param {string} data.contractaddress - Contract address to verify
 * @param {string} data.sourceCode - Solidity source code
 * @param {string} data.contractname - Contract name
 * @param {string} data.compilerversion - Solidity compiler version
 * @param {string} data.optimizationUsed - '0' or '1' for optimization
 * @param {string} [data.runs] - Optimizer runs if optimization enabled
 * @param {string} [data.constructorArguements] - ABI-encoded constructor arguments
 * @param {string} [data.evmVersion] - Target EVM version
 * @param {string} [data.viaIR] - Whether IR compilation was used
 * @returns {Object} Sanitized verification payload
 */
const soliditySingleFile = data => {
    const contractAddress = data.contractaddress.toLowerCase();
    const compilerVersion = data.compilerversion;
    const constructorArguments = data.constructorArguements;
    const code = {
        sources: { [data.contractname]: { content: data.sourceCode } }
    };
    const contractName = data.contractname;
    const optimizer = data.optimizationUsed == '0' ? false : true;
    const runs = data.optimizationUsed == '0' ? 0 : parseInt(data.runs);
    const evmVersion = data.evmVersion;
    const viaIR = data.viaIR == 'true';

    return sanitize({
        contractAddress,
        compilerVersion,
        constructorArguments,
        code,
        contractName,
        optimizer,
        runs,
        evmVersion,
        viaIR
    });
};

module.exports = {
    'solidity-standard-json-input': solidityStandardJsonInput,
    'solidity-single-file': soliditySingleFile
}