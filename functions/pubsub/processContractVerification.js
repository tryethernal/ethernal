const {
    updateContractVerificationStatus,
    getContractDeploymentTxByAddress,
    storeContractData
} = require('../lib/firebase');

module.exports = async function(message) {
    const solc = require('solc');
    const linker = require('solc/linker');
    const payload = message.json;

    const code = payload.code;

    if (!code.sources)
        throw '[processContractVerification] Missing sources';

    const imports = payload.code.imports || {};
    const compilerVersion = payload.compilerVersion;
    const contractAddress = payload.contractAddress;
    const constructorArguments = payload.constructorArguments;
    const publicExplorerParams = payload.publicExplorerParams;
    const contractName = payload.contractName;

    // Only supports verifying one contract at a time at the moment
    const contractFile = Object.keys(code.sources)[0];

    try {
        await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'pending');

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
                }
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

        const deploymentTx = await getContractDeploymentTxByAddress(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress);
        const deployedRuntimeBytecode = deploymentTx.data;

        if (compiledRuntimeBytecode === deployedRuntimeBytecode) {
            console.log('Verification succeeded!');
            await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'success');
            await storeContractData(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, { abi: abi });
        }
        else {
            console.log('Verification failed!');
            await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'failed');
        }
    } catch(error) {
        console.log(error);
        await updateContractVerificationStatus(publicExplorerParams.userId, publicExplorerParams.workspace, contractAddress, 'failed');
    }
}
