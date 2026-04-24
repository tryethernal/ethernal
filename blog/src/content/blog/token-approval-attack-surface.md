---
title: "The Token Approval Attack Surface That Grows With Every Fix"
description: "ERC-20's allowance race condition spawned a fix that cost $24M. ERC-7410 added spender griefing. ERC-6960 multiplied the surface. Here's the pattern."
date: 2026-04-24
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
image: "/blog/images/token-approval-attack-surface.png"
ogImage: "/blog/images/token-approval-attack-surface-og.png"
status: published
readingTime: 8
---

A recurring payment protocol integrates ERC-7410. The design is sound: instead of forcing users to revoke their own allowances when something goes wrong, operators can proactively reduce what they are permitted to spend. A security improvement, on paper.

Then a compromised operator key runs a single transaction. It calls `decreaseAllowanceBySpender(user, 1)` on every account in the system. Every user who had set a `type(uint256).max` infinite approval finds their allowance at zero. Not "decreased by 1." Zero. The ERC-7410 spec requires it: any call to `decreaseAllowanceBySpender` on an infinite approval resets the allowance to zero, regardless of the `subtractedValue` argument.<sup>[1](#fn-1)</sup>

No reentrancy. No integer overflow. No access control bypass. The function ran exactly as designed.

This is the fourth distinct attack class to emerge from the Ethereum token allowance model. Each time the community shipped a fix, the fix introduced a new surface. The security considerations added to ERC-7410 and ERC-6960 in March 2026 (months or years after those standards gained adoption) document what the protocol designers missed the first time.

Here is the full history, in order.

## The original race condition

The ERC-20 `approve` function sets an absolute allowance. You call `approve(spender, N)` and the spender can now transfer up to N tokens. When you want to change that limit to M, you call `approve(spender, M)`.

That sequencing is the attack surface. The double-spend goes like this:<sup>[2](#fn-2)</sup>

```
1. Alice approves Bob for N tokens: approve(Bob, N)
2. Alice decides to reduce to M: submits approve(Bob, M)
3. Bob front-runs Alice's tx: transferFrom(Alice, Bob, N)  -- spends N
4. Alice's transaction confirms: approve(Bob, M)           -- allowance resets to M
5. Bob spends again: transferFrom(Alice, Bob, M)           -- steals M
Result: Bob received N + M total
```

The root cause is that `approve` sets state without reading current state. An owner changing an allowance from nonzero to nonzero creates a window where the spender can extract both amounts from the same delegation. SWC-114 classified this in 2017.<sup>[3](#fn-3)</sup> The mitigations were straightforward: require approve-to-zero before approving nonzero, or use relative adjustments instead of absolute assignment.

OpenZeppelin went with relative adjustments.

## The fix that introduced phishing

OpenZeppelin added `increaseAllowance` and `decreaseAllowance` to its ERC-20 implementation. The design was sensible: instead of setting an absolute amount, these functions add or subtract from the current allowance.

```solidity
// Instead of setting an absolute allowance (vulnerable to N+M)
token.approve(spender, newAmount);

// Relative adjustment (mitigates race condition)
token.increaseAllowance(spender, addedAmount);
token.decreaseAllowance(spender, subtractedAmount);
```

The race condition risk dropped. Then a different attack surface opened.

Users interacting with DeFi protocols were tricked into signing transactions that looked routine. The payload was an `increaseAllowance` call. A user who had already approved a legitimate protocol for N tokens signed an `increaseAllowance(attacker, large_amount)` call, expanding attacker access without triggering the obvious "approve" label in their wallet. OpenZeppelin's issue tracker on the v5 removal documents $24M lost to this pattern.<sup>[4](#fn-4)</sup>

There was a second problem: `decreaseAllowance` itself is front-runnable. An owner submitting a decrease can be raced by the spender, who extracts the current allowance between the owner's transaction submission and its confirmation.

OpenZeppelin removed both functions in v5.0, released in 2023.<sup>[5](#fn-5)</sup> The stated reasoning: the functions are non-standard (not part of EIP-20), they created a phishing surface that proved more dangerous in practice, and the original N+M race condition was "not critical nor high in the wild." Not everyone agreed, but OpenZeppelin's decision held.

## EIP-2612 moves the attack to signatures

EIP-2612, finalized in 2022, added `permit` to ERC-20 tokens: gasless approvals via off-chain EIP-712 signatures.<sup>[6](#fn-6)</sup> The mempool-level race condition disappears. The approval and the spend can happen atomically in the same transaction.

```solidity
// User signs off-chain, protocol submits permit + transferFrom together
function depositWithPermit(
    address token,
    uint256 amount,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external {
    IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
    IERC20(token).transferFrom(msg.sender, address(this), amount);
}
```

The attack surface moved from the mempool to social engineering. Permit signatures are EIP-712 structured data that look like harmless off-chain messages. A user tricked into signing a permit for an attacker address creates an approval with no on-chain visibility until the attacker calls `transferFrom`. No `Approval` event fires at signing time. The first on-chain signal is the transfer itself.

The surface did not shrink. It became harder to audit.

## ERC-7410 and the spender-as-attacker

ERC-7410 introduces `decreaseAllowanceBySpender`, a function callable by the spender to reduce or eliminate its own allowance.<sup>[1](#fn-1)</sup>

```solidity
interface IERC7410 is IERC20 {
    function decreaseAllowanceBySpender(address owner, uint256 subtractedValue) external;
}
```

The use case is legitimate: a compromised spender key should be able to self-limit before damage spreads. A protocol that discovers its operator key is compromised can revoke its own access instead of waiting for every individual owner to act.

Two attack classes were added to the ERC's security considerations in PR #1585, in March 2026, well after the standard gained traction.<sup>[7](#fn-7)</sup>

### Spender griefing

A recurring payment protocol grants spender rights to an operator. Users approve `type(uint256).max`. A malicious or compromised operator calls `decreaseAllowanceBySpender(user, type(uint256).max)` on every account in one transaction. Every scheduled payment is cancelled. The call is fully authorized. Nothing about this is a bug in the implementation.

### The infinite approval cliff

When an owner has set `type(uint256).max`, calling `decreaseAllowanceBySpender` with any `subtractedValue` (including 1) MUST set the allowance to 0. The spec is explicit: infinite approvals cannot be partially decreased.

```solidity
// ERC-7410 compliant implementation
function decreaseAllowanceBySpender(address owner, uint256 subtractedValue) external {
    uint256 currentAllowance = _allowances[owner][msg.sender];

    // Any decrease on an infinite approval resets to zero entirely
    if (currentAllowance == type(uint256).max) {
        _allowances[owner][msg.sender] = 0;
    } else {
        require(currentAllowance >= subtractedValue, "ERC7410: decreased below zero");
        _allowances[owner][msg.sender] = currentAllowance - subtractedValue;
    }

    emit Approval(owner, msg.sender, _allowances[owner][msg.sender]);
}
```

The function name implies "decrease by some amount." For infinite approvals, it is binary: any call resets to zero. Integrators who do not read this edge case in the spec will build recurring payment systems with a silent kill switch.

Any protocol using ERC-7410 with infinite approvals and recurring payment logic needs explicit griefing analysis in audit scope. The attack requires no technical exploit. It requires a compromised key and knowledge of the spec.

## ERC-6960 multiplies the surface per asset layer

ERC-6960 is a dual-layer token standard for real-world assets (RWA).<sup>[8](#fn-8)</sup> It extends ERC-1155 with a `mainId` (asset type) and `subId` (unique attribute). A structured finance protocol tokenizing invoices might use `mainId = 1` for "invoice" and `subId` for each individual invoice. Fractionalized real estate, company stocks, digital collectibles with granular ownership: the target use case is any asset class where a single "type" contains many distinguishable instances.

```solidity
interface IDLT {
    // Each (owner, mainId, subId) triple has independent approval state
    function approve(address spender, uint256 mainId, uint256 subId, uint256 amount) external;
    function safeTransferFrom(
        address sender, address recipient,
        uint256 mainId, uint256 subId,
        uint256 amount, bytes calldata data
    ) external;
    function safeBatchTransferFrom(
        address sender, address recipient,
        uint256[] calldata mainIds, uint256[] calldata subIds,
        uint256[] calldata amounts, bytes calldata data
    ) external;
}
```

PR #1584 added the security considerations in March 2026.<sup>[9](#fn-9)</sup> Three of the four findings map directly to patterns described above, now multiplied by asset layer count.

### Per-layer allowance race conditions

Each `(mainId, subId)` pair has independent approval state. A protocol managing 50 RWA sub-types has 50 independent approval attack surfaces. The N+M race condition from 2017 applies individually to each one.

### Receiver callback reentrancy

The spec explicitly warns that contracts overriding `_beforeTokenTransfer` or `_afterTokenTransfer` hooks must not introduce external calls that create reentrancy paths. This warning is absent from ERC-20. In ERC-6960, any external call from a transfer hook creates a reentrancy surface across every `(mainId, subId)` pair the hook processes.

```solidity
// Dangerous pattern in ERC-6960 receiver hook
function _beforeTokenTransfer(
    address from, address to,
    uint256 mainId, uint256 subId, uint256 amount
) internal virtual override {
    // External call here creates a reentrancy path
    // that repeats across every asset layer
    externalContract.notify(from, to, mainId, subId, amount); // unsafe
}
```

**Batch gas limits.** `safeBatchTransferFrom` iterates over caller-supplied arrays. The spec says implementations "MAY impose upper bounds on array length" but gives no guidance on what those bounds should be. An attacker submitting a large batch forces iteration over every element until the transaction runs out of gas, a denial-of-service against any dependent operation.

```solidity
// Correct pattern: bound batch input size
function safeBatchTransferFrom(
    address sender, address recipient,
    uint256[] calldata mainIds, uint256[] calldata subIds,
    uint256[] calldata amounts, bytes calldata data
) external override {
    require(mainIds.length == subIds.length, "ERC6960: length mismatch");
    require(mainIds.length <= MAX_BATCH_SIZE, "ERC6960: batch too large");
    // ...
}
```

## What to look for when auditing

The checklist differs by standard. Each approval extension carries its own distinct risk class.

| Standard | Key audit checks |
|---|---|
| ERC-20 | No nonzero-to-nonzero `approve` calls without intermediate zero; use SafeERC20 for compatibility |
| ERC-20 + permit | Audit off-chain signing flows for phishing exposure; verify deadline and nonce handling; note that `Approval` events don't fire at permit signing time |
| ERC-7410 | Griefing analysis for any recurring or scheduled payment logic; document infinite approval reset behavior in integration specs; model compromised spender key scenarios |
| ERC-6960 | Per-layer allowance exhaustion; hook reentrancy across all `(mainId, subId)` pairs; bounded array length on all batch operations; integer overflow in sub-balance aggregation |

Every allowance change in any of these standards emits an `Approval` event. A spender griefing attack via `decreaseAllowanceBySpender` is fully visible on-chain: the call, the emitted `Approval(owner, spender, 0)`, and the block timestamp. For ERC-6960 RWA protocols, reconstructing which `(mainId, subId)` approvals were granted and whether they were consumed is a forensic task that reduces to filtering `Approval` events by owner and asset pair.

Ethernal renders decoded event logs for any EVM-compatible chain, including custom RWA networks. For post-incident forensics, filtering by the `Approval` topic reconstructs the full approval history for any wallet address across any contract. [Transaction tracing with Ethernal](/blog/transaction-tracing-with-ethernal) covers how to reconstruct call sequences from execution traces.

## The pattern

Each iteration of the token allowance model introduced a genuine improvement. `increaseAllowance` really does mitigate the N+M race condition. `permit` really does eliminate mempool-level front-running. `decreaseAllowanceBySpender` really does help compromised spender keys self-limit.

And each one opened a new attack class. The security considerations for ERC-7410 and ERC-6960 arrived in March 2026, after both standards had seen real adoption. This reflects something structural: the attack surface for a new standard is not fully visible until the standard runs in production against adversarial conditions.

For auditors, the implication is that "which token standards are in scope" is not a static question. ERC-7410 is moving toward final status. ERC-6960 is in active use by RWA platforms. Their freshly-documented attack vectors are not theoretical. They are the exact behaviors the spec requires.

---

## References

<span id="fn-1">1.</span> Ethereum Foundation. "ERC-7410: ERC20 Update Allowance By Spender." _eips.ethereum.org_. [https://eips.ethereum.org/EIPS/eip-7410](https://eips.ethereum.org/EIPS/eip-7410)

<span id="fn-2">2.</span> "Multiple Withdrawal Attack on ERC-20 Tokens." _arXiv_, July 2019. [https://arxiv.org/pdf/1907.00903](https://arxiv.org/pdf/1907.00903)

<span id="fn-3">3.</span> Smart Contract Weakness Classification Registry. "SWC-114: Transaction Order Dependence." _swcregistry.io_. [http://swcregistry.io/docs/SWC-114/](http://swcregistry.io/docs/SWC-114/)

<span id="fn-4">4.</span> OpenZeppelin. "Deprecate increaseAllowance and decreaseAllowance (Discussion)." _GitHub Issues_, 2023. [https://github.com/OpenZeppelin/openzeppelin-contracts/issues/4583](https://github.com/OpenZeppelin/openzeppelin-contracts/issues/4583)

<span id="fn-5">5.</span> OpenZeppelin. "Remove increaseAllowance / decreaseAllowance." _GitHub Pull Request #4585_, 2023. [https://github.com/OpenZeppelin/openzeppelin-contracts/pull/4585](https://github.com/OpenZeppelin/openzeppelin-contracts/pull/4585)

<span id="fn-6">6.</span> Ethereum Foundation. "EIP-2612: Permit Extension for EIP-20 Signed Approvals." _eips.ethereum.org_. [https://eips.ethereum.org/EIPS/eip-2612](https://eips.ethereum.org/EIPS/eip-2612)

<span id="fn-7">7.</span> Ethereum ERCs. "Update ERC-7410: Add test cases and expand security considerations." _GitHub Pull Request #1585_, March 2026. [https://github.com/ethereum/ERCs/pull/1585](https://github.com/ethereum/ERCs/pull/1585)

<span id="fn-8">8.</span> Ethereum Foundation. "ERC-6960: Dual Layer Token." _eips.ethereum.org_. [https://eips.ethereum.org/EIPS/eip-6960](https://eips.ethereum.org/EIPS/eip-6960)

<span id="fn-9">9.</span> Ethereum ERCs. "Update ERC-6960: Add reference implementation, test cases, and security considerations." _GitHub Pull Request #1584_, March 2026. [https://github.com/ethereum/ERCs/pull/1584](https://github.com/ethereum/ERCs/pull/1584)
