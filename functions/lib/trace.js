const ethers = require('ethers');

exports.parseTrace = async (from, trace, provider) => {
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
                const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                const bytecode = await provider.getCode(address);

                parsedOps.push({
                    op: log.op,
                    address: address,
                    input: input,
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
                    contractHashedBytecode: contractHashedBytecode
                });
                break;
            }
            default:
        }
    }

    return parsedOps
};
