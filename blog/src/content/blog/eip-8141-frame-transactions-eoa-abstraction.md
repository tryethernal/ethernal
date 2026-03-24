---
title: "The Frame Wallet: What EIP-8141 Means for Every EOA"
description: "EIP-8141 gives unmodified EOAs gas abstraction via default code and a new frame execution model. No bundlers, no migration, no new wallet."
date: 2026-03-24
tags:
  - Account Abstraction
  - EIP-8141
  - Ethereum
  - EVM
  - Security
image: "/blog/images/eip-8141-frame-transactions-eoa-abstraction.png"
ogImage: "/blog/images/eip-8141-frame-transactions-eoa-abstraction-og.png"
status: published
readingTime: 8
---

A MetaMask wallet (no smart contract deployed, no ERC-4337 setup, no wallet migration) submits a transaction. Its ETH balance is zero. It pays gas in USDC. The transaction goes through.

This is not a hypothetical. It is what EIP-8141's "default code" mechanism enables for existing EOA addresses, without the account ever deploying a contract or touching a bundler.

[EIP-8141](https://github.com/ethereum/EIPs/pull/11379) , co-authored by Vitalik Buterin, lightclient, Felix Lange, Yoav Weiss, Alex Forshtat, Dror Tirosh, and Shahaf Nacson , is the Ethereum core team's proposal for protocol-native account abstraction, targeting the Hegota hard fork (H2 2026).<sup>[1](#fn-1)</sup> An All Core Devs vote is scheduled for March 27, 2026. Unlike ERC-4337, it needs no bundlers, no separate mempool, no reputation system. Unlike [EIP-8130's verifier sandbox approach](https://tryethernal.com/blog/eip-8130-protocol-level-account-abstraction), it introduces new EVM opcodes and a fundamentally different execution model.

The core structure: a transaction is not a single call. It is a sequence of frames.

## Why ERC-4337 cannot solve this at the protocol level

ERC-4337 achieved account abstraction without a hard fork , a genuine technical achievement. But its architecture created a structural dependency that protocol-level AA needs to eliminate.

Nodes must simulate arbitrary EVM to validate a UserOp before inclusion. That simulation requires full state access. A malicious UserOp can burn validation gas without any on-chain footprint , a natural denial-of-service vector. The solution was bundlers: trusted off-chain operators who bear the simulation cost, filter spam, and aggregate valid UserOps into regular transactions. Bundlers need a reputation system. The reputation system requires a separate mempool. The separate mempool means users depend on bundler liveness, not validator inclusion.

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

The userspace design worked for mainnet UX. It cannot work as a protocol primitive: each chain runs an independent ERC-4337 deployment, bundler infrastructure availability varies, and the bundler trust model does not disappear with scale.

EIP-8141 asks a different question: what if validation is just EVM code running in a `STATICCALL`? No arbitrary simulation by nodes. The EVM handles the restriction. The node does not need to trust the simulation.

## What a frame transaction actually is

EIP-8141 introduces transaction type `0x06`. Instead of a single call target, a frame transaction carries a sequence of execution frames:

```
[chain_id, nonce, sender, frames, max_priority_fee_per_gas,
 max_fee_per_gas, max_fee_per_blob_gas, blob_versioned_hashes]

frames = [[mode, target, gas_limit, data, value], ...]
```

Each frame has its own mode, target, gas limit, calldata, and value. Unused gas does not transfer between frames , each frame either completes within its budget or reverts independently.

Three frame modes govern how execution works:

| Mode | Value | Execution | Requirement |
|------|-------|-----------|-------------|
| DEFAULT | 0 | Regular call with ENTRY_POINT as caller | None |
| VERIFY | 1 | STATICCALL (no state changes) | Must emit APPROVE |
| SENDER | 2 | Call with account address as caller | Requires prior APPROVE |

The ENTRY_POINT address is `0xaa` , same as the new `APPROVE` opcode, an intentional mnemonic.

EIP-8141 introduces three new opcodes to support this model:

- **`APPROVE (0xaa)`**: Like `RETURN`, but sets a transaction-scope approval flag. `scope=0x0` grants execution rights, `scope=0x1` grants payment rights, `scope=0x2` grants both.
- **`TXPARAMLOAD (0xb0)`**: Read transaction parameters by index (nonce, sender, sig hash, frame count, frame mode).
- **`TXPARAMSIZE (0xb1)` / `TXPARAMCOPY (0xb2)`**: Read size and copy parameter data to memory.

A VERIFY frame runs as a `STATICCALL` , no state writes, no ETH transfers. It must call `APPROVE` before returning or the transaction fails. SENDER frames execute only after the relevant approval has been granted. This ordering guarantee is what makes the model safe: validation is provably read-only, execution follows only on explicit approval.

VERIFY frame data is also elided from the signing hash. This enables future signature aggregation: multiple users' verification frames can share a single aggregated proof without changing the core protocol.

The gas model is explicit:

```
tx_gas_limit = 15,000 (intrinsic) + calldata_cost(rlp(frames)) + sum(frame.gas_limit)
```

The 15,000 base is the same as EIP-8130's `AA_BASE_COST`.

## EOA default code: the sleeper feature

The most consequential addition to EIP-8141 came from PR #11379 by Derek Chiang.<sup>[1](#fn-1)</sup> When a VERIFY frame targets an address with no deployed contract code, the EVM does not revert. Instead, it applies built-in default code.

The first byte of `frame.data` encodes the auth scheme: the high nibble is `scope`, the low nibble is `signature_type`:

- `0x0` = secp256k1 ECDSA (standard Ethereum key)
- `0x1` = P256/secp256r1 (hardware security keys , Touch ID, Face ID, YubiKey)

On successful verification, the default code calls `APPROVE(scope)` automatically.

An unmodified EOA address , no contract, no migration, no wallet change , becomes VERIFY-capable through this mechanism. None of that changes: not the wallet software, not the signing key, not the address. The EOA gains gas abstraction because the EVM handles the verification natively when a VERIFY frame targets that address.

Here is what an EOA paying gas in ERC-20 looks like as a frame sequence:

| Frame | Caller | Target | Mode | Purpose |
|-------|--------|--------|------|---------|
| 0 | ENTRY_POINT | EOA address | VERIFY | secp256k1 default code → APPROVE(exec) |
| 1 | ENTRY_POINT | Sponsor contract | VERIFY | Sponsor validates fee commitment → APPROVE(pay) |
| 2 | EOA | ERC-20 contract | SENDER | `transfer(sponsor, fees)` |
| 3 | EOA | dApp contract | SENDER | Actual user call |

The EOA never deploys a contract. The wallet never changes. The signing scheme stays secp256k1. Frame 0 succeeds via default code. Frame 1 succeeds because the Sponsor contract called `APPROVE(0x1)`. Frames 2 and 3 execute because both approvals are in scope.

The P256 path works identically with `signature_type = 0x1`. A hardware security key (Touch ID, Face ID, a FIDO2 YubiKey) generates a P256 key pair. The Ethereum address is derived as `keccak256(qx||qy)[12:]`. A VERIFY frame targeting that address with `signature_type = 0x1` applies the P256 default code and validates against the hardware key. No smart contract required.

The post-quantum path is also designed in. A VERIFY frame can target any contract , the underlying proof system is the contract's choice. NIST-standardized post-quantum schemes (Falcon, ML-DSA via FIPS 204, SLH-DSA via FIPS 205) can be deployed as verifier contracts and used in VERIFY frames without any further protocol changes. The frame model does not presuppose secp256k1.<sup>[2](#fn-2)</sup>

## What block explorers need to handle

EIP-8141 changes the transaction receipt format in ways that are visible to anyone reading the chain:

```
receipt = [cumulative_gas_used, payer, [frame_receipt, ...]]
frame_receipt = [status, gas_used, logs]
```

The top-level `payer` field is new. It records who actually paid for gas , distinct from `sender`, who submitted the transaction. For sponsored transactions, these are different addresses. For self-paying EOAs, they are the same. The distinction is always explicit in the receipt.

The per-frame receipt array is the other structural change. A 4-frame transaction produces 4 independent receipts. Each has its own `status`, its own `gas_used`, and its own `logs`. A transaction where frame 2 reverts while frames 0, 1, and 3 succeed is not a "failed transaction" , it is a partial execution where the state changes from frames 0, 1, and 3 are permanent.

This matters for debugging. Consider a sponsored transaction where frame 0 (EOA VERIFY) succeeds, frame 1 (sponsor VERIFY) succeeds, frame 2 (ERC-20 fee transfer) succeeds, and frame 3 (the actual dApp call) reverts. The user's fee is already paid. The dApp call is the only thing that failed. A single-status "reverted" label tells you nothing useful. Per-frame statuses tell you exactly where the execution stopped.

VERIFY frames can also generate logs , `APPROVE` events are the obvious case. These need to be decoded separately from execution logs emitted by SENDER frames.

For teams building or debugging sponsored transactions: the `payer` field is the starting point for every postmortem. It answers "who paid" before any call tree analysis. On L2s where gas sponsorship is common, this distinction appears in most high-value transactions. Ethernal's per-phase status rendering , built for EIP-8130's phase model , maps directly to frame receipt display. Each frame renders as a labeled execution segment with its own status badge, gas consumed, and decoded logs.

## Status and what comes next

EIP-8141 is targeting the Hegota hard fork (H2 2026). An All Core Devs vote is scheduled for March 27, 2026 , three days from this article's publication.<sup>[3](#fn-3)</sup> The March 2026 ACD call delayed formal approval on one outstanding item: a DoS protection spec for VERIFY frame execution. EIP-7562-style opcode restrictions , the same sandboxing approach used in ERC-4337 validation , need to be specified for the VERIFY frame context before the proposal can advance.

Three account abstraction proposals are currently in Draft, each representing a different opinion on protocol complexity budget:<sup>[4](#fn-4)</sup>

| EIP | Author | New Opcodes | Primary Feature |
|-----|--------|-------------|-----------------|
| EIP-8175 | Dragan Rakita (reth) | 0 | Ed25519, extensible tx capabilities |
| EIP-8130 | Chris Hunter (Coinbase) | 0 | Verifier sandbox, cross-chain key sync |
| EIP-8141 | Vitalik Buterin et al. | 3 | Frame execution model, EOA default code |

These are not competing implementations waiting for a merge decision. They represent genuinely different protocol complexity budgets. EIP-8175 adds nothing to the EVM , it is a pure transaction format change with extensible capability slots. EIP-8130 adds a system contract. EIP-8141 adds opcodes and a new execution mode. The ACD will choose one (or none) for Hegota.

ERC-4337 remains valid on L2s that do not adopt EIP-8141 , backward compatibility is explicit in the spec. For teams on ERC-4337 today: frame transactions are a future migration target, not an immediate breaking change. The UserOperation model continues to work. When EIP-8141 ships on a chain you care about, the migration path is removing the bundler dependency , the business logic in your smart account stays the same.

## Block 21,847,291

Return to the opening scenario. A MetaMask EOA with zero ETH submits a transaction paying gas in USDC. It lands.

The block explorer shows a 4-frame transaction. Frame 0: VERIFY, 3,200 gas, APPROVE logged. Frame 1: VERIFY, 4,100 gas, APPROVE logged. Frame 2: SENDER, 24,000 gas, ERC-20 Transfer emitted. Frame 3: SENDER, 51,000 gas, function call succeeded. Payer: `0x3f91...` (Sponsor contract). Sender: `0x7a2b...` (the EOA).

EIP-8141 upgrades existing wallets to something they could not do before, without the user touching anything. The migration was handled at the protocol layer, in a VERIFY frame, by default code that existed before the user knew the feature existed. That is a genuinely different philosophy from every prior AA proposal: the user is the last person to find out.

---

## References

<span id="fn-1">1.</span> Chiang, D. (@derekchiang). "Update EIP-8141: Add EOA support." _GitHub EIPs_, March 5, 2026. [https://github.com/ethereum/EIPs/pull/11379](https://github.com/ethereum/EIPs/pull/11379)

<span id="fn-2">2.</span> Openfort. "What EIP-8141 Means for Developers." _openfort.io_, 2026. [https://www.openfort.io/blog/eip-8141-means-for-developers](https://www.openfort.io/blog/eip-8141-means-for-developers)

<span id="fn-3">3.</span> Ethereum Foundation. "Protocol Priorities Update 2026." _blog.ethereum.org_, February 18, 2026. [https://blog.ethereum.org/en/2026/02/18/protocol-priorities-update-2026](https://blog.ethereum.org/en/2026/02/18/protocol-priorities-update-2026)

<span id="fn-4">4.</span> Rakita, D. (@rakita). "Add EIP: Composable Transaction." _GitHub EIPs_, February 26, 2026. [https://github.com/ethereum/EIPs/pull/11355](https://github.com/ethereum/EIPs/pull/11355)
