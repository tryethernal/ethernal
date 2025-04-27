const ethers = require('ethers');
const { stringifyBns } = require('./utils');

const SELECTORS = require('./abis/selectors.json');
const abis = {
    erc20: require('./abis/erc20.json'),
    erc721: require('./abis/erc721.json')
};
const IUniswapV2Pair = require('./abis/IUniswapV2Pair.json')

const getV2PoolReserves = (log) => {
    if (log.topics[0] == '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1') {
        const decoded = decodeLog(log, IUniswapV2Pair);
        return stringifyBns({
            reserve0: decoded.args.reserve0,
            reserve1: decoded.args.reserve1
        });
    }

    return null;
};

const findAbiForFunction = (signature) => {
    const patterns = Object.keys(SELECTORS);

    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const idx = SELECTORS[pattern].functions.indexOf(signature);
        if (idx > -1) {
            return abis[pattern];
        }
    }
};

const decodeLog = (log, abi) => {
    const ethersInterface = new ethers.utils.Interface(abi);
    let decodedLog;

    try {
        decodedLog = ethersInterface.parseLog(log);
    }
    catch(error) {
        for (const event in ethersInterface.events) {
            try {
                const eventTopic = ethersInterface.getEventTopic(event)
                const fragment = ethersInterface.getEvent(eventTopic);
                decodedLog = new ethers.utils.LogDescription({
                    eventFragment: fragment,
                    name: fragment.name,
                    signature: fragment.format(),
                    topic: ethersInterface.getEventTopic(fragment),
                    args: ethersInterface.decodeEventLog(fragment, log.data, log.topics)
                });
            } catch(_) {
                continue;
            }
        }
    }

    return decodedLog;
};

const getTokenTransfer = (transactionLog) => {
    try {
        if (transactionLog.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
            let decodedLog;
            for (const [pattern, abi] of Object.entries(abis)) {
                decodedLog = decodeLog(transactionLog, abi);
                if (decodedLog) break;
            }

            if (decodedLog) {
                return stringifyBns({
                    token: transactionLog.address,
                    src: decodedLog.args.from,
                    dst: decodedLog.args.to,
                    amount: decodedLog.args.amount || ethers.BigNumber.from('1'),
                    tokenId: decodedLog.args.tokenId || null
                });
            }
        }
        return null;
    } catch(error) {
        return null;
    }
};

const getTransactionMethodDetails = (transaction, abi) => {
    try {
        const contractAbi = abi ? abi : findAbiForFunction(transaction.data.slice(0, 10))

        if (!contractAbi)
            return transaction.data.length > 10 ? {
                sighash: transaction.data.slice(0, 10)
            } : {};

        const jsonInterface = new ethers.utils.Interface(contractAbi);
        const parsedTransactionData = jsonInterface.parseTransaction(transaction);
        const fragment = parsedTransactionData.functionFragment;

        const label = [`${fragment.name}(`];
        const inputsLabel = [];
        for (let i = 0; i < fragment.inputs.length; i ++) {
            const input = fragment.inputs[i];
            const param = [];
            param.push(input.type)
            if (input.name)
                param.push(` ${input.name}`);
            if (parsedTransactionData.args[i] !== undefined && parsedTransactionData.args[i] !== null)
                param.push(`: ${parsedTransactionData.args[i]}`)
            inputsLabel.push(param.join(''));
        }

        if (inputsLabel.length > 1)
            label.push('\n\t');

        label.push(inputsLabel.join(',\n\t'));

        if (inputsLabel.length > 1)
            label.push('\n');

        label.push(')');

        return {
            name: parsedTransactionData.name,
            label: label.join(''),
            signature: `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
        };
    } catch(_error) {
        return transaction.data.length > 10 ? {
            sighash: transaction.data.slice(0, 10)
        } : {};
    }
};

module.exports = {
    decodeLog: decodeLog,
    getTokenTransfer: getTokenTransfer,
    getTransactionMethodDetails: getTransactionMethodDetails,
    findAbiForFunction: findAbiForFunction,
    getV2PoolReserves: getV2PoolReserves
};
