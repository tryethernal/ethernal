module.exports = {
  ARBSYS_ADDRESS: '0x0000000000000000000000000000000000000064',
  ARB_RETRYABLE_TX_ADDRESS: '0x000000000000000000000000000000000000006e',
  NODE_INTERFACE_ADDRESS: '0x00000000000000000000000000000000000000c8',
  ORBIT_L2_TO_L1_LOG_TOPIC: '0x3e7aafa77dbf186b7fd488006beff893744caa3c4f6f299e8a709fa2087374fc',
  ORBIT_OUTBOX_TRANSACTION_EXECUTED_EVENT: 'OutBoxTransactionExecuted',
  ORBIT_BRIDGE_MESSAGE_DELIVERED_EVENT_ABI: { 'anonymous': false, 'inputs': [ { 'indexed': true, 'internalType': 'uint256', 'name': 'messageIndex', 'type': 'uint256' }, { 'indexed': true, 'internalType': 'bytes32', 'name': 'beforeInboxAcc', 'type': 'bytes32' }, { 'indexed': false, 'internalType': 'address', 'name': 'inbox', 'type': 'address' }, { 'indexed': false, 'internalType': 'uint8', 'name': 'kind', 'type': 'uint8' }, { 'indexed': false, 'internalType': 'address', 'name': 'sender', 'type': 'address' }, { 'indexed': false, 'internalType': 'bytes32', 'name': 'messageDataHash', 'type': 'bytes32' }, { 'indexed': false, 'internalType': 'uint256', 'name': 'baseFeeL1', 'type': 'uint256' }, { 'indexed': false, 'internalType': 'uint64', 'name': 'timestamp', 'type': 'uint64' } ], 'name': 'MessageDelivered', 'type': 'event' },
  SUPPORTED_PARENT_CHAINS: [1, 42161]
};
