const ethers = require('ethers');
const { sanitize } = require('./utils');

exports.processTrace = async (userId, workspace, transactionHash, steps, db) => {
    const trace = [];
    for (const step of steps) {
        if (['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'].indexOf(step.op.toUpperCase()) > -1) {
            const canSync = await db.canUserSyncContract(userId, workspace);

            if (canSync) {
                const contractData = sanitize({
                    address: step.address.toLowerCase(),
                    hashedBytecode: step.contractHashedBytecode
                });

                await db.storeContractData(userId, workspace, step.address, contractData);
            }

            trace.push(sanitize(step));
        }
    }
    await db.storeTrace(userId, workspace, transactionHash, trace);
};

exports.parseTrace = async (from, trace, provider) => {
    const opCodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];
    const filteredData = trace.structLogs.filter(log => opCodes.indexOf(log.op) > -1 || log.pc == 1507);
    const parsedOps = [];

    for (const log of filteredData) {
        switch(log.op) {
            case 'CALL':
            case 'CALLCODE':
                let input = '', out = '';

                const inputSize = parseInt(log.stack[log.stack.length - 5], 16) * 2;
                if (inputSize > 0) {
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
                const bytecode = await provider.getCode(address);
                parsedOps.push({
                    value,
                    op: log.op,
                    address: address,
                    input: input == '0x' ? '' : input,
                    returnData: out == '0x' ? '' : out,
                    depth: log.depth,
                    contractHashedBytecode: bytecode != '0x' ? ethers.utils.keccak256(bytecode) : ''
                })
                break;
            case 'DELEGATECALL':
            case 'STATICCALL': {
                let input = '', out = '';

                const inputSize = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                if (inputSize > 0) {
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
                const bytecode = await provider.getCode(address);
                parsedOps.push({
                    op: log.op,
                    value: null,
                    address: address,
                    input: input == '0x' ? '' : input,
                    returnData: out == '0x' ? '' : out,
                    depth: log.depth,
                    contractHashedBytecode: ethers.utils.keccak256(bytecode)
                })
                break;
            }
            case 'CREATE':
            case 'CREATE2': {
                const stackCopy = [...log.stack];
                stackCopy.pop();
                const p = parseInt(stackCopy.pop().valueOf(), 16) * 2;
                const n = parseInt(stackCopy.pop().valueOf(), 16) * 2;
                const s = `0x${stackCopy.pop()}`;

                const creationBytecode = `0x${log.memory.join('').slice(p, p + n)}`;
                const hashedCreationBytecode = ethers.utils.keccak256(creationBytecode);

                const address = ethers.utils.getCreate2Address(from, s, hashedCreationBytecode);

                const runtimeBytecode = await provider.getCode(address);
                const contractHashedBytecode = ethers.utils.keccak256(runtimeBytecode);

                parsedOps.push({
                    op: log.op,
                    address: address,
                    depth: log.depth,
                    contractHashedBytecode: contractHashedBytecode
                });
                break;
            }
            default:
        }
    }

    return parsedOps;
};
