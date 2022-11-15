// Code from https://github.com/ajlopez/Yasold/blob/master/lib/bytecodes.js, copied here as it doesn't seem to work with npm
const opcodes = {};

function toHex(value) {
    let hex = value.toString(16);
    
    if (hex.length % 2)
        hex = '0' + hex;
        
    return hex;
}

function makePushOpCode(opcode, length) {
    return function (text, offset) {
        return {
            opcode: opcode,
            length: 1 + length,
            inputs: 0,
            outputs: 1,
            value: '0x' + text.substring(offset + 2, offset + 2 + length * 2)
        }
    }
}

const unknownOpCode = function (opcode) {
    return {
        opcode: '0x' + opcode,
        length: 1,
        inputs: 0,
        outputs: 0
    }
}

function makeOpCode(opcode, inputs, outputs) {
    inputs = inputs || 0;
    outputs = outputs || 0;
    
    return function () {
        return {
            opcode: opcode,
            length: 1,
            inputs: inputs,
            outputs: outputs
        }
    }
}

opcodes['00'] = makeOpCode('stop');
opcodes['01'] = makeOpCode('add', 2, 1);
opcodes['02'] = makeOpCode('mul', 2, 1);
opcodes['03'] = makeOpCode('sub', 2, 1);
opcodes['04'] = makeOpCode('div', 2, 1);
opcodes['05'] = makeOpCode('sdiv', 2, 2);
opcodes['06'] = makeOpCode('mod');
opcodes['07'] = makeOpCode('smod');
opcodes['08'] = makeOpCode('addmod');
opcodes['09'] = makeOpCode('mulmod');
opcodes['0a'] = makeOpCode('exp');
opcodes['0b'] = makeOpCode('signextend');
opcodes['10'] = makeOpCode('lt');
opcodes['11'] = makeOpCode('gt');
opcodes['12'] = makeOpCode('slt');
opcodes['13'] = makeOpCode('sgt');
opcodes['14'] = makeOpCode('eq');
opcodes['15'] = makeOpCode('iszero', 1, 1);
opcodes['16'] = makeOpCode('and');
opcodes['17'] = makeOpCode('or');
opcodes['18'] = makeOpCode('xor');
opcodes['19'] = makeOpCode('not');
opcodes['1a'] = makeOpCode('byte');
opcodes['1b'] = makeOpCode('shl');
opcodes['1c'] = makeOpCode('shr');
opcodes['1d'] = makeOpCode('sar');
opcodes['20'] = makeOpCode('sha3');
opcodes['30'] = makeOpCode('address');
opcodes['31'] = makeOpCode('balance');
opcodes['32'] = makeOpCode('origin');
opcodes['33'] = makeOpCode('caller');
opcodes['34'] = makeOpCode('callvalue');
opcodes['35'] = makeOpCode('calldataload');
opcodes['36'] = makeOpCode('calldatasize');
opcodes['37'] = makeOpCode('calldatacopy');
opcodes['38'] = makeOpCode('codesize');
opcodes['39'] = makeOpCode('codecopy');
opcodes['3a'] = makeOpCode('gasprice');
opcodes['3b'] = makeOpCode('extcodesize');
opcodes['3c'] = makeOpCode('extcodecopy');
opcodes['3d'] = makeOpCode('returndatasize');
opcodes['3e'] = makeOpCode('returndatacopy');
opcodes['3f'] = makeOpCode('extcodehash');
opcodes['40'] = makeOpCode('blockhash');
opcodes['41'] = makeOpCode('coinbase');
opcodes['42'] = makeOpCode('timestamp');
opcodes['43'] = makeOpCode('number');
opcodes['44'] = makeOpCode('difficulty');
opcodes['45'] = makeOpCode('gaslimit');
opcodes['46'] = makeOpCode('chainid');
opcodes['50'] = makeOpCode('pop', 1, 0);
opcodes['51'] = makeOpCode('mload');
opcodes['52'] = makeOpCode('mstore');
opcodes['53'] = makeOpCode('mstore8');
opcodes['54'] = makeOpCode('sload');
opcodes['55'] = makeOpCode('sstore');
opcodes['56'] = makeOpCode('jump', 1, 0);
opcodes['57'] = makeOpCode('jumpi', 2, 0);
opcodes['58'] = makeOpCode('pc');
opcodes['59'] = makeOpCode('msize');
opcodes['5a'] = makeOpCode('gas');
opcodes['5b'] = makeOpCode('jumpdest');
opcodes['5c'] = makeOpCode('beginsub');
opcodes['5d'] = makeOpCode('returnsub');
opcodes['5e'] = makeOpCode('jumpsub');
opcodes['f0'] = makeOpCode('create');
opcodes['f1'] = makeOpCode('call');
opcodes['f2'] = makeOpCode('callcode');
opcodes['f2'] = makeOpCode('callcode');
opcodes['f3'] = makeOpCode('return');
opcodes['f4'] = makeOpCode('delegatecall');
opcodes['f5'] = makeOpCode('create2');
opcodes['fa'] = makeOpCode('staticcall');
opcodes['fd'] = makeOpCode('revert');
opcodes['fe'] = makeOpCode('invalid');
opcodes['ff'] = makeOpCode('selfdestruct');

function makeOpCodes(name, number, init, inputs, outputs) {
    for (let k = 1; k <= number; k++) {
        opcode = name + k;
        hexa = toHex(init + k - 1);
        opcodes[hexa] = makeOpCode(opcode, inputs, outputs);
    }
}

function makeOpCodesFromZero(name, number, init) {
    for (let k = 0; k < number; k++) {
        opcode = name + k;
        hexa = toHex(init + k);
        opcodes[hexa] = makeOpCode(opcode);
    }
}

function makePushOpCodes(name, number, init) {
    for (let k = 1; k <= number; k++) {
        opcode = name + k;
        hexa = toHex(init + k - 1);
        opcodes[hexa] = makePushOpCode(opcode, k);
    }
}

makeOpCodes('dup', 16, 8 * 16, 0, 1);
makeOpCodes('swap', 16, 9 * 16);
makeOpCodesFromZero('log', 5 , 10 * 16);
makePushOpCodes('push', 32, 6 * 16);

function decompileOpCode(text, offset) {
    const opcode = text.substring(offset, offset + 2);
    
    if (opcodes[opcode])
        return opcodes[opcode](text, offset);
    else
        return unknownOpCode(opcode);
}

function decompile(text) {
    const ops = [];
    const l = text.length;
    let p = 0;
    let offset = 0;
    let wasstop = false;
    
    while (p < l) {
        if (wasstop) {
            const next = text.substring(p, p + 2);
            
            if (next !== '60' && next !== '5b')
                break;
        }
        
        const op = decompileOpCode(text, p);        

        wasstop = op.opcode === 'stop' ||
            (op.opcode === 'throw' && ops.length && ops[ops.length - 1].opcode === 'return');
        
        op.offset = offset;
        offset += op.length;
        
        ops.push(op);
        p += op.length * 2;
    }
    
    return ops;
}

module.exports = {
    decompile: decompile
}
