---
title: "One Signature, Every Chain: EIP-8130's Protocol-Level Account Abstraction"
description: "EIP-8130 proposes native AA with chainId=0 config sync. No bundlers, no per-chain key rotations. Here's how the mechanism actually works."
date: 2026-03-18
tags:
  - Account Abstraction
  - EIP-8130
  - L2
  - Ethereum
  - Security
image: "/blog/images/eip-8130-protocol-level-account-abstraction.png"
ogImage: "/blog/images/eip-8130-protocol-level-account-abstraction-og.png"
status: draft
readingTime: 7
---

Key rotation in a multi-chain world is broken. Not slightly inconvenient. Architecturally broken.

Your DeFi protocol's hot wallet is suspected compromised. The security team needs to rotate to a hardware key on Ethereum mainnet, Arbitrum, Base, OP Mainnet, and zkSync Era. That's five chains. Five transactions. Five gas top-ups. Five block confirmation waits. One chain has a congested mempool. You are racing a potential attacker while executing five independent on-chain operations in sequence.

[EIP-8130](https://ethereum-magicians.org/t/eip-8130-account-abstraction-by-account-configurations/25952), a Core Ethereum EIP from Chris Hunter at Coinbase, proposes to fix this at the protocol layer.<sup>[1](#fn-1)</sup> One signed message. Every chain at once. No bundlers, no per-chain gas management, no sequential race.

## Why ERC-4337 cannot solve this

ERC-4337 achieved account abstraction without protocol changes , a genuine achievement. By routing through a separate EntryPoint contract and UserOperation mempool, it shipped batched transactions, sponsored gas, and custom signature schemes on mainnet without touching consensus clients.

But ERC-4337's architecture has a core tension: nodes must simulate arbitrary EVM to validate a UserOp before including it. That simulation requires full state access. A malicious UserOp can burn validation gas with no on-chain footprint , a natural denial-of-service vector.

The solution was bundlers: trusted off-chain operators who bear the simulation cost, filter spam, and aggregate valid UserOps into regular transactions. Bundlers need a reputation system to prevent flooding. The reputation system requires a separate mempool. The separate mempool means users depend on bundler availability, not validator inclusion.

```solidity
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}
```

The userspace design worked. But it cannot solve cross-chain key management , each chain runs an independent ERC-4337 deployment with independent state. A key rotation is still five transactions.

EIP-8130 asks a different question: what if the protocol validated transactions by reading explicit verifier declarations, not by simulating arbitrary EVM?

## Account abstraction by configuration

EIP-8130 introduces two primitives: a new transaction type (`AA_TX_TYPE`) and an Account Configuration system contract deployed at an identical CREATE2 address on every participating chain.

The Account Config contract stores each account's owners as `owner_config` slots , 32 bytes per owner , mapping an `ownerId` to a `{verifier, scope}` pair. A verifier is any contract implementing a single function:

```solidity
interface IVerifier {
    function verify(bytes32 hash, bytes calldata data) external view returns (bytes32 ownerId);
}
```

That is the entire abstraction surface for a custom auth scheme. The node validates a transaction by calling the declared verifier via `STATICCALL` , no state changes, bounded gas, no arbitrary EVM simulation. Four native verifier types ship in the spec:

| Type | Algorithm | Use Case |
|------|-----------|----------|
| `0x01` K1 | secp256k1 ECDSA | Standard Ethereum keys (MetaMask, etc.) |
| `0x02` P256_RAW | secp256r1 | Hardware security keys |
| `0x03` P256_WEBAUTHN | secp256r1 WebAuthn | Face ID / Touch ID wallets |
| `0x04` DELEGATE | Delegated to contract | Safe multisig, MPC |
| `0x00` Custom | Any contract | Post-quantum, future schemes |

The migration path for existing wallets: every unregistered EOA is implicitly authorized with K1, using `bytes32(bytes20(account))` as its `ownerId`. No prior registration required. Existing signers work on day one.

Each owner slot also carries a scope bitmask. A hardware guardian key might hold `CONFIG (0x08)` scope only , it can rotate the hot key without being able to move funds. A dedicated gas payer gets `PAYER (0x04)`. The scopes are:

- `0x01 SIGNATURE` , ERC-1271 signing rights
- `0x02 SENDER` , can send transactions from this account
- `0x04 PAYER` , can sponsor gas
- `0x08 CONFIG` , can modify account configuration

## How one signature reaches every chain

The cross-chain sync mechanism is the most L2-relevant part of EIP-8130.

When you construct a `ConfigChange` message, the EIP-712 TypeHash includes a `chainId` field:

```solidity
TYPEHASH = keccak256(
    "ConfigChange(address account,uint64 chainId,uint64 sequence,"
    "ConfigOperation[] operations)ConfigOperation(uint8 opType,"
    "address verifier,bytes32 ownerId,uint8 scope)"
);

// chainId = 0 → valid on any chain
digest = keccak256(abi.encode(TYPEHASH, account, 0, sequence, operationsHash));
```

Sign that digest once. The same signature is valid on Ethereum mainnet, Arbitrum, Base, OP Mainnet, and zkSync Era , any chain where the Account Config Contract is deployed. Submit it to each chain's mempool (or hand it to a relayer to broadcast), and each chain independently validates the signature against the current owner config.

The Account Config Contract is deployed at the same CREATE2 address on every chain , identical bytecode, identical salt, identical address. Account addresses follow the same pattern: deterministic from an `owners_commitment` hash (keccak256 of sorted owner records, 53 bytes each). Same owners yield the same address on every chain.

Walk through the key rotation scenario: the security team signs one ConfigChange with `chainId = 0`, replacing the compromised hot key with a hardware key. A relayer broadcasts to all five chains simultaneously. Each chain validates independently. The hostile window , the gap between "key is known compromised" and "key rotation is complete" , collapses from five sequential confirmation windows to a single broadcast. All five chains rotate in the same block interval.

This is not a bridge. No cross-chain message passing, no lock-and-mint, no sequencer involvement. Each chain evaluates the same signature against the same Account Config contract bytecode.

One clarification worth making explicit: `chainId = 0` is for owner synchronization, not token transfers. It enables cross-chain key management. It does not enable cross-chain execution or asset movement.

## Gas sponsorship without bundlers

EIP-8130's transaction wire format includes a `payer` field:

```
AA_TX_TYPE || rlp([
  chain_id, from, nonce_key, nonce_sequence, expiry,
  max_priority_fee_per_gas, max_fee_per_gas, gas_limit,
  authorization_list,
  account_changes,
  calls,
  payer,          // empty = self-pay, address = sponsored
  sender_auth, payer_auth
])
```

When `payer` is set, the payer signs a separate hash committing to the transaction body (excluding the `payer` field itself) , locking in what they are paying for without circular dependency.

PR #11388, merged March 9, 2026, extended this to permissionless payers: any contract can pay for any transaction, with no whitelist, no staking, no bundler coordination.<sup>[2](#fn-2)</sup> A gas sponsorship contract only needs to implement the payer interface and cover transactions meeting its criteria. No trusted intermediaries.

Base gas costs: `AA_BASE_COST` is 15,000 gas. EOA sender authentication costs 6,000 gas (ecrecover plus one SLOAD). Nonce key costs 22,100 gas on first use, 5,000 thereafter.

## What block explorers need to surface

AA transactions produce a new receipt format with three additional fields:

- `payer` (address): who actually paid gas
- `status` (uint8): overall transaction success
- `phaseStatuses` (uint8[]): per-phase result array

The phases matter. EIP-8130 organizes calls into ordered phases; each phase executes atomically, but completed phases persist even if a later phase reverts. A three-phase operation , approve, bridge, stake , could show Phase 1 and Phase 2 succeeded while Phase 3 reverted. The first two legs are permanent. That is a very different debugging picture from a single "reverted" status.

For block explorers, surfacing AA transactions well requires:

1. Parsing the new `AA_TX_TYPE` wire format
2. Displaying sender and gas payer as distinct fields
3. Rendering `phaseStatuses[]` as a per-phase trace
4. Indexing Account Config events: `OwnerAuthorized`, `OwnerRevoked`, `AccountCreated`

On L2s where gas abstraction is common, the `payer` field is the difference between "who submitted this transaction" and "who paid for it." For contract verification, revenue attribution, and incident postmortems, that distinction is often the core question. Ethernal's transaction tracing and decoded event view are designed to surface exactly this kind of execution detail.

## Status and what comes next

EIP-8130 is in Draft status as of March 2026, with six active PRs in two weeks , naming clarifications, cross-chain signature updates, verifier gas costs, permissionless payer.<sup>[3](#fn-3)</sup> That pace signals active development, not a stalled research proposal.

The EIP requires EIP-7702 (EOA delegation, included in Pectra) as a dependency.<sup>[4](#fn-4)</sup> It follows the standard EIP path: champion, EIP editors review, CFIR, final. No deployment timeline has been set.

For teams on chains that do not adopt EIP-8130 at the protocol level, the Account Config Contract works as an ERC-4337-compatible smart contract wallet today. Native protocol support is the upgrade path, not a prerequisite. A team can deploy the system contract now and gain `chainId = 0` sync across chains where it is deployed, using ERC-4337 bundler infrastructure as the current execution layer.

## One Message, Five Chains

Return to the opening scenario: the security team signs one message. A relayer broadcasts it to five chains. By the time the next block lands on the slowest chain, the key rotation is live everywhere. No bundler infrastructure. No per-chain gas management. No race.

EIP-8130 proposes solving account abstraction at the layer where it can actually work , the protocol. Whether it ships depends on the EIP process. But the design pattern it establishes , shared system contract, deterministic cross-chain addresses, native verifier declarations, receipt extensions that make gas sponsorship legible , is already shaping how teams think about multi-chain identity.

The cross-chain key management problem is not going away. As L2 ecosystems fragment wallet state across more chains, the cost of not having a protocol-level answer only grows.

---

## References

<span id="fn-1">1.</span> Hunter, C. (@chunter-cb). "EIP-8130: Account Abstraction by Account Configuration." _Ethereum Magicians_, 2026. [https://ethereum-magicians.org/t/eip-8130-account-abstraction-by-account-configurations/25952](https://ethereum-magicians.org/t/eip-8130-account-abstraction-by-account-configurations/25952)

<span id="fn-2">2.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Enable permissionless payer." _GitHub EIPs_, March 9, 2026. [https://github.com/ethereum/EIPs/pull/11388](https://github.com/ethereum/EIPs/pull/11388)

<span id="fn-3">3.</span> EIP-8130 pull request activity. _GitHub EIPs_, March 2026. [https://github.com/ethereum/EIPs/pulls?q=EIP-8130](https://github.com/ethereum/EIPs/pulls?q=EIP-8130)

<span id="fn-4">4.</span> Ethereum Foundation. "EIP-7702: Set EOA account code for one transaction." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7702](https://eips.ethereum.org/EIPS/eip-7702)
