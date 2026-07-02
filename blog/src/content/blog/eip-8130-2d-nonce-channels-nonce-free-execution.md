---
title: "Lanes, Not Lines: EIP-8130's 2D Nonce Channels and Nonce-Free Mode"
description: "EIP-8130 replaces the single nonce counter with independent parallel channels and a nonce-free expiry mode. Here's how nonce_key and replay_id work."
date: 2026-07-02
tags:
  - Account Abstraction
  - EIP-8130
  - Ethereum
  - DeFi
keywords: []
image: "/blog/images/eip-8130-2d-nonce-channels-nonce-free-execution.png"
ogImage: "/blog/images/eip-8130-2d-nonce-channels-nonce-free-execution-og.png"
status: published
readingTime: 7
---

EIP-8130 replaces Ethereum's single nonce counter with independent parallel channels (`nonce_key`) and a nonce-free expiry mode (`replay_id`), eliminating the coordination bottleneck where one failed transaction stalls every subsequent operation from the same account.

A DeFi automation account submits three transactions in the same block: claim pending staking rewards, swap those rewards to ETH, bridge ETH to an L2 vault. Three independent operations. Three nonces: n, n+1, n+2.

The reward claim has nothing to claim today. It reverts. The swap and bridge never land , the wallet client holding nonces n+1 and n+2 sees "nonce too low" errors and drops them. The bot stalls for 12 seconds, misses the target block, and someone else captures the arbitrage. The reward claim failed, so everything downstream failed with it, even though the swap and bridge had no logical dependency on rewards at all.

This is the sequential nonce problem: all transactions from a single account are chained. One failure blocks the queue.

