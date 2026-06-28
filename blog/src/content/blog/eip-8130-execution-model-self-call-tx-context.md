---
title: "Who Called You? EIP-8130's Self-Call Model, TX_CONTEXT, and Phase Atomicity"
description: "EIP-8130 makes msg.sender the actual user, not EntryPoint. Here's what TX_CONTEXT, phase atomicity, and policy gates mean for contract authors."
date: 2026-06-28
tags:
  - Account Abstraction
  - EIP-8130
  - Ethereum
  - Solidity
  - Security
keywords: []
image: "/blog/images/eip-8130-execution-model-self-call-tx-context.png"
ogImage: "/blog/images/eip-8130-execution-model-self-call-tx-context-og.png"
status: published
readingTime: 7
---

EIP-8130 restores `msg.sender` to the user's actual address, solving ERC-4337's EntryPoint problem. But contract authors need three new mental models: who pays gas (TX\_CONTEXT), which phase just ran (phase atomicity), and which key signed (actorId). Here's what each one means in practice.

A Solidity developer adds a guard to their vault:

```solidity
require(msg.sender == expectedUser, "unauthorized");
```

On ERC-4337, this check fails for every AA user. The EntryPoint contract is `msg.sender`. The developer wraps it in a bundler-detection branch. The contract ships. Then they deploy on a chain that runs EIP-8130. The check passes: `msg.sender` is the user's actual account address.

Problem solved? Not quite.

In Phase 2 of the same transaction, a DeFi router the user interacted with in Phase 1 calls the vault. `msg.sender` is still the user's account , because EIP-8130 executes all calls as self-calls. The authorization check passes. But the user didn't initiate this call directly, and the vault doesn't know that.

Identity in account abstraction is more complicated than "who is `msg.sender`."

## Why ERC-4337 made msg.sender the wrong address

