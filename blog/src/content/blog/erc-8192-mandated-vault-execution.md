---
title: "The Mandate Pattern: Bounded Execution Authority for ERC-4626 Vaults"
description: "ERC-8192 fills the gap ERC-4626 left open: how to delegate vault execution to AI agents and solvers without giving up risk control."
date: 2026-03-26
tags:
  - DeFi
  - ERC-4626
  - Smart Contracts
  - Security
  - Solidity
image: "/blog/images/erc-8192-mandated-vault-execution.png"
ogImage: "/blog/images/erc-8192-mandated-vault-execution-og.png"
status: published
readingTime: 7
---

A strategy vault gives an AI solver a signed instruction: rebalance between these six adapters, don't lose more than 3% of assets. The solver executes. Somewhere in a chain of six internal calls, one adapter drains 40% of vault assets into a flash loan. The vault has no circuit breaker. The only defense was the solver's off-chain reputation.

This is the structural gap ERC-8192 closes. Not with better intent expression, but with an on-chain authority framework that enforces risk parameters at execution time, independently of who the executor is.

## The gap ERC-4626 left open

ERC-4626 standardized vault accounting: deposit, withdraw, redeem, `totalAssets`.<sup>[1](#fn-1)</sup> It has been wildly successful. Hundreds of protocols implement it, from Aave to Yearn to EigenLayer restaking vaults.

What it did not standardize: how vault assets can be acted upon by third-party executors.

Adjacent standards don't fill this gap either. ERC-7741 covers operator authorization but says who can act, not what they can do or under what risk constraints. ERC-7710 provides delegation plumbing without enforcement. ERC-7521 and ERC-7683 address the intent and order expression layer, not execution enforcement. Closed implementations exist: Sommelier's Strategist model, Enzyme's fund management interface, Brahma's SubAccount system. None are standard interfaces.

The missing primitive is a way to grant **bounded execution authority**. The executor can call these specific adapters, within these risk parameters, for this time window, and the vault enforces those limits at execution time without trusting the executor.

## The mandate structure

ERC-8192, proposed by Tabilabs,<sup>[2](#fn-2)</sup> introduces the `Mandate` struct as the unit of authority. A mandate is not an instruction. It is an authorization envelope: a description of what the holder is permitted to do and under what constraints.

```solidity
struct Mandate {
    address executor;                    // 0 = any caller (requires payloadDigest)
    uint256 nonce;
    uint48 deadline;
    uint64 authorityEpoch;               // must match vault's current epoch
    uint16 maxDrawdownBps;               // per-execution loss limit (0–10000)
    uint16 maxCumulativeDrawdownBps;     // rolling epoch high-water mark limit
    bytes32 allowedAdaptersRoot;         // Merkle root of (adapter, codehash) pairs
    bytes32 payloadDigest;               // if nonzero: keccak256(abi.encode(actions))
    bytes32 extensionsHash;              // keccak256(extensions)
}
```

Each field does specific work.

The `executor` and `payloadDigest` fields control who can use this mandate and, optionally, exactly what they can do with it. Set `executor = address(0)` for open mandates any solver can pick up, but only when `payloadDigest` is non-zero. The digest forces the executor to commit to a specific action list before execution. Without that commitment, open mandates would let any party execute arbitrary adapters against the vault.

The `deadline` and `nonce` provide time bounds and replay protection. The vault also tracks a `nonceThreshold`. Any nonce below the threshold is invalid, letting the authority invalidate all outstanding mandates at once via `invalidateNoncesBelow()`.

`authorityEpoch` prevents stale mandates from surviving strategy changes. When the authority calls `resetEpoch()`, all mandates issued under prior epochs become invalid atomically. A vault rotating its adapter set can be sure no outstanding mandate still authorizes the old configuration.

`allowedAdaptersRoot` is a Merkle root of permitted `(adapter, codehash)` pairs. Execution requires proving each called adapter is in the allowlist, with matching bytecode. Why codehash matters is covered in the next section.

`maxDrawdownBps` and `maxCumulativeDrawdownBps` are risk limits in basis points. The per-execution limit bounds a single mandate. The cumulative limit tracks rolling losses across all executions within an epoch.

Mandates are EIP-712 typed structured data,<sup>[3](#fn-3)</sup> compatible with standard wallet signing flows and ERC-1271 smart contract signatures.<sup>[4](#fn-4)</sup> The same signing interface used by multisigs, Safes, and smart wallets works here.

## The execution safety envelope

The `execute()` function is not a dispatcher. It is a safety envelope.

```solidity
interface IERC8192MandatedVault /* is IERC4626, IERC165 */ {
    function execute(
        Mandate calldata mandate,
        Action[] calldata actions,
        bytes calldata signature,
        bytes32[][] calldata adapterProofs,
        bytes calldata extensions
    ) external returns (uint256 preAssets, uint256 postAssets);
}
```

Three interlocking mechanisms enforce the envelope. Each is insufficient alone. Together they close the attack surface.

### Merkle adapter verification

Before any action is executed, the vault verifies each target adapter against the `allowedAdaptersRoot`. The Merkle leaf structure is:

```solidity
keccak256(abi.encode(adapter, adapter.codehash))
```

The codehash binding is the critical security property. Without it, a vault operator could allowlist an adapter contract, then upgrade that adapter's logic via a proxy to extract assets. The Merkle proof verifies the adapter's bytecode at execution time, not just its address. This is why upgradeable proxies must not be allowlisted in the Core profile: the codehash pins the proxy bytecode, not the implementation behind it.

### Circuit breaker

The vault snapshots `totalAssets()` before and after execution:

```
preAssets = totalAssets()
// ... CALL each adapter sequentially ...
postAssets = totalAssets()

// Revert if:
(preAssets - postAssets) * 10000 > preAssets * maxDrawdownBps
```

The circuit breaker makes no assumptions about what happened internally. It doesn't care how many adapters were called, which protocols were touched, or what tokens moved. The only question: did the vault exit execution with at least `(1 - maxDrawdownBps/10000)` of its entry assets?

One non-obvious constraint: `execute()` must block reentrant calls to `deposit()` and `withdraw()` during execution. If adapters could trigger deposits mid-execution, new capital entering the vault would contaminate the `totalAssets()` snapshot and make the circuit breaker meaningless.

### Epoch cumulative accounting

The circuit breaker bounds a single execution. The epoch drawdown check bounds cumulative losses across all executions within an epoch.

The vault maintains `epochAssets` as a high-water mark. After each execution, if `postAssets > epochAssets`, the mark rises. If cumulative losses exceed `maxCumulativeDrawdownBps` relative to the high-water mark, the execution reverts. Multiple mandates with different `maxCumulativeDrawdownBps` values interact: the most permissive limit sets the effective ceiling for that epoch, since epoch state is shared.

The authority resets the epoch via `resetEpoch()`. This gives operators a clean slate after a strategy change or recovery period, while preventing a sequence of individually small losses from silently accumulating.

## The flash loan blind spot

The circuit breaker uses `totalAssets()` as its risk measure. For most vaults, this is correct. There is one known edge case worth understanding.

If an adapter can temporarily inflate `totalAssets()` within the same transaction (by borrowing assets through a flash loan before the post-execution snapshot), the drawdown check can be satisfied even when real assets were extracted. The EVM has no concept of "real" vs "borrowed" assets inside a transaction. That's a genuinely unsettling property to work around.

This is a deliberate scope limitation in the Core profile. The standard provides an `extensions` field in the `Mandate` struct and binds it via `extensionsHash` precisely to accommodate oracle-based or TWAP-based asset valuation for vaults where `totalAssets()` is susceptible to mid-transaction manipulation.

The same reasoning explains why the Core profile requires `value: 0` in all actions. No ETH flows through adapters in the base case, keeping asset accounting unambiguous.

If your vault's `totalAssets()` can be influenced by mid-transaction borrowing, the Core circuit breaker is insufficient. This applies to vaults holding assets in protocols that report share prices based on reserves that can be temporarily distorted.

## What a mandated execution looks like on-chain

A mandated execution is a single `execute()` call that spawns N internal `CALL` instructions, one per adapter in the action list. Each call potentially modifies storage across multiple contracts: the vault itself, each adapter, and any protocols those adapters touch. A six-adapter rebalance might interact with a dozen contracts in a single transaction.

Without a block explorer, debugging a failed mandate requires either replaying the transaction in Foundry with added trace logs, or parsing raw EVM output from `eth_debug_traceTransaction`. Both require local tooling and full state access.

With transaction tracing in [Ethernal](https://tryethernal.com), the internal call graph shows which adapter was invoked, what calldata was passed, where a revert occurred, and what state changed at each hop. The `preAssets` and `postAssets` return values from `execute()` are visible in the call trace. You can tell whether a revert was caused by the drawdown check firing or by a failed adapter call further down the chain.

The `epochAssets` storage slot update after each execution is visible in the state diff. For protocol operators monitoring a deployed vault, the `execute()` event log is the primary audit surface, recording entry and exit asset values and whether the epoch high-water mark moved. Ethernal's contract interaction panel lets you query current vault state (`epochAssets()`, `authorityEpoch()`, `epochStart()`, `mandateAuthority()`) directly without a separate RPC call.

## When to use ERC-8192

ERC-8192 is the right primitive when:

- Your vault has a human or multisig authority but needs AI agent or solver execution
- You want execution to be permissionless (any qualified solver can pick up open mandates) but risk-bounded
- You're building intent-solver infrastructure that needs a standard interface for vault execution callbacks
- You need the authority to revoke all outstanding mandates atomically via epoch rotation

It is not the right primitive when:

- You control all execution yourself and have no third-party executors. Use internal functions.
- Your risk model requires per-action limits rather than per-execution aggregate limits. The circuit breaker bounds the whole execution, not individual adapter calls.
- Your `totalAssets()` is susceptible to flash loan manipulation. Use the extensions mechanism or a different accounting approach.

The reference implementation is available at [tabilabs/mandated-vault-factory](https://github.com/tabilabs/mandated-vault-factory).<sup>[5](#fn-5)</sup> The ERC-165 interface ID for `IERC8192MandatedVault` is `0x25cb08f6`.

## The missing link

The mandate pattern is a narrow, composable primitive. It doesn't replace intent systems, doesn't compete with operator authorization standards, doesn't cover account abstraction.

It solves one specific problem: how does a vault authority express "here is what an executor is permitted to do and here is the risk envelope they must respect" in a form the EVM can enforce without trusting the executor.

ERC-4626 built the accounting layer. The agent and solver execution layer is being built on top of it now. The mandate pattern is the missing link between them.

---

## References

<span id="fn-1">1.</span> Yearn, Transmissions11, et al. "ERC-4626: Tokenized Vaults." _Ethereum Improvement Proposals_, April 2022. [https://eips.ethereum.org/EIPS/eip-4626](https://eips.ethereum.org/EIPS/eip-4626)

<span id="fn-2">2.</span> Tabilabs. "Add ERC: Mandated Execution for Tokenized Vaults." _GitHub ERCs_, PR #1597, March 2026. [https://github.com/ethereum/ERCs/pull/1597](https://github.com/ethereum/ERCs/pull/1597)

<span id="fn-3">3.</span> Ramacher, M., Recabarren, R. "EIP-712: Typed structured data hashing and signing." _Ethereum Improvement Proposals_, 2017. [https://eips.ethereum.org/EIPS/eip-712](https://eips.ethereum.org/EIPS/eip-712)

<span id="fn-4">4.</span> "ERC-1271: Standard Signature Validation Method for Contracts." _Ethereum Improvement Proposals_, 2019. [https://eips.ethereum.org/EIPS/eip-1271](https://eips.ethereum.org/EIPS/eip-1271)

<span id="fn-5">5.</span> Tabilabs. "mandated-vault-factory." _GitHub_, 2026. [https://github.com/tabilabs/mandated-vault-factory](https://github.com/tabilabs/mandated-vault-factory)
