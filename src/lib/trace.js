const ethers = require('ethers');

export const parseTrace = async (from, trace) => {
    const opCodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];
    const filteredData = trace.structLogs.filter(log => opCodes.indexOf(log.op) > -1 || log.pc == 1507);
    const parsedOps = [];

    for (const log of filteredData) {
        switch(log.op) {
            case 'CALL':
            case 'CALLCODE':
            case 'DELEGATECALL':
            case 'STATICCALL': {
                const inputStart = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                const inputSize = parseInt(log.stack[log.stack.length - 5], 16) * 2;
                const input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                parsedOps.push({
                    op: log.op,
                    address: `0x${log.stack[log.stack.length - 2].slice(-40)}`,
                    input: input
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
                const byteCode = `0x${log.memory.join('').slice(p, p + n)}`;
                const contractHashedBytecode = ethers.utils.keccak256(byteCode);
                const address = ethers.utils.getCreate2Address(from, s, contractHashedBytecode);
                parsedOps.push({
                    op: log.op,
                    address: address,
                    contractHashedBytecode: contractHashedBytecode
                });
                break;
            }
            default:
        }
    }

    return parsedOps
};
