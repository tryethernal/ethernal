/**
 * @fileoverview Solidity contract verification processor.
 * Compiles source code and compares bytecode against deployed contracts.
 * @module lib/processContractVerification
 */

/**
 * Strips metadata from bytecode, handling nested contract bytecodes.
 * @param {string} baseBytecode - The base bytecode to strip
 * @param {Array<Object>} includedBytecodes - Array of nested contract bytecode info
 * @returns {string} Bytecode with metadata removed
 * @private
 */
const stripBytecodeMetadata = (baseBytecode, includedBytecodes) => {
    let baseBytecodeCopy = baseBytecode;
    for (let i = 0; i < includedBytecodes.length; i++) {
        const includedBytecodeIndex = baseBytecodeCopy.indexOf(includedBytecodes[i].data);
        if (includedBytecodeIndex > -1) {
            baseBytecodeCopy = removeMetadata(baseBytecodeCopy.substring(0, includedBytecodeIndex)) + baseBytecodeCopy.substring(includedBytecodeIndex + includedBytecodes[i].metadataLength);
        }
    }
    const strippedBytecode = removeMetadata(baseBytecodeCopy);
    return strippedBytecode
}

/**
 * Allowed keys of the Solidity metadata CBOR map and the kind of value each one carries.
 * @private
 */
const METADATA_VALUE_KINDS = new Map([
    ['ipfs', 'bytes'],
    ['bzzr0', 'bytes'],
    ['bzzr1', 'bytes'],
    ['solc', 'bytesOrText'],
    ['experimental', 'bool']
]);

/**
 * Reads a CBOR item head (major type + argument) at the given offset.
 * Only definite-length heads with an argument of up to 4 bytes are accepted, and the argument must use
 * its shortest encoding. Anything else (indefinite lengths, 8-byte arguments, non-minimal encodings) returns null.
 * @param {Buffer} bytes - CBOR bytes
 * @param {number} offset - Offset of the item head
 * @returns {{major: number, value: number, next: number}|null} Parsed head, or null if invalid
 * @private
 */
const readCborHead = (bytes, offset) => {
    if (offset >= bytes.length)
        return null;

    const major = bytes[offset] >> 5;
    const info = bytes[offset] & 0x1f;
    if (info < 24)
        return { major, value: info, next: offset + 1 };

    const size = { 24: 1, 25: 2, 26: 4 }[info];
    if (!size || offset + 1 + size > bytes.length)
        return null;

    const value = bytes.readUIntBE(offset + 1, size);
    const minimum = { 1: 24, 2: 0x100, 4: 0x10000 }[size];
    if (value < minimum)
        return null;

    return { major, value, next: offset + 1 + size };
};

/**
 * Checks that hex-encoded bytes are exactly one complete CBOR map, as emitted by solc: 1 to 5 entries,
 * keys are distinct text strings from the Solidity metadata set (ipfs, bzzr0, bzzr1, solc, experimental),
 * ipfs / bzzr0 / bzzr1 values are byte strings, solc is a byte string or text string, experimental is a boolean,
 * and no byte is left over after the map.
 * @param {string} hex - Candidate metadata section (without the trailing 2 length bytes)
 * @returns {boolean} True if the bytes are a valid Solidity metadata map
 * @private
 */
const isSolidityMetadata = (hex) => {
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex))
        return false;

    const bytes = Buffer.from(hex, 'hex');
    const mapHead = readCborHead(bytes, 0);
    if (!mapHead || mapHead.major !== 5 || mapHead.value < 1 || mapHead.value > METADATA_VALUE_KINDS.size)
        return false;

    const seenKeys = new Set();
    let offset = mapHead.next;
    for (let i = 0; i < mapHead.value; i++) {
        const keyHead = readCborHead(bytes, offset);
        if (!keyHead || keyHead.major !== 3 || keyHead.next + keyHead.value > bytes.length)
            return false;

        const key = bytes.toString('utf8', keyHead.next, keyHead.next + keyHead.value);
        const kind = METADATA_VALUE_KINDS.get(key);
        if (!kind || seenKeys.has(key))
            return false;
        seenKeys.add(key);

        const valueHead = readCborHead(bytes, keyHead.next + keyHead.value);
        if (!valueHead)
            return false;

        if (kind === 'bool') {
            if (valueHead.major !== 7 || (valueHead.value !== 20 && valueHead.value !== 21))
                return false;
            offset = valueHead.next;
        }
        else {
            const isBytes = valueHead.major === 2;
            const isText = valueHead.major === 3;
            if (!(isBytes || (isText && kind === 'bytesOrText')) || valueHead.next + valueHead.value > bytes.length)
                return false;
            offset = valueHead.next + valueHead.value;
        }
    }

    return offset === bytes.length;
};

