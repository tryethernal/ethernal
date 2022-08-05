const { enqueueTask } = require('./tasks');
const { sanitize } = require('./utils');
const writeLog = require('./writeLog');

let compiler;

const updateFirestoreContract = (userId, workspace, address, data) => {
    return enqueueTask('migration', sanitize({
        userId: userId,
        workspace: workspace,
        address: address,
        abi: data.abi,
        verificationStatus: data.verificationStatus,
        secret: process.env.AUTH_SECRET
    }), `${process.env.CLOUD_FUNCTIONS_ROOT}/${process.env.GCLOUD_PROJECT}/${process.env.GCLOUD_LOCATION}/syncContractData`)
}

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
    const constructorArguments = payload.constructorArguments;
    const publicExplorerParams = payload.publicExplorerParams;
    const contractName = payload.contractName;
    const optimization = payload.optimization || false;
    const runs = payload.runs;
    const evmVersion = payload.evmVersion || 'london';

    // Only supports verifying one contract at a time at the moment
    const contractFile = Object.keys(code.sources)[0];
    const user = await db.getUserById(publicExplorerParams.userId);
    const workspace = await db.getWorkspaceById(publicExplorerParams.workspaceId);

    if (workspace.userId != user.id)
        throw new Error("Workspace / User mismatch");

    if (VALID_EVM_VERSIONS.indexOf(evmVersion))
        throw new Error(`Invalid EVM version. Valid versions are: ${VALID_EVM_VERSIONS.join(', ')}`);

    try {
        await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress, 'pending');
        await updateFirestoreContract(user.firebaseUserId, workspace.name, contractAddress, { verificationStatus: 'pending' });

        compiler = compiler || await new Promise((resolve, reject) => {
            solc.loadRemoteVersion(compilerVersion, (err, solc) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                resolve(solc);
            });
        });

        const optimizer = sanitize({
            optimization: optimization,
            runs: runs
        });

        const inputs = {
            language: 'Solidity',
            sources: code.sources,
            settings: {
                outputSelection: {
                    '*': { '*': ['abi', 'evm.bytecode.object'] }
                },
                optimizer: optimizer,
                evmVersion: evmVersion
            }
        };

        const compiledCode = compiler.compile(JSON.stringify(inputs), { import : function(path) { return imports[path] }});

        if (compiledCode.errors) {
            for (let error of compiledCode.errors)
                console.log(error.formattedMessage)
        }

        const abi = JSON.parse(compiledCode).contracts[contractFile][contractName].abi;
        let bytecode = JSON.parse(compiledCode).contracts[contractFile][contractName].evm.bytecode.object;

        if (typeof code.libraries == 'object' && Object.keys(code.libraries).length > 0) {
            console.log('Linking bytecode...')
            const linkedBytecode = linker.linkBytecode(bytecode, code.libraries);
            bytecode = linkedBytecode;
        }

        const compiledRuntimeBytecode = `0x${bytecode}${constructorArguments ? constructorArguments : ''}`;

        const deploymentTx = await db.getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress);
        const deployedRuntimeBytecode = deploymentTx.data;
        writeLog({
            functionName: 'api.contracts.verify',
            extra: {
                compiledRuntimeBytecode: compiledRuntimeBytecode,
                deployedRuntimeBytecode: deployedRuntimeBytecode,
                equalBytecodes: compiledRuntimeBytecode === deployedRuntimeBytecode,
                payload: payload
            }
        });
        if (compiledRuntimeBytecode === deployedRuntimeBytecode) {
            console.log('Verification succeeded!');
            await db.updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspaceId, contractAddress, 'success');
            await db.storeContractData(user.firebaseUserId, workspace.name, contractAddress, { abi: abi });
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
        console.log(error);
        writeLog({
            functionName: 'api.contracts.verify',
            error: error,
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
