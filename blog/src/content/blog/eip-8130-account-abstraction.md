---
title: "EIP-8130: Account Abstraction Without the Simulation Tax"
description: "EIP-8130 replaces EVM simulation with declarative verifiers. What changes for wallet builders, L2 teams, and the Hegota fork timeline."
date: 2026-03-17
tags:
  - EIP
  - Account Abstraction
  - L2
  - Ethereum
  - Wallet
image: "/blog/images/eip-8130-account-abstraction.png"
ogImage: "/blog/images/eip-8130-account-abstraction-og.png"
status: draft
readingTime: 8
---

Your wallet app sends a UserOperation. A bundler picks it up, spawns an EVM simulation, runs your account contract's `validateUserOp`, checks storage access patterns against a restricted opcode list, and estimates whether the operation is valid. If your validator calls a contract that reads state the simulation didn't expect, the bundler rejects the operation.

You are not debugging a failed transaction. You are debugging a simulation of a validation of a transaction.

This is the hidden cost of [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337)<sup>[10](#fn-10)</sup>: account abstraction delivered via a layer of infrastructure (bundlers, EntryPoint, paymasters) that exists entirely to work around the fact that Ethereum nodes had no predictable way to validate custom account logic without running arbitrary EVM code.

[EIP-8130](https://github.com/ethereum/EIPs/pull/11367)<sup>[1](#fn-1)</sup> proposes a different model. Instead of simulating validation, make it declarative.

## The problem with simulation

EIP-4337 shipped in March 2023. It brought smart contract wallets to mainnet without a consensus change, which was the design goal. No hard fork required. Wallets deploy a contract implementing `IAccount`, handle their own signing logic, and operations flow through the EntryPoint.

The tradeoff was infrastructure complexity. Because validation happens inside EVM code, bundlers cannot know whether a UserOperation is valid until they simulate it. Simulation requires banning certain opcodes (`BALANCE`, `TIMESTAMP`, `BLOCKHASH`, and anything that could produce different results at inclusion time). Paymasters need a separate reputation system because a malicious paymaster could drain bundlers without submitting valid transactions. The stack got large.

For L2s, this matters more. Rollup sequencers process transactions at high throughput. Simulating arbitrary validation logic before accepting transactions into the mempool is expensive at scale. The bundler and EntryPoint architecture is external to the sequencer, which means teams running Arbitrum Orbit or OP Stack chains operate a parallel infrastructure layer just to support AA wallets.

EIP-8130 starts from a stricter constraint: validation should be a single STATICCALL to a known contract, returning a deterministic result.

## The verifier model

EIP-8130 introduces a new EIP-2718 transaction type and an on-chain Account Configuration Contract at a fixed address (`ACCOUNT_CONFIG_ADDRESS`).

The configuration contract stores `owner_config` slots for each account. Each slot maps an `ownerId` (a 32-byte key identifier) to a verifier contract address and a 1-byte scope bitmask. The scope byte controls what the owner can authorize: signing transactions, acting as sender, acting as payer, or modifying configuration.

When a node encounters an EIP-8130 transaction, validation is one call:

```
verifier.verify(txHash, authData) → ownerId
```

The node checks that the returned `ownerId` matches what's registered for the sender. If it matches, the transaction is valid. No simulation. No opcode restrictions. The verifier is a black box to the node, but its output is bounded: it either returns a valid `ownerId` or reverts.

Five verifier types are defined natively:

| Type | Algorithm | ownerId derivation |
|------|-----------|-------------------|
| `0x01` K1 | secp256k1 ECDSA | `bytes32(bytes20(ecrecover(...)))` |
| `0x02` P256_RAW | secp256r1 raw ECDSA | `keccak256(pub_x \|\| pub_y)` |
| `0x03` P256_WEBAUTHN | secp256r1 WebAuthn | `keccak256(pub_x \|\| pub_y)` |
| `0x04` DELEGATE | Delegated to another address | `bytes32(bytes20(delegate))` |
| `0x00` Custom | Contract-defined | Contract-defined |

The K1 verifier covers existing EOAs. An EOA's `ownerId` is `bytes32(bytes20(address))`, the same derivation used by the DELEGATE verifier. [PR #11382](https://github.com/ethereum/EIPs/pull/11382)<sup>[3](#fn-3)</sup> clarified this uniformity: on-chain authorization checks use the same address-to-`ownerId` conversion regardless of verifier type. The implicit EOA rule is also notable: an EOA that has not registered any configuration can still send EIP-8130 transactions. The K1 verifier runs against the sender's address by default. Existing EOAs get AA capabilities without prior setup.

Here is what account setup looks like for a passkey-based wallet:

```solidity
// Register a secp256r1 passkey as the transaction signer
IAccountConfig(ACCOUNT_CONFIG_ADDRESS).setOwnerConfig(
    msg.sender,
    keccak256(abi.encodePacked(pubKeyX, pubKeyY)), // ownerId for P256
    VerifierConfig({
        verifier: P256_WEBAUTHN_VERIFIER, // type 0x03
        scope: SCOPE_SIGNATURE | SCOPE_SENDER
    })
);
```

Compare this to EIP-4337. A passkey-based wallet under EIP-4337 deploys its own `validateUserOp` that calls a secp256r1 precompile, and every bundler simulates that call for every operation. Under EIP-8130, the validation logic lives in a shared `P256_WEBAUTHN_VERIFIER` contract. The node calls it once per transaction. No simulation, no bundler.

## Permissionless payer and cross-chain signature security

[PR #11388](https://github.com/ethereum/EIPs/pull/11388)<sup>[2](#fn-2)</sup> extended the original draft with permissionless gas payment. Under the early EIP-8130 spec, only the sender could pay gas. The update allows any address to sponsor gas using any registered verifier.

The transaction structure gains two fields:

```solidity
struct AATx {
    address sender;
    bytes   sender_auth;   // verifier_type (1 byte) || auth_data
    address payer;         // gas sponsor; address(0) means sender pays
    bytes   payer_auth;    // verifier_type (1 byte) || auth_data
    // ... nonce, to, value, callData, gas params
}
```

The `payer_auth` is independent of `sender_auth`. The payer can use a different key type than the sender. An enterprise wallet might have a corporate K1 key paying gas while users sign with WebAuthn passkey credentials. A protocol could sponsor gas for its own users without requiring those users to hold ETH.

There is a security detail worth understanding. [PR #11374](https://github.com/ethereum/EIPs/pull/11374)<sup>[4](#fn-4)</sup> established that the hash the payer signs excludes the `payer` field itself. This is explicit domain separation: the payer's signature binds to the transaction and the chain, but not to the `payer` address directly. A payer signature from chain A cannot be replayed on chain B because the signing hash includes `chainId`. At the same time, the sender's signature binds explicitly to the `payer` address. The sender has to authorize the specific sponsor. A rogue relayer cannot swap in a different payer address.

## EIP-8130 vs EIP-8141

EIP-8130 is not the only AA proposal targeting the Hegota fork (expected H2 2026). [EIP-8141](https://eips.ethereum.org/EIPS/eip-8141)<sup>[5](#fn-5)</sup>, co-authored by Vitalik Buterin, proposes Frame Transactions: a model where each transaction carries a series of frames, each executing arbitrary validation and execution logic.

EIP-8141 gives wallet developers more flexibility. Custom validation runs inside frames without pre-registration. Openfort's analysis of EIP-8141<sup>[6](#fn-6)</sup> notes that this makes it more expressive for complex wallet use cases. The tradeoff is that nodes need more infrastructure to handle frame execution. As of March 2026, EIP-8141 has more momentum in All Core Devs discussions.

EIP-8130 comes from the Coinbase/Base team. Its design philosophy prioritizes node simplicity. Validation is always a bounded, deterministic STATICCALL against a registered verifier. Wallets needing custom logic use the `0x00` custom verifier type or the DELEGATE mechanism, but the node's view of validation is uniform: call verifier, check `ownerId`, proceed or reject.

For L2 sequencer integration, EIP-8130 is the simpler path. The validation step is a known-size computation against a fixed contract. No frame execution model, no bundler simulation layer. A sequencer can evaluate an AA transaction in one RPC call.

## The 2026 protocol cluster

EIP-8130 is one of several protocol proposals moving through the EIP process this quarter, and they share a common direction.

[EIP-7979](https://eips.ethereum.org/EIPS/eip-7979)<sup>[7](#fn-7)</sup> adds `CALLSUB`, `ENTERSUB`, and `RETURNSUB` opcodes to the EVM. These replace dynamic `JUMP`-based control flow with static subroutine semantics. The impact on ZK rollups: control-flow graph construction drops from O(n²) worst-case path explosion to O(n). Proving time and circuit complexity decrease for every ZK-EVM that compiles contracts to these opcodes. EIP-8173 is the companion informational document covering the ZK and RISC-V implications in depth.

[ERC-8180](https://github.com/ethereum/ERCs/pull/1578)<sup>[8](#fn-8)</sup>, Blob Authenticated Messaging, standardizes authenticated messaging over EIP-4844 blob space. It defines four interfaces: a core batch registration contract (zero storage, all indexing via events), an untrusted decoder interface, a trusted signature registry supporting ECDSA, BLS12-381, and STARK-Poseidon keys, and an exposer interface for proving messages on-chain. L2 sequencers could post batches as BAM-registered blobs, allowing bridge contracts to trustlessly receive and verify L2 messages without each protocol inventing its own message format.

[EIP-8189](https://github.com/ethereum/EIPs/pull/11391)<sup>[9](#fn-9)</sup> upgrades the snap peer-to-peer sync protocol to version 2. Instead of iteratively fetching trie nodes to repair state inconsistencies (the approach in snap/1), snap/2 downloads Block Access Lists for all blocks that advanced during the sync window and replays state diffs in order. The set of blocks to catch up is known upfront. Iterative trie-node discovery is gone. Reorg handling is also specified: the node identifies state mutated on the old fork, deletes it, re-fetches from the network, and applies BALs from the common ancestor forward.

The pattern across all four proposals is the same: replace iterative or simulation-based operations with bounded, declarative ones. Simulation becomes a STATICCALL. Trie healing becomes BAL replay. Dynamic jumps become static subroutine calls. The protocol is moving toward predictability.

## What this means for L2 builders

If EIP-8130 makes it into Hegota, sequencers on Arbitrum Orbit and OP Stack will need to support the new transaction type. The validation path is simpler than the EIP-4337 bundler model: call the verifier contract, check the `ownerId`, proceed. No separate bundler service, no opcode simulation layer to maintain.

For teams running block explorers, EIP-8130 transactions introduce fields that need decoding: the verifier type byte, the `sender_auth` payload, the payer address, and the `payer_auth` payload. A transaction where the sender pays with a passkey and a protocol sponsors the gas will show three distinct parties. The scope bitmask tells you which operations a given key is authorized to perform. The difference between a block explorer that shows "transaction from 0xSender" and one that shows "secp256r1 passkey, gas sponsored by 0xProtocol" is whether the explorer understands the EIP-8130 transaction type.

[Ethernal](https://tryethernal.com) decodes transaction types and fields from your chain's RPC endpoint without configuration. When EIP-8130 transactions appear on your chain, the verifier type, ownerId, and payer details surface in the transaction view alongside standard fields.

## What to watch

Neither EIP-8130 nor EIP-8141 is finalized. ACD discussions are ongoing, and the Hegota fork timeline is H2 2026. Both proposals are in active revision.

The design question is whether wallet validation should be flexible (EIP-8141 frames) or predictable (EIP-8130 verifiers). EIP-8130's node-simplicity argument is strong for L2 sequencer integration. EIP-8141's flexibility argument is strong for application-layer wallet developers. One of them will ship. The Hegota fork is when Ethereum has to decide.

For now, the most useful thing wallet developers and L2 builders can do is read both specs, follow the ACD calls, and understand what either change will require at the sequencer and wallet layers. The era of routing every transaction through a bundler has a defined end date. It's useful to understand what comes next before it arrives.

---

## References

<span id="fn-1">1.</span> Multiple authors. "EIP-8130: Account Abstraction by Account Configuration." _GitHub EIPs_, Feb–Mar 2026. [https://github.com/ethereum/EIPs/pull/11367](https://github.com/ethereum/EIPs/pull/11367)

<span id="fn-2">2.</span> Multiple authors. "EIP-8130: Enable permissionless payer." _GitHub EIPs_, March 2026. [https://github.com/ethereum/EIPs/pull/11388](https://github.com/ethereum/EIPs/pull/11388)

<span id="fn-3">3.</span> Multiple authors. "EIP-8130: Clear up naming and k1 behaviour." _GitHub EIPs_, March 2026. [https://github.com/ethereum/EIPs/pull/11382](https://github.com/ethereum/EIPs/pull/11382)

<span id="fn-4">4.</span> Multiple authors. "EIP-8130: Update verifier gas and cross chain sigs." _GitHub EIPs_, March 2026. [https://github.com/ethereum/EIPs/pull/11374](https://github.com/ethereum/EIPs/pull/11374)

<span id="fn-5">5.</span> Buterin, V. et al. "EIP-8141: Frame Transactions." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8141](https://eips.ethereum.org/EIPS/eip-8141)

<span id="fn-6">6.</span> Openfort. "What EIP-8141 Means for Developers." _openfort.io_, 2026. [https://www.openfort.io/blog/eip-8141-means-for-developers](https://www.openfort.io/blog/eip-8141-means-for-developers)

<span id="fn-7">7.</span> Multiple authors. "EIP-7979: Call and Return Opcodes for the EVM." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-7979](https://eips.ethereum.org/EIPS/eip-7979)

<span id="fn-8">8.</span> Multiple authors. "ERC-8180: Blob Authenticated Messaging." _GitHub ERCs_, March 2026. [https://github.com/ethereum/ERCs/pull/1578](https://github.com/ethereum/ERCs/pull/1578)

<span id="fn-9">9.</span> Multiple authors. "Add EIP: snap/2 — BAL-Based State Healing." _GitHub EIPs_, March 2026. [https://github.com/ethereum/EIPs/pull/11391](https://github.com/ethereum/EIPs/pull/11391)

<span id="fn-10">10.</span> Buterin, V. et al. "EIP-4337: Account Abstraction Using Alt Mempool." _Ethereum Improvement Proposals_, 2021. [https://eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337)