/**
 * Returns the size (in hex characters, including the 2 length bytes) of the CBOR metadata section
 * at the end of the bytecode, or 0 if the end of the bytecode is not Solidity metadata.
 * Metadata is only recognized when the length is non-zero, fits in the bytecode and the whole section
 * (exactly the declared number of bytes before the length) is one complete, well-formed Solidity metadata CBOR map.
 * @param {string} bytecode - Contract bytecode (no 0x prefix required, but tolerated by callers)
 * @returns {number} Number of hex characters to strip, or 0 if there is no valid metadata
 * @private
 */
const getMetadataSectionLength = (bytecode) => {
    if (bytecode.length < 4)
        return 0;

    // Last 2 bytes contains metadata length
    const metadataLength = parseInt(bytecode.slice(bytecode.length - 4), 16) * 2;
    if (!(metadataLength > 0) || metadataLength + 4 > bytecode.length)
        return 0;

    const section = bytecode.slice(bytecode.length - 4 - metadataLength, bytecode.length - 4);
    if (!isSolidityMetadata(section))
        return 0;

    return metadataLength + 4;
};

/**
 * Removes CBOR-encoded metadata from the end of bytecode.
 * Bytecode that does not end with valid metadata is returned unchanged.
 * @param {string} bytecode - Contract bytecode
 * @returns {string} Bytecode without metadata section
 * @private
 */
const removeMetadata = (bytecode) => {
    return bytecode.slice(0, bytecode.length - getMetadataSectionLength(bytecode));
};

/**
 * Strips metadata from bytecode, repeating while the result still ends with a metadata marker.
 * The number of passes is bounded (one per included bytecode, plus one) and the loop stops as soon as
 * a pass leaves the bytecode unchanged, so it always terminates.
 * @param {string} bytecode - The bytecode to strip
 * @param {Array<Object>} includedBytecodes - Array of nested contract bytecode info
 * @returns {string} Lowercased bytecode with metadata removed
 * @private
 */
const stripAllBytecodeMetadata = (bytecode, includedBytecodes) => {
    let stripped = stripBytecodeMetadata(bytecode, includedBytecodes).toLowerCase();
    for (let i = 0; i < includedBytecodes.length + 1 && stripped.endsWith('0033'); i++) {
        const next = stripBytecodeMetadata(stripped, includedBytecodes).toLowerCase();
        if (next === stripped)
            break;
        stripped = next;
    }
    return stripped;
};

/**
 * Verifies a smart contract by compiling source code and comparing bytecode.
 * @param {Object} db - Database interface (firebase.js)
 * @param {Object} payload - Verification payload
 * @param {Object} payload.code - Source code object with sources and optional libraries
 * @param {string} payload.compilerVersion - Solidity compiler version (e.g., "v0.8.19+commit.7dd6d404")
 * @param {string} payload.contractAddress - Address of deployed contract
 * @param {string} [payload.constructorArguments] - ABI-encoded constructor arguments
 * @param {Object} payload.publicExplorerParams - User and workspace identifiers
 * @param {string} payload.contractName - Name of the contract to verify
 * @param {boolean} [payload.optimizer] - Whether optimizer was enabled
 * @param {number} [payload.runs] - Number of optimizer runs
 * @param {string} [payload.evmVersion] - Target EVM version
 * @param {boolean} [payload.viaIR] - Whether IR compilation pipeline was used
 * @returns {Promise<{verificationSucceded: boolean}>} Verification result
 * @throws {Error} If verification fails for any reason
 */
