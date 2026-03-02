# Database Schema Reference

Quick reference for Ethernal's PostgreSQL database schema (Sequelize ORM).

## Entity Relationship Overview

```
User (1) ──→ (M) Workspace ──→ (1) Explorer
                    │
                    ├──→ (M) Block ──→ (M) Transaction
                    │                        │
                    │                        ├──→ (1) TransactionReceipt
                    │                        ├──→ (M) TransactionLog
                    │                        ├──→ (M) TokenTransfer
                    │                        └──→ (1) Contract [created]
                    │
                    ├──→ (M) Contract
                    ├──→ (1) OrbitChainConfig
                    └──→ (M) OrbitBatch / OrbitDeposit / OrbitWithdrawal
```

---

## Core Models

### User
**Table:** `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `firebaseUserId` | STRING | Firebase auth UID |
| `email` | STRING | User email |
| `plan` | STRING | Subscription plan (free, premium) |
| `apiKey` | STRING | Encrypted API key |
| `currentWorkspaceId` | INTEGER | FK to active workspace |
| `stripeCustomerId` | STRING | Stripe customer ID |
| `canTrial` | BOOLEAN | Trial eligibility |
| `canUseDemoPlan` | BOOLEAN | Demo plan eligibility |
| `passwordHash`, `passwordSalt` | STRING | Self-hosted auth |

**Associations:** hasMany Workspace, hasMany Explorer, hasOne StripeSubscription

---

### Workspace
**Table:** `workspaces`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `userId` | INTEGER | FK to owner User |
| `name` | STRING | Workspace name |
| `networkId` | INTEGER | Chain/network ID |
| `rpcServer` | STRING | RPC endpoint URL |
| `public` | BOOLEAN | Public accessibility |
| `chain` | STRING | Chain type (ethereum, arbitrum) |
| `tracing` | STRING | Tracing mode (hardhat, other) |
| `dataRetentionLimit` | INTEGER | Data retention days |
| `integrityCheckStartBlockNumber` | INTEGER | Sync start block |

**Associations:** belongsTo User, hasOne Explorer, hasMany Block, hasMany Transaction, hasMany Contract, hasOne OrbitChainConfig

---

### Explorer
**Table:** `explorers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `userId` | INTEGER | FK to admin User |
| `workspaceId` | INTEGER | FK to Workspace |
| `chainId` | INTEGER | Chain ID |
| `name` | STRING | Display name |
| `slug` | STRING | URL slug (unique) |
| `themes` | JSON | UI theme config |
| `token` | STRING | Native token symbol |
| `totalSupply` | STRING | Total supply (wei) |
| `shouldSync` | BOOLEAN | Sync enabled |
| `isDemo` | BOOLEAN | Demo explorer flag |

**Associations:** belongsTo User, belongsTo Workspace, hasOne StripeSubscription, hasOne ExplorerFaucet, hasMany ExplorerDomain

---

### Block
**Table:** `blocks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `number` | INTEGER | Block number |
| `hash` | STRING | Block hash |
| `parentHash` | STRING | Parent block hash |
| `timestamp` | DATE | Block timestamp |
| `transactionsCount` | INTEGER | Tx count |
| `miner` | STRING | Miner address |
| `gasUsed` | STRING | Total gas used |
| `gasLimit` | STRING | Block gas limit |
| `baseFeePerGas` | STRING | EIP-1559 base fee |
| `state` | ENUM | 'syncing' or 'ready' |
| `l1BlockNumber` | INTEGER | L1 block (for L2s) |
| `orbitBatchId` | INTEGER | FK to OrbitBatch |

**Indexes:** `(workspaceId, number)`, `hash`, `state`

**Associations:** belongsTo Workspace, hasMany Transaction, belongsTo OrbitBatch

---

### Transaction
**Table:** `transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `blockId` | INTEGER | FK to Block |
| `hash` | STRING | Transaction hash |
| `from` | STRING | Sender (lowercase) |
| `to` | STRING | Recipient (lowercase, null for create) |
| `value` | STRING | ETH value |
| `data` | STRING | Input data |
| `gasPrice` | STRING | Gas price |
| `gasLimit` | STRING | Gas limit |
| `timestamp` | DATE | Tx timestamp |
| `blockNumber` | INTEGER | Block number |
| `state` | ENUM | 'syncing' or 'ready' |
| `type` | INTEGER | Tx type (0, 1, 2) |
| `nonce` | INTEGER | Tx nonce |
| `methodName` | STRING | Decoded method name |
| `parsedError` | STRING | Error message |
| `raw` | JSON | Raw RPC data |

