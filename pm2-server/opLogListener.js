/**
 * @fileoverview OP Stack deposit event listener process.
 * Watches the optimism portal for TransactionDeposited events on the parent chain.
 * Spawned as a PM2 process per explorer with OP Stack integration.
 * @module pm2-server/opLogListener
 */

const { enqueue } = require('./lib/queue');
const { getClient } = require('./lib/client');
const { getWorkspace } = require('./lib/workspace');
const { parseAbiItem } = require('viem');

const args = process.argv.slice(2);

const { parentWorkspaceId, workspaceId, contractAddress } = JSON.parse(args[0]);

const TRANSACTION_DEPOSITED_ABI = parseAbiItem(
    'event TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)'
);

/**
 * Parse opaqueData from TransactionDeposited event.
 * Format: mint (32 bytes) + value (32 bytes) + gasLimit (8 bytes) + isCreation (1 byte) + data (variable)
 *
 * @param {string} opaqueData - Hex-encoded opaque data
 * @returns {Object} Parsed deposit fields
 */
const parseOpaqueData = (opaqueData) => {
    let mint = '0';
    let value = '0';
    let gasLimit = '0';
    let isCreation = false;
    let calldata = '0x';

    if (opaqueData && opaqueData.length >= 2) {
        try {
            const hexData = opaqueData.startsWith('0x') ? opaqueData.slice(2) : opaqueData;

            // 64 + 64 + 16 + 2 = 146 hex chars minimum
            if (hexData.length >= 146) {
                mint = BigInt('0x' + hexData.slice(0, 64)).toString();
                value = BigInt('0x' + hexData.slice(64, 128)).toString();
                gasLimit = BigInt('0x' + hexData.slice(128, 144)).toString();
                isCreation = hexData.slice(144, 146) === '01';
                if (hexData.length > 146) {
                    calldata = '0x' + hexData.slice(146);
                }
            }
        } catch (e) {
            // If parsing fails, use defaults
        }
    }

    return { mint, value, gasLimit, isCreation, data: calldata };
};

const onLogs = (logs) => {
    for (const log of logs) {
        const from = log.args.from;
        const to = log.args.to;
        const opaqueData = parseOpaqueData(log.args.opaqueData);

        enqueue('storeOpDeposit', `storeOpDeposit-${workspaceId}-${log.transactionHash}`, {
            workspaceId,
            l1BlockNumber: parseInt(log.blockNumber),
            l1TransactionHash: log.transactionHash,
            from,
            to: to === '0x0000000000000000000000000000000000000000' ? null : to,
            value: opaqueData.value,
            gasLimit: opaqueData.gasLimit,
            data: opaqueData.data,
            isCreation: opaqueData.isCreation,
            timestamp: new Date()
        });
    }
};

const onError = (error) => {
    console.error(error);
};

getWorkspace(parentWorkspaceId).then(({ workspace }) => {
    const client = getClient(workspace);
    console.log(`Listening to ${contractAddress} for TransactionDeposited on workspace ${parentWorkspaceId}`);
    client.watchEvent({
        address: contractAddress,
        event: TRANSACTION_DEPOSITED_ABI,
        onLogs,
        onError
    });
}).catch((error) => {
    console.error(`Failed to start OP log listener for workspace ${parentWorkspaceId}:`, error);
    process.exit(1);
});