module.exports = async function(db, payload) {
    const VALID_EVM_VERSIONS = ['homestead', 'tangerineWhistle', 'spuriousDragon', 'byzantium', 'constantinople', 'petersburg', 'istanbul', 'berlin', 'london', 'paris', 'shanghai', 'cancun'];
    const solc = require('solc');
    const linker = require('solc/linker');
    const code = payload.code;

    if (!code.sources)
        throw new Error('Missing source code.');

    const imports = payload.code.imports || {};
    const compilerVersion = payload.compilerVersion;
    const contractAddress = payload.contractAddress;
    const rawConstructorArguments = payload.constructorArguments ?? '';
    if (typeof rawConstructorArguments != 'string' || !/^(0x)?([0-9a-fA-F]{2})*$/.test(rawConstructorArguments))
        throw new Error('Invalid constructor arguments: they must be an even-length hexadecimal string.');
    const constructorArguments = rawConstructorArguments.replace(/^0x/, '');
    const publicExplorerParams = payload.publicExplorerParams;
    const contractName = payload.contractName;
    const optimizer = payload.optimizer || false;
    const runs = payload.runs;
    const evmVersion = payload.evmVersion;
    const viaIR = payload.viaIR || null;

    const user = await db.getUserById(publicExplorerParams.userId);
    const workspace = await db.getWorkspaceById(publicExplorerParams.workspaceId);

    if (workspace.userId != user.id)
        throw new Error("Workspace / User mismatch");

    if (evmVersion && VALID_EVM_VERSIONS.indexOf(evmVersion) === -1)
        throw new Error(`Invalid EVM version "${evmVersion}". Valid versions are: ${VALID_EVM_VERSIONS.join(', ')}.`);

    if (optimizer && parseInt(runs) < 0)
        throw new Error('"runs" must be greater than 0.')

    const compiler = await new Promise((resolve, reject) => {
        solc.loadRemoteVersion(compilerVersion, (err, solc) => {
            if (err)
                reject(err);
            resolve(solc);
        });
    });

    const inputs = {
        language: 'Solidity',
        sources: code.sources,
        settings: {
            outputSelection: {
                '*': { '*': ['abi', 'evm.bytecode.object'] }
            },
            optimizer: {
                enabled: optimizer,
                runs: optimizer ? runs : undefined
            },
            evmVersion: evmVersion
        }
    };

    // If it's false, we don't want to set it at all
    if (viaIR === true)
        inputs['settings']['viaIR'] = true;

    const missingImports = [];

    const compiledCode = compiler.compile(JSON.stringify(inputs), { import : function(path) {
        if (!imports[path]) {
            missingImports.push(path);
            return { content: null };
        }
        else
            return imports[path];
    }});

    if (missingImports.length)
        throw new Error(`Missing following imports: ${missingImports.join(', ')}`);

    const parsedCompiledCode = JSON.parse(compiledCode);

    if (parsedCompiledCode.errors) {
        for (let error of parsedCompiledCode.errors)
            if (error.severity && error.severity != 'warning')
                throw error;
    }

    let contractFile;
    if (payload.contractFile)
        contractFile = payload.contractFile;
    else {
        const files = Object.keys(code.sources);
        files.forEach(f => {
            if (parsedCompiledCode.contracts[f][payload.contractName]) {
                contractFile = f;
                return;
            }
        })
    }
    if (!contractFile || !parsedCompiledCode.contracts[contractFile][contractName])
        throw new Error(`Couldn't find contract "${contractName}" in the uploaded files.`);

    const abi = parsedCompiledCode.contracts[contractFile][contractName].abi;

    let bytecode = parsedCompiledCode.contracts[contractFile][contractName].evm.bytecode.object;
    if (typeof code.libraries == 'object' && Object.keys(code.libraries).length > 0) {
        const linkedBytecode = linker.linkBytecode(bytecode, code.libraries);
        bytecode = linkedBytecode;
    }

    if (!bytecode.startsWith('0x'))
        bytecode = `0x${bytecode}`;

    const includedBytecodes = [];
    for (const [name, data] of Object.entries(parsedCompiledCode.contracts[contractFile])) {
        if (name != contractName && data.evm.bytecode.object.length > 0) {
            const includedBytecode = data.evm.bytecode.object;
            includedBytecodes.push({ data: removeMetadata(includedBytecode), metadataLength: getMetadataSectionLength(includedBytecode) });
        }
    }

    let compiledRuntimeBytecodeWithoutMetadata = stripAllBytecodeMetadata(bytecode, includedBytecodes);

    const deploymentTx = await db.getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress);
    if (!deploymentTx)
        throw new Error("This contract cannot be verified at the moment because the deployment transaction hasn't been indexed.");

    const deploymentData = deploymentTx.data.toLowerCase().replace(/^0x/, '');
    if (constructorArguments && !deploymentData.endsWith(constructorArguments.toLowerCase()))
        throw new Error('Constructor arguments do not match the deployment transaction.');

    // Constructor arguments are removed once, by length, from the deployment data only.
    let deployedRuntimeBytecodeWithoutMetadata = stripAllBytecodeMetadata(deploymentTx.data.slice(0, deploymentTx.data.length - constructorArguments.length), includedBytecodes);

    if (!deployedRuntimeBytecodeWithoutMetadata.startsWith('0x'))
        deployedRuntimeBytecodeWithoutMetadata = '0x' + deployedRuntimeBytecodeWithoutMetadata;

    if (!compiledRuntimeBytecodeWithoutMetadata.startsWith('0x'))
        compiledRuntimeBytecodeWithoutMetadata = '0x' + compiledRuntimeBytecodeWithoutMetadata;

    if (compiledRuntimeBytecodeWithoutMetadata === deployedRuntimeBytecodeWithoutMetadata) {
        const verificationData = {
            compilerVersion, constructorArguments, runs, contractName,
            evmVersion: evmVersion || VALID_EVM_VERSIONS[VALID_EVM_VERSIONS.length - 1],
            sources: code.sources,
            libraries: code.libraries
        };
        await db.storeContractVerificationData(publicExplorerParams.workspaceId, contractAddress, verificationData);
        await db.storeContractData(user.firebaseUserId, workspace.name, contractAddress, { name: contractName, abi: abi });
        return { verificationSucceded: true };
    }
    else {
        throw new Error("Compiled bytecode doesn't match runtime bytecode. Make sure you uploaded the correct source code, linked all the libraries and provided the constructor arguments.");
    }
}