**Indexes:** `hash`, `from`, `to`, `(workspaceId, state, blockNumber)`

**Associations:** belongsTo Block, hasOne TransactionReceipt, hasMany TokenTransfer, hasMany TransactionLog, hasMany TransactionTraceStep

---

### Contract
**Table:** `contracts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `address` | STRING | Contract address (lowercase) |
| `name` | STRING | Contract name |
| `abi` | JSON | Contract ABI |
| `patterns` | ARRAY | ['erc20', 'erc721', 'proxy', etc.] |
| `tokenName` | STRING | Token name |
| `tokenSymbol` | STRING | Token symbol |
| `tokenDecimals` | INTEGER | Token decimals |
| `tokenTotalSupply` | STRING | Total supply |
| `proxy` | STRING | Implementation address |
| `bytecode` | TEXT | Contract bytecode |
| `verificationStatus` | STRING | Verification state |
| `transactionId` | INTEGER | Creation tx FK |

**Indexes:** `(workspaceId, address)`, `patterns`

**Associations:** belongsTo Workspace, hasOne ContractVerification, hasMany ContractSource, hasMany Erc721Token

---

### TokenTransfer
**Table:** `token_transfers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `transactionId` | INTEGER | FK to Transaction |
| `src` | STRING | Source address |
| `dst` | STRING | Destination address |
| `token` | STRING | Token contract address |
| `amount` | STRING | Transfer amount |
| `tokenId` | STRING | NFT token ID |

**Indexes:** `(workspaceId, token)`, `src`, `dst`

**Associations:** belongsTo Transaction, hasMany TokenBalanceChange

---

### TransactionReceipt
**Table:** `transaction_receipts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `transactionId` | INTEGER | FK to Transaction |
| `workspaceId` | INTEGER | FK to Workspace |
| `status` | BOOLEAN | Success status |
| `gasUsed` | STRING | Gas used |
| `cumulativeGasUsed` | STRING | Cumulative gas |
| `effectiveGasPrice` | STRING | Effective gas price |
| `contractAddress` | STRING | Created contract |
| `logsCount` | INTEGER | Log count |
| `raw` | JSON | Raw receipt data |

---

### TransactionLog
**Table:** `transaction_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `transactionId` | INTEGER | FK to Transaction |
| `address` | STRING | Emitting contract |
| `logIndex` | INTEGER | Log index |
| `topics` | ARRAY | Event topics |
| `data` | TEXT | Event data |
| `raw` | JSON | Raw log data |

---

## L2 Integration Models

### OrbitChainConfig
**Table:** `orbit_chain_configs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to L2 Workspace (unique) |
| `parentWorkspaceId` | INTEGER | FK to parent Workspace |
| `rollupContract` | STRING(42) | Rollup address |
| `bridgeContract` | STRING(42) | Bridge address |
| `inboxContract` | STRING(42) | Inbox address |
| `sequencerInboxContract` | STRING(42) | Sequencer inbox |
| `outboxContract` | STRING(42) | Outbox address |
| `parentChainId` | INTEGER | Parent chain ID |
| `parentChainRpcServer` | STRING | Parent RPC URL |
| `parentChainExplorer` | STRING | Parent explorer URL |
| `l1GatewayRouter` | STRING | L1 gateway router |
| `l2GatewayRouter` | STRING | L2 gateway router |

---

### OrbitBatch
**Table:** `orbit_batches`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `batchSequenceNumber` | INTEGER | Batch number |
| `parentChainBlockNumber` | INTEGER | L1 block |
| `parentChainTxHash` | STRING | L1 tx hash |
| `transactionCount` | INTEGER | Tx count in batch |
| `confirmationStatus` | STRING | 'pending', 'confirmed' |
| `postedAt` | DATE | Batch post time |

---

### OrbitDeposit
**Table:** `orbit_deposits`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `l1Block` | INTEGER | L1 block number |
| `l1TransactionHash` | STRING | L1 tx hash |
| `l2TransactionHash` | STRING | L2 tx hash |
| `messageIndex` | INTEGER | Message index |
| `status` | STRING | 'pending', 'confirmed' |
| `timestamp` | DATE | Deposit time |

---

### OrbitWithdrawal
**Table:** `orbit_withdrawals`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `workspaceId` | INTEGER | FK to Workspace |
| `messageNumber` | INTEGER | Message number |
| `l2TransactionHash` | STRING | L2 tx hash |
| `l1TransactionHash` | STRING | L1 claim tx |
| `from` | STRING | Sender |
| `amount` | STRING | Amount |
| `status` | STRING | 'waiting', 'ready', 'relayed' |
| `timestamp` | DATE | Withdrawal time |

---

## Billing Models

### StripeSubscription
**Table:** `stripe_subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `explorerId` | INTEGER | FK to Explorer |
| `userId` | INTEGER | FK to User |
| `stripePlanId` | INTEGER | FK to StripePlan |
| `stripeId` | STRING | Stripe subscription ID |
| `status` | ENUM | 'active', 'pending_cancelation', 'trial' |
| `transactionQuota` | INTEGER | Quota usage |
| `cycleEndsAt` | DATE | Billing cycle end |