This is the fourth post in the EIP-8130 series. The [first covered cross-chain key sync and the bundler-free architecture](https://tryethernal.com/blog/eip-8130-protocol-level-account-abstraction). The [second covered TX\_CONTEXT, phase atomicity, and policy gates](https://tryethernal.com/blog/eip-8130-execution-model-self-call-tx-context). The [third covered the owner scope model and permissionless payer](https://tryethernal.com/blog/eip-8130-owner-scope-permissionless-payer). This post covers what none of them touched: the nonce system.

## Why sequential nonces are a coordination bottleneck

Ethereum's current model assigns each account a single counter. Every transaction increments it by one, and nodes reject any transaction whose nonce doesn't match the current counter exactly. This guarantees ordering: nonce n must confirm before nonce n+1 is valid.

That guarantee is the problem. Even if two transactions are logically independent , a reward claim and a token bridge , they are ordered because they share an address. Any pending transaction blocks all later ones from the same sender.

ERC-4337 introduced a partial workaround: encoding a key in the upper 192 bits of the `nonce` field and a sequence in the lower 64 bits.<sup>[2](#fn-2)</sup> Different keys create independent ordering lanes. But the encoding is a convention, not a protocol feature. Bundlers coordinate within their bundles to honor the multi-lane semantics. "Nonceless and 2D nonce transactions remove coordination overhead for parallel processing."<sup>[3](#fn-3)</sup> ERC-4337's implementation of that idea still depends on bundler-level coordination. Nonce-free execution doesn't exist at the protocol level. Replay protection in nonceless modes relies on bundler checks, not consensus state.

EIP-8130 treats parallel lanes as a first-class protocol concept.

## How nonce channels work in EIP-8130

EIP-8130's AA transaction type (`0x7B`) replaces the single `nonce` field with two distinct typed fields: `nonce_key` and `nonce_sequence`.<sup>[1](#fn-1)</sup>

```
AA_TX_TYPE || rlp([
  chain_id, sender, nonce_key, nonce_sequence, expiry,
  max_priority_fee_per_gas, max_fee_per_gas, gas_limit,
  account_changes, calls, metadata,
  payer, sender_auth, payer_auth
])
```

`nonce_key` selects the channel. `nonce_sequence` is the counter within that channel. The protocol stores a separate sequence counter for each `(sender, nonce_key)` pair in `ACCOUNT_CONFIG_ADDRESS`. Channels are completely independent: advancing the counter on channel 1 has no effect on channel 0.

| `nonce_key` value | Mode | Behavior |
|---|---|---|
| `0` | Sequential | Same as today's EOA model |
| `1` to `NONCE_KEY_MAX - 1` | Parallel | Independent counter per channel |
| `NONCE_KEY_MAX` | Nonce-free | No counter read or incremented |

The DeFi bot scenario from the hook maps cleanly onto channels:

```
Channel 0: swap operations   (sequential, predictable ordering)
Channel 1: reward claims     (fire when available, no ordering dependency)
Channel 2: bridge operations (independent of both)
```

Submit all three in the same block. The reward claim on channel 1 reverts. Channels 0 and 2 are unaffected , their sequence counters are separate state. The swap and bridge land.

Each channel counter is stored in its own slot. The first transaction on a new channel costs **22,100 gas** to initialize , a cold SSTORE for the new counter. Subsequent transactions on that channel pay the normal nonce check cost. There is no protocol limit on the number of channels per account beyond `NONCE_KEY_MAX`.<sup>[1](#fn-1)</sup>

The real difference from ERC-4337: channel initialization is a protocol-level state write. The node tracks which channels are active as consensus state, not as a mapping in a shared user-space contract. No bundler needs to coordinate which lanes are live or what sequence they're at.<sup>[2](#fn-2)</sup>

## The nonce-free mode

Setting `nonce_key = NONCE_KEY_MAX` opts into a different execution model entirely: no sequence counter is read, and none is incremented.

Two constraints apply:<sup>[1](#fn-1)</sup>

1. `nonce_sequence` must be `0`
2. `expiry` must be non-zero (a mandatory TTL)

Without a sequence counter, replay protection uses a content-derived identifier:

```
replay_id = keccak256(resolved_sender || sender_signature_hash)
```

`sender_signature_hash` covers the transaction content, excluding the auth blobs. `resolved_sender` substitutes the actual sender address for EOA paths where the `sender` field is empty.

The "signature-invariant" property matters here. Different `payer_auth` values (different payer signatures for the same transaction content) produce the same `replay_id`. ECDSA malleability and payer substitution cannot generate a new valid `replay_id` for a transaction that has already been spent. The `replay_id` is bound to what the transaction does, not to who paid for it.

The node records each spent `replay_id`. A second submission of the same transaction content hits a `replay_id` collision and is rejected.

Why is `expiry` mandatory? Without it, every nonce-free transaction adds permanent state to the node. With `expiry`, the node knows exactly when a `replay_id` becomes irrelevant , no valid transaction with that content can exist after the timestamp. Spent IDs can be pruned after expiry, keeping the replay set bounded.

This makes expiring intents practical without any supporting contract:

- User signs a gasless order valid until timestamp T
- Relayer submits it anytime before T
- A second submission hits the spent `replay_id` and fails
- After T, the node prunes the entry

This is different from a Permit2 or EIP-712 permit. Those structures authorize a contract to act on the user's behalf. The nonce-free transaction is the execution itself , the on-chain operation expires, not a permission to perform it. There is no `nonce` gap left in the account state when a nonce-free transaction expires unused. No cleanup, no stuck counter, no replacement transaction needed.

## What this changes for protocol authors

The new sequencing model introduces distinct failure modes that require different responses.

Standard Ethereum has one sequencing failure: the nonce doesn't match the current counter. Fix: query the current nonce and resubmit.

EIP-8130 has three:

| Failure | Cause | Fix |
|---|---|---|
| Wrong `nonce_sequence` on channel N | Counter mismatch on that channel | Query the current sequence for that specific channel |
| `replay_id` already spent | Nonce-free tx submitted twice | Do not resubmit; the content hash is permanently spent |
| `replay_id` expired | Nonce-free tx submitted after TTL | Resign the transaction with a new `expiry` |

Each requires a different intervention. A wallet that retries all sequencing failures with an incremented counter will corrupt channel state or waste gas on permanently expired content hashes.

For multi-step automation, channels eliminate much of the nonce choreography that makes high-frequency bots complex today. A DCA bot operates on channel 1 at daily frequency. The user's manual operations use channel 0. Bot transactions can't be blocked by a pending operation on channel 0 because the two channels are independent state. No nonce prediction, no gap filling, no "replace by fee on the wrong slot" failures.<sup>[3](#fn-3)</sup>

EIP-8130 resolves this at the protocol level: each `nonce_key` has its own independent counter, initialized at 22,100 gas on first use, and channels never block each other.<sup>[1](#fn-1)</sup>

## What this looks like in a block explorer

A transaction with `nonce_key = 3, nonce_sequence = 14` is fundamentally different from one with `nonce_key = 0, nonce_sequence = 47`. Displaying only the sequence number is as incomplete as a file path without the directory.

In Ethernal, both fields appear as first-class metadata in the transaction view. The pending queue shows per-channel state for each account: channel 0 at sequence 47, channel 3 at sequence 14, each a separate queue. A transaction waiting for `nonce_sequence = 15` on channel 3 doesn't appear to block the rest of the account's activity , because it doesn't.

Nonce-free transactions have no channel. Their trace shows a `replay_id` instead of a `(channel, sequence)` pair. A failure on nonce-free submission renders as "replay\_id already spent" rather than "nonce mismatch" , operationally distinct events that require different fixes.

The validation phase from Article 2 surfaces the failure point exactly. A transaction that fails nonce validation fails before phase execution begins. The trace terminates at the nonce check step, before any call is dispatched. Not a contract revert, not an out-of-gas failure , a validation-layer rejection tied to sequencing state. The failure type in the trace is the diagnostic.

## The complete constraint set

The four EIP-8130 articles cover a layered constraint model:

- **Keys** (Article 1): which authenticators are registered , K1, P256, WebAuthn, delegate
- **Scope** (Article 3): what each key is authorized to do , SENDER, PAYER, CONFIG, SIGNATURE
- **Policy** (Article 2): which contracts each actor can target
- **Ordering** (this article): which nonce channel each actor uses

A maximally constrained DCA bot key: SENDER scope, policy locked to one DEX contract, operating on channel 1. It can only send transactions, only to the designated DEX, only on channel 1 , whose sequence counter is independent of every other operation on the account. The protocol enforces all four constraints independently, before any EVM execution.

The nonce channels complete the "minimal authority" principle at the sequencing level. You can restrict not just what a key can do and where it can call, but also which ordering lane it belongs to. A compromised bot key doesn't stall the user's manual operations. A stalled manual operation doesn't block the bot. The independence is structural, not a matter of careful scheduling.

---

## References

<span id="fn-1">1.</span> Hunter, C. (@chunter-cb). "EIP-8130: Account Abstraction by Account Configurations." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8130](https://eips.ethereum.org/EIPS/eip-8130)

<span id="fn-2">2.</span> Buterin, V., et al. "ERC-4337: Account Abstraction Using Alt Mempool." _Ethereum Improvement Proposals_, 2021. [https://eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337)

<span id="fn-3">3.</span> EIP-8130 project site. "EIP-8130 Overview." _eip8130.com_, 2026. [https://www.eip8130.com/](https://www.eip8130.com/)
