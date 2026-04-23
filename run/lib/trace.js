/**
 * @fileoverview Transaction trace parsing utilities.
 * Parses EVM execution traces from debug_traceTransaction into structured call data.
 * @module lib/trace
 */

const ethers = require('ethers');
const { sanitize, withTimeout } = require('./utils');

/**
 * Parses an EVM execution trace into a structured array of call operations.
 * Extracts CALL, CALLCODE, DELEGATECALL, STATICCALL, CREATE, and CREATE2 operations.
 *
 * @param {string} from - Transaction sender address (used for CREATE2 address computation)
 * @param {Object} trace - Raw trace from debug_traceTransaction
 * @param {Array<Object>} trace.structLogs - Array of EVM execution steps
 * @param {ethers.providers.Provider} provider - Ethers provider for fetching contract bytecode
 * @returns {Promise<Array<Object>|null>} Parsed trace operations or null if no structLogs
 * @returns {string} returns[].op - Operation type (CALL, DELEGATECALL, etc.)
 * @returns {string} returns[].address - Target contract address
 * @returns {string} returns[].input - Call input data
 * @returns {string} returns[].returnData - Call return data
 * @returns {number} returns[].depth - Call stack depth
 * @returns {string|null} returns[].value - ETH value transferred (for CALL/CALLCODE)
 * @returns {string|null} returns[].contractHashedBytecode - Keccak256 of contract bytecode
 */
exports.parseTrace = async (from, trace, provider) => {
    const opCodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];
    if (!trace.structLogs)
        return null;
    const filteredData = trace.structLogs.filter(log => opCodes.indexOf(log.op) > -1 || log.pc == 1507);
    const parsedOps = [];

    for (const log of filteredData) {
        switch(log.op) {
            case 'CALL':
            case 'CALLCODE': {
                let input = '', out = '';

                if (!log.memory)
                    break;

                const inputSize = parseInt(log.stack[log.stack.length - 5], 16) * 2;
                if (inputSize > 0 && log.memory) {
                    const inputStart = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                    input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                }

                const deeperLogs = trace.structLogs.filter(returnLog => returnLog.pc == log.pc + 1);

                if (deeperLogs.length) {
                    const outLog = trace.structLogs[trace.structLogs.indexOf(deeperLogs[0]) - 1];
                    const outSize = parseInt(outLog.stack[outLog.stack.length - 2], 16) * 2;

                    if (outSize > 0 && outLog.memory) {
                        const outLogMemory = Buffer.from(outLog.memory.join(''));
                        const outStart = parseInt(outLog.stack[outLog.stack.length - 1], 16) * 2;
                        out = `0x${outLogMemory.slice(outStart, outStart + outSize)}`;
                    }
                }

                const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                const strippedValue = ethers.utils.hexStripZeros(log.stack[log.stack.length - 3].startsWith('0x') ? log.stack[log.stack.length - 3] : `0x${log.stack[log.stack.length - 3]}`);
                const value = strippedValue != '0x' ? ethers.BigNumber.from(strippedValue).toString() : null;
                let bytecode;
                try {
                    bytecode = await withTimeout(provider.getCode(address));
                } catch(error) {
                    bytecode = '0x'
                }
                parsedOps.push(sanitize({
                    value,
                    op: log.op,
                    address: address,
                    input: input == '0x' ? '' : input,
                    returnData: out == '0x' ? '' : out,
                    depth: log.depth,
                    contractHashedBytecode: bytecode != '0x' ? ethers.utils.keccak256(bytecode) : null
                }))
                break;
            }
            case 'DELEGATECALL':
            case 'STATICCALL': {
                let input = '', out = '';

                if (!log.memory)
                    break;

                const inputSize = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                if (inputSize > 0 && log.memory) {
                    const inputStart = parseInt(log.stack[log.stack.length - 3], 16) * 2;
                    input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                }

                const deeperLogs = trace.structLogs.filter(returnLog => returnLog.pc == log.pc + 1);

                if (deeperLogs.length) {
                    const outLog = trace.structLogs[trace.structLogs.indexOf(deeperLogs[0]) - 1];
                    const outSize = parseInt(outLog.stack[outLog.stack.length - 2], 16) * 2;

                    if (outSize > 0 && outLog.memory) {
                        const outLogMemory = Buffer.from(outLog.memory.join(''));
                        const outStart = parseInt(outLog.stack[outLog.stack.length - 1], 16) * 2;
                        out = `0x${outLogMemory.slice(outStart, outStart + outSize)}`;
                    }
                }

                const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                let bytecode;
                try {
                    bytecode = await withTimeout(provider.getCode(address));
                } catch(error) {
                    bytecode = '0x'
                }
                parsedOps.push(sanitize({
                    op: log.op,
                    value: null,
                    address: address,
                    input: input == '0x' ? '' : input,
                    returnData: out == '0x' ? '' : out,
                    depth: log.depth,
                    contractHashedBytecode: bytecode != '0x' ? ethers.utils.keccak256(bytecode) : null
                }));
                break;
            }
            case 'CREATE':
            case 'CREATE2': {
                const stackCopy = [...log.stack];
                stackCopy.pop();

                const pValue = stackCopy.pop();
                if (!pValue) break;
                const p = parseInt(pValue.valueOf(), 16) * 2;

                const nValue = stackCopy.pop();
                if (!nValue) break;
                const n = parseInt(nValue.valueOf(), 16) * 2;

                const saltValue = stackCopy.pop();
                if (!saltValue) break;
                const s = saltValue.startsWith('0x') ? saltValue : `0x${saltValue}`;

                if (!log.memory)
                    break;

                const creationBytecode = `0x${log.memory.join('').slice(p, p + n)}`;
                const hashedCreationBytecode = ethers.utils.keccak256(creationBytecode);

                const address = ethers.utils.getCreate2Address(from, s, hashedCreationBytecode);

                let bytecode;
                try {
                    bytecode = await withTimeout(provider.getCode(address));
                } catch(error) {
                    bytecode = '0x'
                }

                parsedOps.push(sanitize({
                    op: log.op,
                    address: address,
                    depth: log.depth,
                    contractHashedBytecode: bytecode != '0x' ? ethers.utils.keccak256(bytecode) : null
                }));
                break;
            }
            default:
        }
    }

    return parsedOps;
};
