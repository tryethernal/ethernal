// Code from https://github.com/ajlopez/Yasold/blob/master/lib/bytecodes.js, copied here as it doesn't seem to work with npm
const bc = require('./bytecodes');

function addComment(opcode, comment) {
    if (!opcode.comments)
        opcode.comments = [];
    
    opcode.comments.push(comment);
}

function isOpCode(opcode, name, value) {
    if (!opcode)
        return false;
    
    if (opcode.opcode !== name)
        return false;
    
    return value == null || opcode.value === value;
}

function opcodeToText(opcode, opcodes) {
    let text = '';
    
    if (opcode.comments && opcode.comments.length) {
        text += '\n';
        for (let k = 0; k < opcode.comments.length; k++)
            text += '; ' + opcode.comments[k] + '\n';
    }

    if (opcode.label)
        text += '\n:' + opcode.label + '\n';
    
    text += opcode.opcode;
    
    if (opcode.target)
        text += ' ' + opcodes[opcode.target].label;
    
    if (opcode.value)
        text += ' ' + opcode.value;
    
    if (opcode.offset != null)
        text += ' (#0x' + opcode.offset.toString(16) + ')';
    
    return text;
}

function decompileToText(bytecodes) {
    const opcodes = analyze(bytecodes).opcodes;
    
    let text = '';
    
    for (let k = 0; k < opcodes.length; k++)
        text += opcodeToText(opcodes[k], opcodes) + '\n';
    
    return text;
}

function findAddress(address, opcodes, from, to) {
    for (let k = from; k < to; k++)
        if (opcodes[k].offset === address)
            return k;
}

function executeOpcode(opcode, stack) {
    opcode.stack = stack.slice();
    
    if (opcode.value)
        opcode.stack.push(opcode.value);
    
    if (opcode.opcode === 'mstore')
        opcode.stack.length -= 2;
}

function execute(opcodes) {
    for (let k = 0; k < opcodes.length; k++)
        executeOpcode(opcodes[k], k ? opcodes[k - 1].stack : []);
}

function getSubnodes(nodes, n) {
    let nvalues = 0;
    let k = 0;
    
    for (; nvalues < n && k < nodes.length; k++)
        nvalues += nodes[nodes.length - k - 1].values;
    
    return nodes.slice(nodes.length - k);
}

function analyze(bytecodes) {
    const opcodes = bc.decompile(bytecodes);
    
    execute(opcodes);

    const inits = [];
    const jumpdests = [];
    const jumps = [];
    const nodes = [];
    
    for (let k = 0; k < opcodes.length; k++) {
        const opcode = opcodes[k];
        
        if (opcode.inputs === 0) {
            var node = {
                from: k,
                to: k,
                values: opcode.outputs
            };
            
            nodes.push(node);
        }
        else if (opcode.inputs > 0) {
            var subnodes = getSubnodes(nodes, opcode.inputs);
            nodes.length -= subnodes.length;
            
            var node = {
                from: subnodes[0].from,
                to: k,
                values: opcode.outputs,
                nodes: subnodes
            };
            
            nodes.push(node);
        }
        
        if (isOpCode(opcode, "push1")
            && isOpCode(opcodes[k + 1], "push1", '0x40')
            && isOpCode(opcodes[k + 2], "mstore"))
            inits.push({ position: k });
        
        if (isOpCode(opcode, "jumpdest"))
            jumpdests.push({ position: k });
        
        if (isOpCode(opcode, "jump") || isOpCode(opcode, "jumpi")) {
            jumps.push({ position: k });
            
            if (isOpCode(opcodes[k - 1], "push1") || isOpCode(opcodes[k - 1], "push2"))
                jumps[jumps.length - 1].address = parseInt(opcodes[k - 1].value, 16);
        }
    }
    
    if (inits.length > 1) {
        const initoffset = opcodes[inits[1].position].offset;
        
        for (let k = inits[1].position; k < opcodes.length; k++)
            opcodes[k].offset -= initoffset;
    }
    
    if (inits.length)
        addComment(opcodes[inits[0].position], 'Initialization');
    if (inits.length > 1)
        addComment(opcodes[inits[1].position], 'Contract');
    
    for (let k = 0; k < jumpdests.length; k++)
        opcodes[jumpdests[k].position].label = 'label' + (k+1);

    for (let k = 0; k < jumps.length; k++) {
        if (jumps[k].address == null)
            continue;
        
        if (inits.length > 1)
            if (jumps[k].position >= inits[1].position)
                opcodes[jumps[k].position].target = findAddress(jumps[k].address, opcodes, inits[1].position, opcodes.length)
            else
                opcodes[jumps[k].position].target = findAddress(jumps[k].address, opcodes, 0, inits[1].position);
        else
            opcodes[jumps[k].position].target = findAddress(jumps[k].address, opcodes, 0, opcodes.length);
    }
    
    return {
        opcodes: opcodes,
        inits: inits,
        jumpdest: jumpdests,
        jumps: jumps,
        nodes: nodes
    }
}

module.exports = {
    decompile: bc.decompile,
    decompileToText: decompileToText,
    analyze: analyze
};
