const ethers = require('ethers');
const { stringifyBns, sanitize } = require('./utils');

const SELECTORS = require('./abis/selectors.json');
const abis = {
    erc20: require('./abis/erc20.json'),
    erc721: require('./abis/erc721.json')
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

const getTokenTransfers = (transaction) => {
    const transfers = [];

    try {
        for (let i = 0; i < transaction.receipt.logs.length; i++) {
            const log = transaction.receipt.logs[i];
            if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                let decodedLog;
                for (const [pattern, abi] of Object.entries(abis)) {
                    decodedLog = decodeLog(log, abi);
                    if (decodedLog) break;
                }

                if (decodedLog) {
                    transfers.push(sanitize(stringifyBns({
                        token: log.address,
                        src: decodedLog.args.from,
                        dst: decodedLog.args.to,
                        amount: decodedLog.args.amount || ethers.BigNumber.from('1'),
                        tokenId: decodedLog.args.tokenId || null
                    })));
                }
            }
        }
        return transfers;
    } catch(error) {
        return [];
    }
};

const getTransactionMethodDetails = (transaction, abi) => {
    try {
        const contractAbi = abi ? abi : findAbiForFunction(transaction.data.slice(0, 10))

        if (!contractAbi)
            return {};

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
            if (parsedTransactionData.args[i])
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
        console.log(_error)
        return {};
    }
};

module.exports = {
    decodeLog: decodeLog,
    getTokenTransfers: getTokenTransfers,
    getTransactionMethodDetails: getTransactionMethodDetails,
    findAbiForFunction: findAbiForFunction
};
