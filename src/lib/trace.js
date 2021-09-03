const ethers = require('ethers');

const getReturnData = (trace, pc, depth) => {
    for (const log of trace.structLogs) {
        if (log.pc == pc && log.depth == depth) {
            const returnLog = trace.structLogs[trace.structLogs.indexOf(log) - 1];
            const returnStart = parseInt(returnLog.stack[returnLog.stack.length - 1], 16) * 2;
            const returnSize = parseInt(returnLog.stack[returnLog.stack.length - 2], 16) * 2;
            return `0x${returnLog.memory.join('').slice(returnStart, returnStart + returnSize)}`;
        }
    }
    return '0x';
}

export const parseTrace = async (from, trace, provider) => {
    const opCodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];
    const filteredData = trace.structLogs.filter(log => opCodes.indexOf(log.op) > -1 || log.pc == 1507);
    const parsedOps = [];

    for (const log of filteredData) {
        switch(log.op) {
            case 'CALL':
            case 'CALLCODE': {
                const inputStart = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                const inputSize = parseInt(log.stack[log.stack.length - 5], 16) * 2;

                const input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                const bytecode = await provider.getCode(address);
                const returnData = getReturnData(trace, log.pc + 1, log.depth);

                parsedOps.push({
                    op: log.op,
                    address: address,
                    input: input,
                    contractHashedBytecode: ethers.utils.keccak256(bytecode),
                    depth: log.depth + 1,
                    returnData: returnData
                });
                break;
            }
            case 'DELEGATECALL':
            case 'STATICCALL': {
                const inputStart = parseInt(log.stack[log.stack.length - 3], 16) * 2;
                const inputSize = parseInt(log.stack[log.stack.length - 4], 16) * 2;

                const input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                const bytecode = await provider.getCode(address);
                const returnData = getReturnData(trace, log.pc + 1, log.depth);

                parsedOps.push({
                    op: log.op,
                    address: address,
                    input: input,
                    contractHashedBytecode: ethers.utils.keccak256(bytecode),
                    depth: log.depth + 1,
                    returnData: returnData
                });
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
                    contractHashedBytecode: contractHashedBytecode,
                    depth: log.depth + 1
                });
                break;
            }
            default:
        }
    }

    return parsedOps;
};
