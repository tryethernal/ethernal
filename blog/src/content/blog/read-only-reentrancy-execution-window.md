---
title: "The Execution Window Your Reentrancy Guard Leaves Open"
description: "nonReentrant blocks same-contract reentrancy. Read-only reentrancy exploits mid-execution state in external contracts, a window no modifier can close."
date: 2026-07-22
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
  - DeFi
keywords: []
image: "/blog/images/read-only-reentrancy-execution-window.png"
ogImage: "/blog/images/read-only-reentrancy-execution-window-og.png"
status: published
readingTime: 7
---

Read-only reentrancy exploits the window between a contract's ETH transfer and its state update. External contracts that read price or collateral data during that window receive inconsistent values, and no reentrancy guard can stop them.

The dForce attack used a 68,429 ETH flash loan. dForce had `nonReentrant` on every state-changing function. The audit passed.

The attacker still walked away with 1,018 ETH and 1.22 million USX.<sup>[1](#fn-1)</sup>

The function that caused the loss was `get_virtual_price()` , a view function on the Curve pool. It reads state. It modifies nothing. No reentrancy guard in existence touches view functions, because by definition they cannot change state. The attack did not require bypassing any guard. It required reading state at exactly the wrong moment.

That moment is what this post is about.

## Classic reentrancy vs. read-only reentrancy

Classic reentrancy is a same-contract problem. Contract A transfers ETH, the attacker's fallback re-enters Contract A before its state updates, and the attacker drains twice what they should. The defense is `nonReentrant`: set a lock before any state mutation, check it on entry, clear it when done.

Read-only reentrancy is a cross-contract problem. Contract A transfers ETH mid-execution, while its own state is internally inconsistent. The attacker's fallback does not re-enter Contract A. It calls Contract B, which reads Contract A's state via a view function. Contract B makes a decision , a price calculation, a liquidation, a collateral check , based on values that Contract A has not finished updating. No reentrancy guard protects against this, because:

- Contract A's `nonReentrant` only prevents Contract A from being re-entered, not from being read.
- Contract B has no mechanism to know that Contract A is mid-execution.
- The read is a `STATICCALL`. It changes nothing. Reentrancy guards are irrelevant.

The call sequence in the dForce attack makes this concrete:

```
CALL: dForce.liquidate() ← called from attacker fallback
  nonReentrant check ✓  (dForce is not re-entered)
  STATICCALL: curve.get_virtual_price()
    returns inflated LP price  ← mid-execution state read
  calculates wrong collateral value
  executes bad liquidation  ← profit extracted here
```

dForce was not re-entered. Its guard worked exactly as designed. The problem was a call to a view function on a different contract that was mid-execution.

## Why Curve's state is inconsistent mid-execution

Curve's `remove_liquidity()` does three things in sequence:<sup>[1](#fn-1)</sup>

1. Burn LP tokens from the caller's balance.
2. Transfer underlying assets to the caller , ETH in this case, which triggers the caller's `receive()` or `fallback()`.
3. Update total supply and internal accounting.

`get_virtual_price()` computes total assets divided by total supply. During step 2, total supply still reflects pre-burn values. Total assets are mid-transfer. The function returns an inflated price.

This is not a Curve bug in the conventional sense. Under normal conditions, no external caller can observe step-2 state. The entire transaction is atomic from outside the call tree. But inside the call tree, within the same transaction, an attacker's fallback fires during step 2 and can call any contract it wants. Including dForce's oracle, which reads from Curve.

The attacker deposited borrowed ETH into the Curve pool, received LP tokens, opened leveraged positions in dForce against those LP tokens, then triggered `remove_liquidity()`. When dForce read the LP price to validate the positions, it got step-2 state: LP supply deflated by the burn, price therefore inflated. dForce allowed liquidations at the wrong prices. The attacker profited the difference.

## What the transaction trace shows

Tracing the exploit transaction reveals the attack structure immediately. The call tree looks like this:

```
CALL: FlashLoan.borrow(68,429 ETH)          depth 1
  CALL: Attacker.execute()                   depth 2
    CALL: Curve.remove_liquidity()           depth 3
      CALL: ETH transfer → Attacker.fallback() depth 4
        STATICCALL: Curve.get_virtual_price()  depth 5  ← mid-execution read
        CALL: dForce.liquidate(...)            depth 5  ← exploit fires here
      (step 3: Curve updates accounting)      too late
  CALL: FlashLoan.repay()                    depth 2
```

The `STATICCALL` to `get_virtual_price()` at depth 5, inside `Attacker.fallback()`, inside Curve's own execution context , that is the diagnostic signal. It appears at a call depth that cannot occur in normal protocol operation. No legitimate user calls `get_virtual_price()` from within `remove_liquidity()`.

A block explorer with full call tree rendering makes this legible after the fact. Ethernal's transaction trace view shows call depth, caller and callee, and decoded inputs and outputs for each frame. Looking at the exploit transaction retrospectively, the manipulated return value from `get_virtual_price()` is visible at depth 5: you can see what it returned and when it was called relative to Curve's internal state updates.

The trace doesn't prevent the attack. But it makes the mechanism transparent, and that transparency is the starting point for detection.

## The HOOK opcode: expressing trace properties formally

The structural problem is that contracts cannot read their own call history at runtime. There is no EVM opcode that asks "is any flash loan provider currently in my call stack?" Nothing that checks "was this function called from within another contract's mid-execution state?" The EVM provides no native trace introspection.

A 2024 paper from IEEE, "Instrumenting Transaction Trace Properties in Smart Contracts: Extending the EVM for Real-Time Security," proposes an extension that would change this.<sup>[2](#fn-2)</sup> The authors, Zhiyang Chen, Jan Gorzny, and Martin Derka, propose a `HOOK` opcode that, when encountered during execution, triggers a parallel process to validate the current transaction trace against a formal property specification.

The specification language is Past-Time Linear Temporal Logic (PLTL), a formalism for expressing what must have been true at prior points in a transaction's execution. The flash loan detection property looks like this:

```
ψ ≡ TokenTransfer(x) → ¬F⁻¹(∃c∈CallStack. InFlashLoanProviders(c))
```

In plain terms: if a token transfer occurred, there must not have been a flash loan provider anywhere in the call stack at any prior point in this transaction.

The dForce oracle check would be:

```
ψ ≡ OracleRead(x) → ¬F⁻¹(∃(c,s)∈CallStack. InFlashLoanProviders(c,s))
```

Oracle reads must not occur when a flash loan provider appears anywhere in the current call tree.

The authors analyzed 188 Forta network detectors, the full set of detection rules used by Forta's monitoring network. 186 of 188 (99%) can be expressed as PLTL trace properties. Only 2 require external data sources (off-chain data: a live price feed and mempool access) that a pure trace formalism cannot supply. Flash loan detection, reentrancy detection, TVL monitoring, governance attack patterns: all expressible in the same formalism.<sup>[2](#fn-2)</sup> As Chen et al. write in arXiv:2408.14621, "we also use past-time linear temporal logic (PLTL) to formalize transaction trace properties, showcasing that most existing detection metrics can be expressed using PLTL." That number surprised me. It suggests the attack surface is structurally more uniform than it looks when you're reading exploit postmortems one by one.

The checking runs in a spawned process parallel to execution, so it does not affect on-chain state. The `HOOK` opcode is a marker: when the EVM reaches it, the checker validates the property up to that point. If the property fails, the transaction can revert.

That said, this proposal has no implementation. The paper is conceptual and has no empirical gas evaluation. The gas overhead of parallel trace checking is unquantified. Deploying this requires EVM protocol changes, not a Solidity library update. It is a research result, not a production tool, and probably several years from being usable in any practical sense.

## What you can do before the EVM changes

Read-only reentrancy has no clean library fix. The defenses available today are either partial or require cooperation from the external contract.

Check the lock state before reading external view functions. Some protocols expose their reentrancy lock status as a public variable. If the external contract you're reading from makes its lock accessible, you can assert it before trusting its state:

```solidity
interface IReentrancyAware {
    function locked() external view returns (bool);
}

function _safeGetPrice(address pool) internal view returns (uint256) {
    require(!IReentrancyAware(pool).locked(), "pool mid-execution");
    return ICurvePool(pool).get_virtual_price();
}
```

This only works if the external contract exposes its lock. Most don't. Curve added `is_killed` and similar sentinel states after read-only reentrancy was identified as a class, but protection depends on the specific pool version.

Audit your oracle reads against your ETH transfer paths. Any function in your protocol that transfers ETH or calls ERC-777 tokens creates a potential re-entry window. Map which external view functions you call during or after those transfers. If a view function reads from a contract that also handles ETH transfers, flag it for explicit review.

Use transaction traces to find the pattern in your own protocol. Pull a sample of your protocol's historical transactions from a block explorer. Look for `STATICCALL` instructions at unusual call depths relative to your contract's normal execution. A `STATICCALL` that appears inside an ETH transfer callback, calling an external oracle, is the read-only reentrancy signature. Ethernal's call tree view makes this scan tractable for private chains where public explorers don't reach.

## The open problem

Read-only reentrancy is structurally unsolved at the EVM level. The `nonReentrant` modifier protects same-contract state. It provides no information about external contracts' execution state. Contracts have no native mechanism to query their position in another contract's call tree.

The HOOK/PLTL proposal is the first formalism that can express the relevant property ("this function must not be called while any flash loan provider is active in the current call tree") with enough precision to be machine-checked.<sup>[2](#fn-2)</sup> Recent work from FSE Companion 2026, PSR², approaches the same attack surface from a different angle, using phase-based semantic reasoning to detect atomicity violations: the intermediate states that become observable between operations that should be indivisible.<sup>[3](#fn-3)</sup> Both frameworks identify the same root cause from different directions. A related line of work infers on-chain trace invariants from historical transaction data rather than specifying them in advance, offering a data-driven complement to formal specification.<sup>[4](#fn-4)</sup>

Until EVM-level trace instrumentation lands, the practical defense is narrow: do not trust external view functions when ETH transfers or ERC-777 hooks can interleave with your oracle reads. Treat any external state read that happens during or after a transfer as potentially observing mid-execution data. The trace will show you the window. The protocol changes needed to close it are still ahead.

The reentrancy guard did not fail. It did exactly what it was built to do. The window it leaves open is in a different contract's execution context, and the EVM currently has no way to tell you it's there.

---

## References

<span id="fn-1">1.</span> CertiK. "Curve Conundrum: The dForce Attack via a Read-Only Reentrancy Vector Exploit." _certik.com_. [https://www.certik.com/resources/blog/1oDd0j4Kx9dfym2vRwvf5Y-curve-conundrum-the-dforce-attack-via-a-read-only-reentrancy-vector-exploit](https://www.certik.com/resources/blog/1oDd0j4Kx9dfym2vRwvf5Y-curve-conundrum-the-dforce-attack-via-a-read-only-reentrancy-vector-exploit)

<span id="fn-2">2.</span> Chen, Z., Gorzny, J., Derka, M. "Instrumenting Transaction Trace Properties in Smart Contracts: Extending the EVM for Real-Time Security." _IEEE_, 2024 (arXiv:2408.14621). [https://arxiv.org/abs/2408.14621](https://arxiv.org/abs/2408.14621)

<span id="fn-3">3.</span> Li, X., Wang, X., Li, W., Li, Z. "PSR²: Phase-based Semantic Reasoning Framework for Smart Contract Vulnerability Detection." _FSE Companion 2026_, arXiv:2604.06975. [https://arxiv.org/pdf/2604.06975](https://arxiv.org/pdf/2604.06975)

<span id="fn-4">4.</span> Chen, J., et al. "Trace2Inv: Inferring Smart Contract Behavioral Invariants from On-Chain Transaction Traces." _FSE 2024_. [https://jeffchen006.github.io/pdfs/trace2inv-fse24.pdf](https://jeffchen006.github.io/pdfs/trace2inv-fse24.pdf)