---

### StripePlan
**Table:** `stripe_plans`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `slug` | STRING | Plan identifier |
| `name` | STRING | Display name |
| `price` | INTEGER | Price in cents |
| `stripePriceId` | STRING | Stripe price ID |
| `capabilities` | JSON | Feature flags |
| `transactionQuota` | INTEGER | Tx quota limit |
| `public` | BOOLEAN | Publicly available |

---

## Supporting Models

| Model | Table | Purpose |
|-------|-------|---------|
| `Account` | `accounts` | Imported accounts with encrypted private keys |
| `BlockEvent` | `block_events` | Block analytics (TimescaleDB) |
| `TransactionEvent` | `transaction_events` | Tx analytics (TimescaleDB) |
| `TransactionTraceStep` | `transaction_trace_steps` | EVM call traces |
| `TokenBalanceChange` | `token_balance_changes` | Per-tx balance changes |
| `TokenTransferEvent` | `token_transfer_events` | Transfer analytics |
| `Erc721Token` | `erc721_tokens` | NFT metadata |
| `ContractVerification` | `contract_verifications` | Source verification |
| `ContractSource` | `contract_sources` | Verified source files |
| `CustomField` | `custom_fields` | Contract custom metadata |
| `ExplorerDomain` | `explorer_domains` | Custom domains |
| `ExplorerFaucet` | `explorer_faucets` | Faucet config |
| `FaucetDrip` | `faucet_drips` | Faucet distributions |
| `ExplorerV2Dex` | `explorer_v2_dex` | DEX configuration |
| `V2DexPair` | `v2_dex_pairs` | Trading pairs |
| `V2DexPoolReserve` | `v2_dex_pool_reserves` | Pool reserve history |
| `IntegrityCheck` | `integrity_checks` | Data validation |
| `RpcHealthCheck` | `rpc_health_checks` | RPC monitoring |
| `StripeQuotaExtension` | `stripe_quota_extensions` | Extra quota |
| `OrbitNode` | `orbit_nodes` | State assertions |

---

## Key Patterns

### Address Normalization
All address fields (`from`, `to`, `address`, `proxy`) are normalized to lowercase on set.

### BigNumber Storage
Gas prices, amounts, and balances use STRING type for precision with BigNumber.js.

### State Management
Blocks and Transactions use ENUM states (`syncing`, `ready`) for sync tracking.

### Workspace Scoping
All data queries MUST filter by `workspaceId` for multi-tenancy.

### Virtual Columns
Many models have virtual/computed columns (e.g., `isPremium`, `isToken`, `orbitStatus`).

---

## Common Queries

```javascript
// Get blocks for workspace
Block.findAll({ where: { workspaceId, state: 'ready' }, order: [['number', 'DESC']] });

// Get transaction with receipt
Transaction.findOne({ where: { hash }, include: [TransactionReceipt] });

// Get token transfers for address
TokenTransfer.findAll({
  where: { workspaceId, [Op.or]: [{ src: address }, { dst: address }] },
  include: [{ model: Contract, as: 'contract' }]
});

// Get explorer with subscription
Explorer.findOne({
  where: { slug },
  include: [{ model: StripeSubscription, include: [StripePlan] }]
});
```
