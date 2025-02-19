const { sanitize } = require('./utils');

const solidityStandardJsonInput = data => {
    const contractAddress = data.contractaddress.toLowerCase();
    const source = JSON.parse(data.sourceCode);
    const contractFile = data.contractname.split(':')[0];
    const contractName = data.contractname.split(':')[1];
    const compilerVersion = data.compilerversion;
    const constructorArguments = data.constructorArguements;
    const code = {
        sources: source.sources,
        libraries: source.settings.libraries
    }
    const optimizer = source.settings.optimizer ? source.settings.optimizer.enabled : false;
    const runs = source.settings.optimizer ? source.settings.optimizer.runs : 0;
    const evmVersion = source.settings.evmVersion;
    const viaIR = data.viaIR == 'true';

    return sanitize({
        contractAddress,
        compilerVersion,
        constructorArguments,
        code,
        contractName,
        contractFile,
        optimizer,
        runs,
        evmVersion,
        viaIR
    });
};

const soliditySingleFile = data => {
    const contractAddress = data.contractaddress.toLowerCase();
    const compilerVersion = data.compilerversion;
    const constructorArguments = data.constructorArguements;
    const code = {
        sources: { [data.contractname]: { content: data.sourceCode } }
    };
    const contractName = data.contractname;
    const optimizer = data.optimizationUsed == '0' ? false : true;
    const runs = data.optimizationUsed == '0' ? 0 : parseInt(data.runs);
    const evmVersion = data.evmVersion;
    const viaIR = data.viaIR == 'true';

    return sanitize({
        contractAddress,
        compilerVersion,
        constructorArguments,
        code,
        contractName,
        optimizer,
        runs,
        evmVersion,
        viaIR
    });
};

module.exports = {
    'solidity-standard-json-input': solidityStandardJsonInput,
    'solidity-single-file': soliditySingleFile
}