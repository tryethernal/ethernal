
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

const removeMetadata = (bytecode) => {
    // Last 2 bytes contains metadata length
    const metadataLength = parseInt(bytecode.slice(bytecode.length - 4, bytecode.length), 16) * 2;

    // We strip the metadata + the last 2 bytes
    return bytecode.slice(0, bytecode.length - 4 - metadataLength);
};

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
    const constructorArguments = payload.constructorArguments || '';
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
            const metadataLength = parseInt(includedBytecode.slice(includedBytecode.length - 4, includedBytecode.length), 16) * 2 + 4;
            includedBytecodes.push({ data: removeMetadata(data.evm.bytecode.object), metadataLength: metadataLength });
        }
    }

    let compiledRuntimeBytecodeWithoutMetadata = (stripBytecodeMetadata(bytecode, includedBytecodes)).toLowerCase();
    while (compiledRuntimeBytecodeWithoutMetadata.endsWith('0033'))
        compiledRuntimeBytecodeWithoutMetadata = (stripBytecodeMetadata(compiledRuntimeBytecodeWithoutMetadata, includedBytecodes) + constructorArguments).toLowerCase();

    const deploymentTx = await db.getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress);
    if (!deploymentTx)
        throw new Error("This contract cannot be verified at the moment because the deployment transaction hasn't been indexed.");

    let deployedRuntimeBytecodeWithoutMetadata = stripBytecodeMetadata(deploymentTx.data.slice(0, deploymentTx.data.length - constructorArguments.length), includedBytecodes);
    while (deployedRuntimeBytecodeWithoutMetadata.endsWith('0033'))
        deployedRuntimeBytecodeWithoutMetadata = (stripBytecodeMetadata(deployedRuntimeBytecodeWithoutMetadata, includedBytecodes) + constructorArguments).toLowerCase();

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