ERC-4337 had no choice: without a protocol change, every AA transaction routes through a shared EntryPoint contract, making the EntryPoint the `msg.sender` for all AA calls rather than the actual user, breaking every existing identity check.<sup>[4](#fn-4)</sup>

ERC-4337 achieved account abstraction without a protocol change. That constraint had a cost: in every AA transaction, `msg.sender` is the EntryPoint contract (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`), not the user.

Every Solidity pattern that checks `msg.sender == user` silently breaks for AA users. The workaround is explicit and invasive:

```solidity
address constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

function deposit(uint256 amount) external {
    address sender;
    if (msg.sender == ENTRY_POINT) {
        sender = IEntryPoint(ENTRY_POINT).getUserOpSender(); // unwrap
    } else {
        sender = msg.sender; // direct call
    }
    balances[sender] += amount;
}
```

Contracts must opt-in to understanding AA. Protocols that skip the unwrapping are silently unusable from AA wallets , the user sees a generic revert with no explanation.

EIP-8130, written with the luxury of a protocol change, takes a different position on what `msg.sender` should be.<sup>[1](#fn-1)</sup>

## The self-call inversion

EIP-8130 fixes the identity problem at the protocol level: all calls execute as self-calls, so `msg.sender` is always the user's account address with no intermediary.<sup>[5](#fn-5)</sup>

As C. Hunter writes in the EIP-8130 specification: "The principal limitation of ERC-4337 is that it cannot modify the `msg.sender` field: the EntryPoint contract becomes the sender for all AA transactions. This proposal resolves the limitation by encoding account identity at the protocol level."<sup>[1](#fn-1)</sup>

In an EIP-8130 AA transaction, all calls execute as self-calls. The identity relationship during execution is:

```
to == msg.sender == tx.origin == sender_address
```

The user's account is the executing context. The protocol sets up the call such that the account is simultaneously the caller and the callee , which is how "the account calls a contract on its own behalf" works at the EVM level.

The consequence for contract authors is direct:

```solidity
// EIP-8130: msg.sender IS the user , no unwrapping needed
function deposit(uint256 amount) external {
    balances[msg.sender] += amount;
}
```

No EntryPoint check. No unwrapping. The pattern you'd write for a regular EOA just works for an AA account. Contracts that avoided ERC-4337 because of the `msg.sender` complexity can adopt EIP-8130 chains without auditing every caller check.

This is only possible because EIP-8130 is a protocol change. ERC-4337 had to route through a user-space EntryPoint contract to avoid touching consensus clients. The EntryPoint as `msg.sender` was the price of doing AA without a hard fork. EIP-8130 pays the fork cost and recovers the natural identity model.

The tradeoff: EIP-8130 authentication is bounded. Accounts register verifiers , K1, P256, WebAuthn, delegate , from a defined set.<sup>[2](#fn-2)</sup> There is no arbitrary validation code at the protocol layer (EIP-8141 takes that path instead). But within that constraint, execution is fully programmable.

## But who's paying? The TX_CONTEXT precompile

When sender and gas payer can be different addresses, the `TX_CONTEXT_ADDRESS` precompile gives contracts immutable, per-transaction metadata to tell them apart , per the EIP-8130 spec.

If `msg.sender` is always the user's account, how does a contract distinguish the sender from the gas payer? In EIP-8130, these can be different addresses: a protocol subsidy, a gasless relay, a third-party sponsor.<sup>[3](#fn-3)</sup>

The answer is the `TX_CONTEXT_ADDRESS` precompile. It provides immutable transaction metadata during call execution , not during validation, only during execution:

```solidity
interface ITxContext {
    function getTransactionSender() external view returns (address);
    function getTransactionPayer() external view returns (address);
    function getTransactionSenderActorId() external view returns (bytes32);
}

address constant TX_CONTEXT = /* TX_CONTEXT_ADDRESS from spec */;
```

Three reads, each serving a distinct purpose:

- `getTransactionSender()` , the account that signed the transaction
- `getTransactionPayer()` , the account paying gas (may differ from sender)
- `getTransactionSenderActorId()` , which registered key or device authorized this transaction

Gas cost: 3 gas per 32 bytes of output.<sup>[1](#fn-1)</sup> The protocol holds this data in memory for the transaction lifetime, so population cost is zero.

A vault that only accepts self-funded deposits can now enforce that explicitly:

```solidity
function deposit(uint256 amount) external {
    ITxContext ctx = ITxContext(TX_CONTEXT);
    address payer = ctx.getTransactionPayer();
    bytes32 actorId = ctx.getTransactionSenderActorId();

    // Reject sponsored deposits , only sender-funded deposits allowed
    require(payer == msg.sender, "no sponsored deposits");

    // Record which device signed this deposit for audit
    emit DepositWithActor(msg.sender, actorId, amount);
    balances[msg.sender] += amount;
}
```

The `actorId` field opens a layer of granularity that ERC-4337 never exposed. An account can register multiple actors , a hardware security key, a browser session key, a scheduled automation bot , each identified by a `bytes32` actorId. `getTransactionSenderActorId()` tells you which one signed the current transaction. This enables per-device audit logs, key-level analytics, and access controls that are meaningful in security postmortems: "the session key signed this withdrawal, not the hardware key."

## Phase atomicity: two levels, different rules

EIP-8130 replaces all-or-nothing revert semantics with per-phase atomicity: each phase commits independently, and a later phase reverting does not undo earlier ones.<sup>[1](#fn-1)</sup>

Standard Ethereum: if anything reverts, everything reverts. The entire state delta rolls back.

EIP-8130 has a different model. Calls are structured as a two-level array:<sup>[1](#fn-1)</sup>

```javascript
// Wallet SDK pseudocode , three-phase transaction
const tx = {
  calls: [
    // Phase 0: approve tokens (atomic unit)
    [{ to: TOKEN, data: approve(BRIDGE, amount) }],
    // Phase 1: bridge to L2 (persists even if Phase 2 fails)
    [{ to: BRIDGE, data: bridgeTokens(amount, destChain) }],
    // Phase 2: stake on destination (can fail independently)
    [{ to: YIELD, data: stake(amount) }],
  ]
};
```

Within a phase, all calls in the inner array succeed or the entire phase reverts, rolling back that phase's state changes. Between phases, completed state changes survive even if a later phase reverts.

Walk through the example: Phase 0 approves. Phase 1 bridges. Phase 2 tries to stake, but the yield protocol is paused , revert. The user's tokens are on L2, not staked. Phase 0 and Phase 1 are permanent. This is not a failed transaction in any traditional sense.

This is a designed feature, not an oversight. Long multi-step operations don't need a single massive revert surface. A partial failure in Phase 3 doesn't undo Phase 0 and Phase 1, which may have required independent coordination to complete.

But it changes the safety assumptions DeFi protocols can make. "If my function is executing, all the setup is complete" is not necessarily true in a multi-phase world. A contract that expects tokens to be approved and bridged atomically may be called with the bridge step complete but a dependent step from a different phase having failed.

For auditors, each phase is its own atomicity domain. Cross-phase invariants require explicit checks, not implicit revert-on-failure assumptions. A contract that reads state written by Phase 0 during Phase 2 execution is implicitly depending on cross-phase ordering , and needs to verify that the expected Phase 1 state is present, not assume it.

The receipt format surfaces this directly. EIP-8130 adds a `phaseStatuses` array to the transaction receipt , one status entry per phase. A three-phase transaction where Phase 2 fails shows `[success, success, reverted]`. A block explorer that renders "reverted" for this transaction is wrong about what happened. Each phase needs its own status badge.

## Policy gates: constraining actors to one target

Policy gates provide protocol-level enforcement that a given actor can only call one specific contract , no smart contract audit required to verify the restriction is in place.<sup>[1](#fn-1)</sup>

Scope bits in `ActorConfig` control what an actor can do: send transactions, pay gas, modify configuration, sign messages. But scope doesn't limit which contracts an actor can interact with.

Policy gates do. When an actor's `policyType != 0x00`, its configuration requires two additional slots: a `policy_commitment` and a `policy_manager` address.<sup>[1](#fn-1)</sup> That actor can only call `to == policy_manager`. Any other target triggers `ActorPolicyViolation(actorId, to)` and the transaction fails at the protocol level.

A session key for a gaming dApp: `scope = SENDER`, `policy_manager = GAME_CONTRACT`. The session key can transact from the account but only with the game contract. It cannot drain tokens to an arbitrary address. The constraint is enforced by the protocol. No smart contract audit required to verify the restriction is in place.

A DCA automation bot: `scope = SENDER`, `policy_manager = DEX_CONTRACT`. The bot can send transactions from the account, but only to the designated DEX. Scope says what it can do. Policy says where.

Combined, they describe a minimal-privilege actor with meaningful protocol-level enforcement. A session key with `scope = SENDER` and a policy locked to one DEX is categorically safer than a session key with unrestricted target access, and that safety does not depend on the called contract implementing any checks.

`ActorPolicyViolation` events matter for block explorers. When an AA transaction fails with a policy violation, the revert trace alone doesn't explain why , the constraint lives in the account configuration, not in the callee contract. The event provides the full picture: which actor, which attempted target, why the protocol rejected it.

## What changes in practice

### For contract authors on EIP-8130 chains

- Use `msg.sender` for identity. It's the real user address , no EntryPoint unwrapping.
- Use `TX_CONTEXT.getTransactionPayer()` for gas attribution. Sender and payer may differ.
- Use `TX_CONTEXT.getTransactionSenderActorId()` when the signing key matters , hardware vs. session key, scheduled automation vs. manual approval.
- Don't assume cross-phase atomicity. If your protocol's invariants depend on earlier steps having completed, check for that state explicitly.

**For block explorers:**

- Parse `phaseStatuses[]` and render per-phase outcomes. A single success/failure flag is wrong for multi-phase transactions.
- Display `payer` and `sender` as distinct fields when they differ , this is the difference between "who submitted" and "who paid" for every sponsored transaction.
- Index `ActorAuthorized`, `ActorRevoked`, and `ActorPolicyViolation` events. These are the accountability trail for AA accounts.
- Show `actorId` in the trace view, mapped to the authenticator type. A withdrawal signed by a session key looks identical to one signed by a hardware key in the call trace , the actorId distinguishes them.

Ethernal's decoded event view and transaction trace are built to surface exactly this kind of execution detail. AA-aware rendering , per-phase status, payer vs. sender separation, actor resolution , is the natural evolution of what's already there.

## The gap between msg.sender and the full picture

The self-call model delivers on `msg.sender == user`. The remaining complexity , who pays, which key signed, which phases committed , is now explicit in TX_CONTEXT and the phase model, where it is inspectable and protocol-enforced.

Return to the opening scenario. On EIP-8130, `require(msg.sender == expectedUser)` passes , the self-call model delivers on that. The ERC-4337 bundler problem is gone.

But `msg.sender` alone doesn't tell you: was this a hardware key or a session key? Is a sponsor paying gas, and does your protocol care? Did earlier phases complete successfully, and does your invariant depend on them?

EIP-8130's execution model is cleaner than ERC-4337's for contract authors who don't want to think about bundlers. The complexity hasn't been eliminated , it's been redistributed into TX_CONTEXT and the phase model, where it's at least explicit, inspectable, and protocol-enforced rather than buried in bundler infrastructure.

---

## References

<span id="fn-1">1.</span> Hunter, C. (@chunter-cb). "EIP-8130: Account Abstraction by Account Configurations." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8130](https://eips.ethereum.org/EIPS/eip-8130)

<span id="fn-2">2.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Clear up naming and k1 behaviour." _GitHub EIPs_, March 7, 2026. [https://github.com/ethereum/EIPs/pull/11382](https://github.com/ethereum/EIPs/pull/11382)

<span id="fn-3">3.</span> Hunter, C. (@chunter-cb). "Update EIP-8130: Enable permissionless payer." _GitHub EIPs_, March 9, 2026. [https://github.com/ethereum/EIPs/pull/11388](https://github.com/ethereum/EIPs/pull/11388)

<span id="fn-4">4.</span> Biconomy. "Native Account Abstraction: State of Art and Pending Proposals Q1/26." _blog.biconomy.io_, 2026. [https://blog.biconomy.io/native-account-abstraction-state-of-art-and-pending-proposals-q1-26/](https://blog.biconomy.io/native-account-abstraction-state-of-art-and-pending-proposals-q1-26/)

<span id="fn-5">5.</span> Base. "EIP-8130 Reference Implementation." _GitHub_, 2026. [https://github.com/base/eip-8130](https://github.com/base/eip-8130)
