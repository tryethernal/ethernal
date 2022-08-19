const { enqueueTask } = require('./tasks');
const { sanitize } = require('./utils');
const writeLog = require('./writeLog');

const updateFirestoreContract = (userId, workspace, address, data) => {
    return enqueueTask('migration', sanitize({
        userId: userId,
        workspace: workspace,
        address: address,
        abi: data.abi,
        verificationStatus: data.verificationStatus,
        secret: process.env.AUTH_SECRET
    }), `${process.env.CLOUD_FUNCTIONS_ROOT}/${process.env.GCLOUD_PROJECT}/${process.env.GCLOUD_LOCATION}/syncContractData`)
};

const stripBytecodeMetadata = (bytecode) => {
    // Last 2 bytes contains metadata length
    const metadataLength = parseInt(bytecode.slice(bytecode.length - 4, bytecode.length), 16) * 2;

    // We strip the metadata + the last 2 bytes
    return bytecode.slice(0, bytecode.length - 4 - metadataLength);
};

module.exports = async function(db, payload) {
    const VALID_EVM_VERSIONS = ['homestead', 'tangerineWhistle', 'spuriousDragon', 'byzantium', 'constantinople', 'petersburg', 'istanbul', 'berlin', 'london'];
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

    // Only supports verifying one contract at a time at the moment
    const contractFile = Object.keys(code.sources)[0];
    const user = await db.getUserById(publicExplorerParams.userId);
    const workspace = await db.getWorkspaceById(publicExplorerParams.workspaceId);

    if (workspace.userId != user.id)
        throw new Error("Workspace / User mismatch");

    if (evmVersion && VALID_EVM_VERSIONS.indexOf(evmVersion) === -1)
        throw new Error(`Invalid EVM version "${evmVersion}". Valid versions are: ${VALID_EVM_VERSIONS.join(', ')}.`);

    if (optimizer && parseInt(runs) < 0)
        throw new Error('"runs" must be greater than 0.')

    try {
        await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress, 'pending');
        await updateFirestoreContract(user.firebaseUserId, workspace.name, contractAddress, { verificationStatus: 'pending' });

        const compiler = await new Promise((resolve, reject) => {
            solc.loadRemoteVersion(compilerVersion, (err, solc) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
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

        const abi = parsedCompiledCode.contracts[contractFile][contractName].abi;
        let bytecode = parsedCompiledCode.contracts[contractFile][contractName].evm.bytecode.object;

        if (typeof code.libraries == 'object' && Object.keys(code.libraries).length > 0) {
            console.log('Linking bytecode...')
            const linkedBytecode = linker.linkBytecode(bytecode, code.libraries);
            bytecode = linkedBytecode;
        }

        const compiledRuntimeBytecodeWithoutMetadata = `0x${stripBytecodeMetadata(bytecode)}${constructorArguments}`;

        const deploymentTx = await db.getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress);
        const deployedRuntimeBytecodeWithoutMetadata = stripBytecodeMetadata(deploymentTx.data.slice(0, deploymentTx.data.length - constructorArguments.length)) + constructorArguments;

        writeLog({
            functionName: 'api.contracts.verify',
            extra: {
                compiledRuntimeBytecodeWithoutMetadata: compiledRuntimeBytecodeWithoutMetadata,
                deployedRuntimeBytecodeWithoutMetadata: deployedRuntimeBytecodeWithoutMetadata,
                equalBytecodes: compiledRuntimeBytecodeWithoutMetadata === deployedRuntimeBytecodeWithoutMetadata,
                payload: payload
            }
        });
        if (compiledRuntimeBytecodeWithoutMetadata === deployedRuntimeBytecodeWithoutMetadata) {
            console.log('Verification succeeded!');
            await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress, 'success');
            await db.storeContractData(user.firebaseUserId, workspace.name, contractAddress, { name: contractName, abi: abi });
            await updateFirestoreContract(user.firebaseUserId, workspace.name, contractAddress, { verificationStatus: 'success', abi: abi });
            return {
                verificationSucceded: true
            };
        }
        else {
            console.log('Verification failed!');
            throw new Error("Compiled bytecode doesn't match runtime bytecode. Make sure you uploaded the correct source code, linked all the libraries and provided the constructor arguments.");
        }
    } catch(error) {
        writeLog({
            functionName: 'api.contracts.verify',
            error: error.message || error,
            extra: {
                error: error,
                payload: payload
            }
        });
        await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress, 'failed');
        await updateFirestoreContract(user.firebaseUserId, workspace.name, contractAddress, { verificationStatus: 'failed' });
        return {
            verificationSucceded: false,
            reason: error.message
        };
    }
}
