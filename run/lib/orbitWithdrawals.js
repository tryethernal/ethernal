const { ethers } = require('ethers');
const { encodeFunctionData } = require('viem');

const { ContractConnector } = require('./rpc');

const { NODE_INTERFACE_ADDRESS } = require('../constants/orbit');

const OUTBOX_ABI = require('../lib/abis/orbitOutbox.json');
const iface = new ethers.utils.Interface(require('../lib/abis/arbsys.json'));
const nodeInterfaceIface = new ethers.utils.Interface(require('../lib/abis/orbitNodeInterface.json'));
const outboxIface = new ethers.utils.Interface(require('../lib/abis/orbitOutbox.json'));
const l2GatewayRouterIface = new ethers.utils.Interface(require('../lib/abis/l2GatewayRouter.json'));
const finalizeInboundTransferIface = new ethers.utils.Interface(require('../lib/abis/finalizeInboundTransfer.json'));

const getWithdrawalTokenInfo = async (tokenAddress, provider) => {
    try {
        const contract = new ContractConnector(provider, tokenAddress);
        const tokenSymbol = await contract.symbol();
        const tokenDecimals = await contract.decimals();
        return { tokenSymbol, tokenDecimals };
    } catch (e) {
        return { tokenSymbol: null, tokenDecimals: null };
    }
};

const constructOutboxProof = async (size, messageId, provider) => {
    const contract = new ethers.Contract(NODE_INTERFACE_ADDRESS, nodeInterfaceIface, provider);

    const res = await contract.constructOutboxProof(size, messageId);

    return res.proof;
}

const getOutboxTransactionExecutedData = (log) => {
    const parsedLog = outboxIface.parseLog({ topics: log.topics, data: log.data });
    return {
        to: parsedLog.args.to,
        l2Sender: parsedLog.args.l2Sender,
        transactionIndex: parsedLog.args.transactionIndex
    };
}

const isOutboxTransactionExecutedLog = (log) => {
    try {
        const parsedLog = outboxIface.parseLog({ topics: log.topics, data: log.data });
        return parsedLog.name === 'OutBoxTransactionExecuted';
    } catch (e) {
        return false;
    }
}

const getClaimTransactionData = async (messageNumber, size, transaction, log) => {
    const provider = transaction.workspace.getProvider().provider;

    const parsedLog = getWithdrawalData(log, transaction);
    const proof = await constructOutboxProof(150418, messageNumber, provider);

    const args = [
        proof,
        messageNumber,
        parsedLog.caller,
        parsedLog.destination,
        parsedLog.arbBlockNum.toString(),
        parsedLog.ethBlockNum.toString(),
        parsedLog.timestamp.toString(),
        parsedLog.callvalue.toString(),
        parsedLog.logData
    ]

    return encodeFunctionData({
        abi: OUTBOX_ABI,
        functionName: 'executeTransaction',
        args
    });
}

const isWithdrawalLog = (log) => {
    try {
        const withdrawalTopic = iface.getEventTopic('L2ToL1Tx');
        return log.topics[0] === withdrawalTopic;
    } catch (e) {
        return false;
    }
};

const getWithdrawalData = (log) => {
    const parsedLog = iface.parseLog(log);

    if (parsedLog.args.data === '0x') {
        return {
            caller: parsedLog.args.caller,
            destination: parsedLog.args.destination,
            hash: parsedLog.args.hash.toString(),
            position: parseInt(parsedLog.args.position.toString()),
            arbBlockNum: parseInt(parsedLog.args.arbBlockNum.toString()),
            ethBlockNum: parseInt(parsedLog.args.ethBlockNum.toString()),
            timestamp: parseInt(parsedLog.args.timestamp.toString()),
            amount: parsedLog.args.callvalue.toString(),
            data: parsedLog.args.data
        }
    }
    else {
        const parsedLogData = finalizeInboundTransferIface.parseTransaction({ data: parsedLog.args.data });

        return {
            caller: parsedLog.args.caller,
            destination: parsedLog.args.destination,
            hash: parsedLog.args.hash.toString(),
            position: parseInt(parsedLog.args.position.toString()),
            arbBlockNum: parseInt(parsedLog.args.arbBlockNum.toString()),
            ethBlockNum: parseInt(parsedLog.args.ethBlockNum.toString()),
            timestamp: parseInt(parsedLog.args.timestamp.toString()),
            callvalue: parsedLog.args.callvalue.toString(),
            data: parsedLog.args.data,
            l1Token: parsedLogData.args._token,
            to: parsedLogData.args._to,
            amount: parsedLogData.args._amount.toString()
        }
    }
}

module.exports = {
    isWithdrawalLog,
    getWithdrawalData,
    getClaimTransactionData,
    isOutboxTransactionExecutedLog,
    getOutboxTransactionExecutedData,
    getWithdrawalTokenInfo
};
