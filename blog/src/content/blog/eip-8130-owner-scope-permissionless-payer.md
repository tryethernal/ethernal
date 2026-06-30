---
title: "The Payer That Can't Send: EIP-8130's Owner Scope Model"
description: "EIP-8130 adds a scope byte to every owner slot: gas-only payers, config-only cold keys, signing-only verifiers, all enforced at the protocol level."
date: 2026-06-30
tags:
  - Account Abstraction
  - EIP-8130
  - Ethereum
  - Security
keywords: []
image: "/blog/images/eip-8130-owner-scope-permissionless-payer.png"
ogImage: "/blog/images/eip-8130-owner-scope-permissionless-payer-og.png"
status: published
readingTime: 7
---

A team provisions a hot wallet to sponsor gas for their users. The setup is straightforward: the relay key is registered as an owner of each user's account, the relay service pays gas, users never touch ETH. Six months later the key is phished. The attacker tries to drain the user accounts. They can. "Can pay gas" meant "can do anything" because every registered owner had equal authority over the account.

EIP-8130 PR #11388, merged March 9, 2026, ships a protocol-level answer to this in one byte.<sup>[1](#fn-1)</sup>

This is the third post in the EIP-8130 series. The [first covered cross-chain key sync and the bundler-free architecture](https://tryethernal.com/blog/eip-8130-protocol-level-account-abstraction). The [second covered TX\_CONTEXT, phase atomicity, and policy gates](https://tryethernal.com/blog/eip-8130-execution-model-self-call-tx-context). This post covers what neither touched: the owner scope model, the permissionless payer mechanism, and why scope is baked into your account's CREATE2 address.

## The equal owners problem

Until PR #11388, every authorized owner in EIP-8130 had identical authority over the account. Register a key as an owner and that key could:

- Initiate transactions (SENDER)
- Pay gas on behalf of the account (PAYER)
- Modify account configuration (CONFIG)
- Sign off-chain messages (SIGNATURE)

For a single personal hardware key, this is correct behavior. The problem surfaces when you want to delegate narrow trust:

- Let a gas relay service pay for user transactions, but not send them
- Let a cold key recover the account, but not drain it from storage
- Let a browser session key sign permit messages, but not initiate withdrawals

In ERC-4337, this scoping requires a custom paymaster or a contract-layer policy system. You write code that checks which key signed and what operation is being requested. If the code has a bug, the separation fails. If the check lives in the bundler, it doesn't appear on chain.

EIP-8130 puts the check at the protocol level. Not in contract code. Not in a bundler. In the storage slot that every node reads before running any EVM.

Chris Hunter's updated EIP-8130 motivation puts it directly: "This proposal separates verification from account logic. Each transaction explicitly declares its verifier... This makes validation predictable: wallets know the rules, and nodes can see exactly what computation a transaction requires before executing it."<sup>[2](#fn-2)</sup>

## The scope byte

The `owner_config` storage slot (32 bytes) previously held a verifier address (20 bytes) with 12 bytes reserved. PR #11388 uses byte 20 for a scope bitmask:

```
owner_config layout (32 bytes):
┌────────────────────────┬──────────┬───────────────────────────┐
│ verifier (bytes 0–19)  │  scope   │  reserved (bytes 21–31)   │
│       20 bytes         │  1 byte  │  11 bytes (must be zero)  │
└────────────────────────┴──────────┴───────────────────────────┘
```

`0x00` means unrestricted. Any other value limits the owner to contexts where the matching bit is set:

| Bit | Value | Name | Controls |
|-----|-------|------|----------|
| 0 | `0x01` | SIGNATURE | ERC-1271 `verifySignature()` calls |
| 1 | `0x02` | SENDER | `sender_auth`: initiating transactions |
| 2 | `0x04` | PAYER | `payer_auth`: gas payment |
| 3 | `0x08` | CONFIG | Config change `authorizer_auth` |

Protocol enforcement runs after the verifier returns an `ownerId`. The node reads the scope byte from `owner_config` and checks:

```
scope == 0x00 || (scope & context_bit) != 0
```

This check runs at the storage-read step in the validation phase, before any EVM execution for the transaction's calls. A key with `scope = 0x04` that produces a valid secp256k1 signature for a SENDER context still fails here. The verifier ran correctly. The key just doesn't have SENDER authority. A contract-layer policy could have a logic bug. This check cannot.

Existing EOAs are unaffected. The implicit authorization rule for EIP-8130 accounts (empty `owner_config` slot + `ownerId == bytes32(bytes20(account))` + K1 verifier) grants `scope = 0x00`, unrestricted. No migration required for unregistered accounts.

## Four owner configurations

### Gas-only payer key (`scope = 0x04`)

The scenario from the hook. Register the relay service's key with PAYER scope only:

```javascript
// Account setup: user key as sender, relay key as payer only
const initial_owners = [
  { verifier: K1_VERIFIER, ownerId: user_key_id,  scope: 0x02 }, // SENDER
  { verifier: K1_VERIFIER, ownerId: relay_key_id, scope: 0x04 }, // PAYER only
];
```

The relay key signs `payer_auth`. It cannot initiate transactions, cannot modify account config, cannot sign off-chain messages. If the relay key is phished, the attacker can pay gas for transactions the user is already sending. That is the extent of the damage. They cannot instruct the account to do anything because they hold no SENDER authority.

This is what "permissionless payer" means in EIP-8130's context: any address can be registered as a payer for any account without needing to be a first-party account owner. The `payer` field in the transaction binds the sender to a specific payer address for that transaction. The `payer_auth` proves the payer agreed. Because `payer_auth` is validated with the PAYER context bit, the payer's key is cryptographically scoped to gas payment and nothing else.<sup>[1](#fn-1)</sup>

### Cold recovery key (`scope = 0x08`)

A key stored on an air-gapped device or hardware vault. CONFIG scope only: it can add or remove other owners, adjust the account's unlock delay, rotate keys after a compromise. It cannot send transactions, so a compromised operational environment cannot use it to drain funds while the device is in storage.

```javascript
{ verifier: P256_VERIFIER, ownerId: cold_key_id, scope: 0x08 } // CONFIG only
```

### Read-only signer (`scope = 0x01`)

A browser-stored key used exclusively for off-chain message signing: ERC-1271 signature verification, permit flows, gasless order signing. Cannot initiate transactions. Cannot modify account state. A compromised browser key results in forged signatures, but no on-chain loss.

### Operational split (`scope = 0x06`, SENDER | PAYER)

A day-to-day hot key that handles both sending and gas payment but cannot modify account configuration. The config key (with `scope = 0x08`) is separate. A phished operational key cannot remove the owner's recovery path because it has no CONFIG authority.

```javascript
const initial_owners = [
  { verifier: K1_VERIFIER, ownerId: hot_key_id,  scope: 0x06 }, // SENDER | PAYER
  { verifier: P256_VERIFIER, ownerId: cold_key_id, scope: 0x08 }, // CONFIG only
];
```

These combinations compose without any smart contract code. The protocol enforces them at the storage-read step in the validation phase. Each combination is a different threat model with a different blast-radius ceiling.

## Scope bakes into your account address

A consequence that matters at deployment time: scope is included in the CREATE2 address derivation for new EIP-8130 accounts.

Before PR #11388, the `owners_commitment` hash (used in the CREATE2 salt) covered 52 bytes per initial owner: `ownerId || verifier`. Now it covers 53 bytes:<sup>[1](#fn-1)</sup>

```
owners_commitment = keccak256(
  ownerId_0 || verifier_0 || scope_0 ||
  ownerId_1 || verifier_1 || scope_1 || ...
)
```

Two accounts with the same keys but different scope assignments get different addresses. This is intentional. Counterfactual deployment commits to the full privilege model, not just the key set. A wallet deployed with `scope = 0x06` for the operational key and `scope = 0x08` for the cold key lives at a different address than the same keys deployed with `scope = 0x00` for both.

The practical constraint for wallet developers: if you deploy an account and later decide you want different initial scope assignments, you cannot mutate the `owners_commitment`. You add a new owner with the correct scope and revoke the old one. The initial privilege assignment is permanent in the address.

This is the right tradeoff. The account address carries a commitment to its initial security model. When tooling shows you a counterfactual address (the address before the account is deployed on-chain), that address encodes exactly who is authorized to do what, not just who holds keys.

## What this looks like on chain

When EIP-8130 is live, scope becomes visible through the transaction structure itself. Each transaction can carry:

- `sender_auth`: present when the SENDER context was exercised
- `payer_auth` and a non-empty `payer` field: present when a separate payer handled gas
- A config change entry: present when CONFIG context was exercised

A transaction with both `sender_auth` and `payer_auth` signed by different keys tells you the account uses split authority. If the payer field is non-empty and `payer_auth` is signed by the same key as `sender_auth`, the key holds `scope = 0x00` or `scope = 0x06`. If they differ, you're looking at a permissionless payer setup.

In Ethernal, these surface during the validation phase of the trace: verifier invocation, SLOAD of the `owner_config` slot (with the scope byte visible in the storage read), and the context bit check. A transaction that fails because a valid signature was produced by a key lacking the required scope fails before any call execution. The terminal event in the trace is the scope check, not a contract revert. This is a different failure mode from ERC-4337, where scope-equivalent violations surface as bundler-level rejections that never reach the chain at all.

## What the spec update also changes

PR #11374, merged March 4, 2026, made two other changes.<sup>[3](#fn-3)</sup>

The verifier gas model changed. Previously, verifier bytecode declared a `gas_limit` in a standardized header that nodes read before execution, charging the full declared amount as intrinsic gas. That required a static bytecode scan. The new model removes the header entirely: gas is metered from actual execution, and nodes set their own per-verifier gas cap as a mempool acceptance rule. Simpler for verifier authors, more flexible for node operators.

The config signature encoding also changed, from EIP-712 to raw ABI encoding with custom type hashes. The reason: EIP-712's `\x19\x01` prefix creates a structural dependency on domain parameters. The new approach uses `keccak256(abi.encode(TYPEHASH, account, chainId, sequence, operationsHash))`, which cannot produce the same prefix as a transaction hash. Domain isolation is now structural, not dependent on domain configuration. The `chainId` field within the signed struct (not the domain) is what enforces chain restriction, with `chainId = 0` meaning cross-chain, valid on all EIP-8130 chains.

## The permission model going forward

The scope byte is a minimal addition, one byte in a 32-byte storage slot, that resolves a class of privilege-confusion bugs that otherwise require entire contract systems. Gas keys that can only pay. Config keys that can only modify. Signing keys that can only verify. Each defined by a bitmask the protocol enforces before any EVM runs.

What's worth tracking as EIP-8130 continues in Draft: scope composes with the policy gates and actorId model from the previous revision. A session key with `scope = 0x02` (SENDER) and a policy gate locked to one DEX contract is a key that can only send transactions and only to one address. The protocol enforces both constraints at the same validation step, independently.

The permission model does not have to be all-or-nothing. The scope byte is how EIP-8130 makes that concrete.

---

## References

<span id="fn-1">1.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Enable permissionless payer." _GitHub EIPs_, March 9, 2026. [https://github.com/ethereum/EIPs/pull/11388](https://github.com/ethereum/EIPs/pull/11388)

<span id="fn-2">2.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Update motivation." _GitHub EIPs_, March 3, 2026. [https://github.com/ethereum/EIPs/pull/11372](https://github.com/ethereum/EIPs/pull/11372)

<span id="fn-3">3.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Update verifier gas and cross chain sigs." _GitHub EIPs_, March 4, 2026. [https://github.com/ethereum/EIPs/pull/11374](https://github.com/ethereum/EIPs/pull/11374)

<span id="fn-4">4.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Clear up naming and k1 behaviour." _GitHub EIPs_, March 7, 2026. [https://github.com/ethereum/EIPs/pull/11382](https://github.com/ethereum/EIPs/pull/11382)

<span id="fn-5">5.</span> Hunter, C. (@chunter-cb). "EIP-8130: Account Abstraction by Account Configurations." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8130](https://eips.ethereum.org/EIPS/eip-8130)

<span id="fn-6">6.</span> Biconomy. "Native Account Abstraction: State of Art and Pending Proposals Q1/26." _blog.biconomy.io_, 2026. [https://blog.biconomy.io/native-account-abstraction-state-of-art-and-pending-proposals-q1-26/](https://blog.biconomy.io/native-account-abstraction-state-of-art-and-pending-proposals-q1-26/)
