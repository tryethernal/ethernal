---
title: "Expire at Midnight: EIP-8130 Session Keys, Expiry, and Policy Gates"
description: "EIP-8130 builds session keys from three fields in one storage slot. How actor expiry, scope, and policy gates compose into a complete authorization primitive."
date: 2026-07-16
tags:
  - Account Abstraction
  - EIP-8130
  - Ethereum
  - DeFi
  - Glamsterdam
keywords: []
image: "/blog/images/eip-8130-session-keys-expiry-policy-gates.png"
ogImage: "/blog/images/eip-8130-session-keys-expiry-policy-gates-og.png"
status: published
readingTime: 7
---

A DeFi automation account authorizes a session key Monday morning. The key signs 200 rebalancing transactions through the week. Friday at midnight, it stops working: not because it was revoked, not because a contract rejected it, but because the protocol read `block.timestamp > expiry` from a storage slot and returned false. No transaction. No contract call. No gas spent.

This is how expiry works in EIP-8130. Not a contract-enforced rule you can forget to check. A storage slot field the node reads before running any EVM. The key expires. The protocol enforces it.

This is the sixth post in the EIP-8130 series. The [first covered cross-chain key sync and bundler-free architecture](https://tryethernal.com/blog/eip-8130-protocol-level-account-abstraction), the [second covered TX\_CONTEXT and phase atomicity](https://tryethernal.com/blog/eip-8130-execution-model-self-call-tx-context), the [third covered scope and permissionless payer](https://tryethernal.com/blog/eip-8130-owner-scope-permissionless-payer), the [fourth covered nonce channels and nonce-free execution](https://tryethernal.com/blog/eip-8130-2d-nonce-channels-nonce-free-execution), and the [fifth covered the default EOA and graduation path](https://tryethernal.com/blog/eip-8130-default-eoa-graduation-path). This post covers what none of them completed: session key construction, actor expiry, and policy gates.

## The actor_config slot, revisited

[Article 3](https://tryethernal.com/blog/eip-8130-owner-scope-permissionless-payer) covered the scope byte at position 20 of `actor_config`. What it didn't cover: bytes 21–26 hold a `uint48` Unix timestamp. Same slot, always read together.<sup>[1](#fn-1)</sup>

```
actor_config (32 bytes):
  [authenticator: 20 bytes] [scope: 1 byte] [expiry: 6 bytes] [reserved: 5 bytes]
```

Two checks run during the validation phase, before any EVM execution:

1. `scope & context_bit != 0`: the actor has permission for this context (covered in article 3)
2. `expiry == 0 || block.timestamp <= expiry`: the actor is not expired (new)

Both checks run. Both fail independently. An actor can have the right scope and an expired timestamp: it fails. An actor can have the wrong scope and a valid timestamp: it also fails. The only way a session key passes validation is if both conditions hold simultaneously.

One thing to distinguish: [article 5](https://tryethernal.com/blog/eip-8130-default-eoa-graduation-path) covered `default_eoa_expiry`, an inline field in the `account_state` slot for the implicit K1 path. That is per-account. The `actor_config` expiry is per-actor: each explicitly registered actor has its own expiry field. Different slot, different purpose, same enforcement semantics.

One subtlety: expired actors don't clean up automatically. The storage slot remains populated. A live admin can revoke an expired actor to reclaim storage rent or remove dead entries. Expiry is not deletion.

## Building a session key

Constructing a session key means calling `authorizeActor` with an authenticator, scope, and expiry. Here's a 24-hour DeFi bot key:

```javascript
const sessionKey = {
  actorId: keccak256(sessionPublicKey),
  authenticator: P256_AUTHENTICATOR,  // hardware key / passkey
  scope: SENDER | PAYER,              // 0x06
  expiry: Math.floor(Date.now() / 1000) + 86400,  // 24 hours
  policyData: "0x",
};
```

Two properties follow from this configuration worth calling out explicitly.

Without the CONFIG bit, the session key can't extend its own lifetime. It cannot modify account configuration, raise its own expiry, or register a replacement. When it expires, it's done.

Without the NONCE bit (0x10), the actor is restricted to `NONCE_KEY_MAX`. The NONCE bit (not covered in article 3, which stopped at CONFIG) controls whether an actor can use arbitrary nonce channels. Without it, the actor is limited to the nonce-free expiry mode from [article 4](https://tryethernal.com/blog/eip-8130-2d-nonce-channels-nonce-free-execution). That's exactly what most session keys want: no nonce tracking, parallel submission, replay protection via the `replay_id` mechanism, and automatic cleanup once the expiry timestamp passes. Including the NONCE bit lets the session key operate on numbered channels with explicit sequencing, useful for ordered automation workflows, but most short-lived session keys don't need it.

### Three session key archetypes

The combination of scope bits and expiry produces three common patterns.

Trading bot key: `SENDER | PAYER` (0x06), 8-hour window, no policy gate, NONCE_KEY_MAX default. A hot key for a high-frequency DeFi bot. Expires at end of session. No target restriction means it can call any contract the account authorizes. The short window limits blast radius if the signing key is compromised.

Gasless signer: `SIGNATURE` (0x01), 7-day window, no policy gate. A browser extension key for off-chain permit signing. It cannot initiate transactions or pay gas. It can only produce ERC-1271 signatures, valid for permit-style authorizations, off-chain orders, and cross-chain message attestations. Useless to an attacker who wants to move funds.

Subscription payment key: `SENDER | PAYER | POLICY` (0x26), 30-day window, policy-gated to one allowance contract. This pattern requires a separate section.

## Policy gates: the POLICY bit

The POLICY bit (0x20) is different from the other scope bits. It doesn't narrow which context the actor is valid for. It adds a call-target constraint enforced before call dispatch: a protocol-level gate that runs before any EVM execution reaches the target contract.

When POLICY is set in scope, two additional slots are written alongside `actor_config`:<sup>[1](#fn-1)</sup>

- `policy_manager(account, actorId)` → address , the single allowed call target
- `policy_commitment(account, actorId)` → bytes32 , signed, opaque policy parameters

Authorization looks like this:

```javascript
const policyData = encodePacked(
  allowanceManager,  // 20 bytes: the one allowed target
  policyCommitment   // 32 bytes: parameters the manager will read back
);

const subscriptionKey = {
  actorId: keccak256(botPublicKey),
  authenticator: P256_AUTHENTICATOR,
  scope: SENDER | PAYER | POLICY,    // 0x26
  expiry: now + 30 * 86400,
  policyData,
};
```

Protocol enforcement runs before call dispatch:

```
if (scope & POLICY != 0):
    require(call.to == policy_manager(account, actorId))
    // reverts with ActorPolicyViolation if target doesn't match
```

If the session key tries to call any contract other than `allowanceManager`, the protocol rejects the call with `ActorPolicyViolation`. No EVM execution starts. No gas is consumed beyond intrinsic costs.

When the call does reach `allowanceManager`, the contract reads `getPolicy(account, actorId)` to retrieve the commitment, then applies its own validation: is this within the 5 USDC/month budget? Is the recipient allowlisted? Is the cooldown period still active?

This is the design boundary the spec draws deliberately: **the protocol handles the gate, the manager handles the rules, the commitment is the link**. The commitment is signed at authorization time, stored by the protocol, retrieved by the manager. Neither the protocol nor the session key can change it without revoking and re-authorizing. The rules are locked in at registration.

One comparison worth making: in ERC-4337, target and spending validation runs inside `validateUserOp` , application code the wallet controls, subject to bugs and missed edge cases.<sup>[2](#fn-2)</sup> EIP-8130's single-target gate is a consensus-level result. A wrong target is a protocol failure. It doesn't touch wallet code at all.

## Cross-chain session keys

When a config change carries `chainId = 0`, the session key is authorized simultaneously on every EIP-8130 chain. One signed operation. No per-chain gas. The key becomes valid on mainnet, Base, Arbitrum, and OP after a single transaction.<sup>[1](#fn-1)</sup>

Expiry enforces independently on each chain. A key that expires at Unix timestamp 1785600000 expires at that moment everywhere , each chain's `block.timestamp` determines the cutoff without coordination.

The `multichain_sequence` counter prevents the authorization operation from replaying twice on the same chain. Each chain tracks its own counter; applying the op increments it; a duplicate submission fails the sequence check.

One operational note: if an attacker intercepts the signed authorization and submits it before you do, the sequence mismatch blocks your legitimate submission. When cross-chain sync isn't needed, use `chainId = block.chainid` to scope the authorization to a single chain.

## What session key failures look like

Three distinct failure modes, three distinct trace footprints.

**Expired actor.** Validation phase. The protocol reads `actor_config` via SLOAD. Timestamp check: `block.timestamp > expiry`. Rejected. No contract called. No EVM execution. The trace shows a single storage read and a validation-layer termination , not a revert, not an out-of-gas failure. A stopped validation phase.

**Scope violation.** Validation phase. Same SLOAD, same slot. The scope bit check fails: the actor exists and the expiry is valid, but the required context bit isn't set. Same outcome: no EVM execution, validation-layer rejection. This is what happens when a SIGNATURE-only key attempts to initiate a transaction.

**Policy violation.** Call dispatch phase. `actor_config` loads successfully , scope and expiry both pass. The protocol reads `policy_manager` from its slot. `call.to != policy_manager`. The protocol emits `ActorPolicyViolation(actorId, target)` and reverts. This is a consensus-level revert: the current phase rolls back, later phases are skipped, and committed phases from earlier in the transaction persist , the two-phase model from [article 2](https://tryethernal.com/blog/eip-8130-execution-model-self-call-tx-context).

In Ethernal, the first two failures appear as validation-phase terminations with no call frame , the trace ends before any EVM opcode executes. The third has a call frame that opens and aborts at the target-check step, before the target contract's code runs. `ActorPolicyViolation` is not a Solidity revert , it carries no ABI-encoded error data and won't decode as a named error in a standard revert trace. Knowing the difference matters for debugging: the first two failures indicate the actor config needs fixing; the third indicates the call target is wrong.

## The session key as a composition

Session keys in EIP-8130 compose from three fields in one storage slot: authenticator, scope, expiry. Add a fourth layer , the policy gate , by setting the POLICY bit and writing two more slots. The protocol enforces scope at the context check, expiry at the timestamp check, and the single-target gate at call dispatch. Three separate enforcement points. No contract code required for any of them.

The flexibility lives in the policy manager. The security lives in the protocol. That line is deliberate: what the key can do (scope + expiry) is consensus-enforced; what the allowed contract does with the call is application logic.

The next natural piece: building a compliant policy manager that reads `getPolicy()` and enforces spending limits, allowlists, and cooldowns , or the LOCK mechanism for emergency account protection when actors need to be frozen faster than a revocation transaction can confirm.

---

## References

<span id="fn-1">1.</span> Hunter, C. (@chunter-cb). "EIP-8130: Account Abstraction by Account Configurations." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8130](https://eips.ethereum.org/EIPS/eip-8130)

<span id="fn-2">2.</span> Buterin, V., et al. "ERC-4337: Account Abstraction Using Alt Mempool." _Ethereum Improvement Proposals_, 2021. [https://eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337)

<span id="fn-3">3.</span> Hunter, C. "Update EIP-8130: Enable permissionless payer." _GitHub_, March 9, 2026. [https://github.com/ethereum/EIPs/pull/11388](https://github.com/ethereum/EIPs/pull/11388)

<span id="fn-4">4.</span> Base. "EIP-8130 Reference Implementation." _GitHub_, 2026. [https://github.com/base/eip-8130](https://github.com/base/eip-8130)
