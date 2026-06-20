---
title: "The Attack Window Your Audit Can't Close: Proxy Security Beyond Code Review"
description: "54% of Ethereum contracts are proxies. The attack surface isn't in the code, it's in deployment. Here's what auditors structurally can't see."
date: 2026-06-20
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
keywords: []
image: "/blog/images/upgradeable-proxy-security-audit-gap.png"
ogImage: "/blog/images/upgradeable-proxy-security-audit-gap-og.png"
status: published
readingTime: 7
---

The real attack surface in upgradeable contracts is not the code. It is the gap between `deploy` and `initialize`. In July 2025, Kinto Protocol was drained of $1.55 million<sup>[8](#fn-8)</sup> despite audited contracts, standard ERC-1967 proxies, and clean implementation code.

The attack happened six months after deployment. Attackers found ERC-1967 proxy implementations that had never been initialized directly. They called `initialize()`, claimed ownership, and installed backdoors. Those backdoors sat dormant through subsequent audits before being activated.

The proxy code was correct. The audit was correct. The deployment sequence was wrong.

This is the characteristic failure mode of upgradeable contracts: the vulnerability does not live in the code. It lives in the gap between `deploy` and `initialize`.

## Why 54% of Ethereum contracts use proxies

Proxies exist because deployed Ethereum contracts cannot be patched. Smart contracts are immutable once deployed. If a bug exists in production, you cannot patch it. You can only deploy a new contract and migrate users. For protocols that need the ability to fix bugs and ship improvements, the proxy pattern is the dominant solution.

A proxy contract holds user funds and state. An implementation contract holds the business logic. The proxy delegates calls to the implementation via `delegatecall`, which executes the implementation's code inside the proxy's storage context. To upgrade, you point the proxy at a new implementation address. User funds stay in the proxy; only the logic changes.

Three patterns dominate:

| Pattern | Upgrade mechanism | Who controls upgrade |
|---------|------------------|---------------------|
| Transparent Proxy | Proxy-level `upgradeTo` | Admin only; admin and user call paths are fully separated |
| UUPS | `upgradeTo` in implementation | Implementation must authorize |
| Beacon | Shared Beacon contract | Beacon admin; affects all proxies simultaneously |

54.2% of all active Ethereum contracts (out of 36 million analyzed from 2015 to 2023) are proxies.<sup>[1](#fn-1)</sup> The pattern is ubiquitous. So is the attack surface it creates.

## Five attack classes

Proxy vulnerabilities fall into five categories, each exploitable without touching the implementation code.<sup>[7](#fn-7)</sup>

### 1. Uninitialized implementation contracts

This is the most critical class, and the one behind the Kinto exploit.

Proxy contracts cannot use constructors: the constructor runs in the implementation's storage context, not the proxy's. Upgradeable contracts use an `initialize()` function instead. But that function must be called on the implementation, and it must be protected from being called by anyone else.

If `initialize()` is never called on the bare implementation contract, an attacker can call it first, claim ownership, and, in UUPS proxies, call `upgradeTo()` with a malicious contract that runs `selfdestruct`. The implementation is destroyed. Every proxy pointing to it now points to an empty address. Users are permanently locked out.

In 2021, iosiro security researcher Ashiq Amien disclosed exactly this vulnerability in OpenZeppelin's UUPS implementation, concluding: "If you're using a UUPS proxy, you should initialize the logic contract immediately."<sup>[3](#fn-3)</sup> At the time of disclosure, KeeperDAO had $44 million at risk and Rivermen NFT had $6.95 million exposed.

The fix is one line in the implementation constructor:

```solidity
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
    _disableInitializers();
}
```

`_disableInitializers()` locks the initialization state permanently, preventing anyone from calling `initialize()` on the implementation directly. Available in OpenZeppelin v4.3.2 and later.

Beyond protecting the implementation: always deploy and initialize in a single transaction. Any nonzero gap between `deploy` and `initialize` is an attack window.

### 2. Storage collisions

Proxy contracts need to store the implementation address. Naively, this goes into storage slot 0. The problem: the implementation contract likely declares its own state variables starting from slot 0 as well. A write to the implementation's first state variable overwrites the proxy's implementation pointer.

```solidity
// Proxy stores implementation address in slot 0
address public implementation; // slot 0

// Implementation also declares a variable at slot 0
uint256 public totalSupply; // slot 0 - COLLISION

// An innocent `totalSupply += 1` overwrites the proxy's implementation address
```

EIP-1967 solves this by storing the implementation address in a pseudo-random slot: `keccak256("eip1967.proxy.implementation") - 1`. Accidental collision becomes probabilistically impossible. The Proxion paper found 1.5 million contracts with at least one active collision vulnerability, most of them pre-EIP-1967 deployments.<sup>[1](#fn-1)</sup>

### 3. Missing storage gaps

When an upgradeable base contract adds a new state variable in an upgrade, it shifts the storage slots of every child contract that inherits from it.

```solidity
// V1: child contract variables start at slot 1
contract ProtocolBase {
    uint256 public fee; // slot 0
}

// V2: adds a variable, pushing child contract variables down
contract ProtocolBase {
    uint256 public fee;         // slot 0
    address public treasury;    // slot 1 - NEW - shifts everything below
}
```

All child contracts now read their V1 state from the wrong slots. Protocol configuration, user balances, ownership variables, all misaligned, without a single code bug in sight.

The fix is a `__gap` array in base contracts that reserves slots for future additions:

```solidity
uint256[49] private __gap; // reserves slots 1-49 for future base contract variables
```

When a new variable is added, reduce the gap length by one. The slot layout stays stable across upgrades.

### 4. Unprotected `upgradeTo` in UUPS

UUPS moves the upgrade function into the implementation itself. This is more gas efficient than Transparent Proxy, but it requires the implementation to enforce authorization on every call to `upgradeTo`.

Two things break this:

First, a missing `onlyProxy` modifier. Without it, an attacker can call `upgradeTo` directly on the implementation contract, bypassing the proxy entirely and redirecting the implementation's own internal upgrade logic.

```solidity
// Vulnerable: missing onlyProxy allows direct calls on the implementation
function upgradeTo(address newImplementation) external {
    _authorizeUpgrade(newImplementation);
    _upgradeToAndCall(newImplementation, "", false);
}

// Correct: onlyProxy reverts if called outside the proxy context
function upgradeTo(address newImplementation) external onlyProxy {
    _authorizeUpgrade(newImplementation);
    _upgradeToAndCall(newImplementation, "", false);
}
```

Second, if a developer ships a new implementation that removes `_authorizeUpgrade()` entirely, no further upgrades are possible. The protocol is frozen at that version permanently.

### 5. Re-initialization

A missing `initializer` modifier on `initialize()` allows the function to be called again after deployment. This resets ownership, fee parameters, and all configuration state to whatever values the attacker supplies.

```solidity
// Vulnerable: can be called multiple times
function initialize(address owner, uint256 fee) external {
    _owner = owner;
    _fee = fee;
}

// Correct: modifier ensures this runs exactly once
function initialize(address owner, uint256 fee) external initializer {
    _owner = owner;
    _fee = fee;
}
```

## Why audits structurally miss this

The five attack classes above share a defining property: none of them are code bugs. The implementation logic may be entirely correct. Static analysis tools, Slither, Mythril, Aderyn, scan code. They are not designed to audit deployment sequences.

A December 2025 paper, USCSA, identified the core problem: existing detection tools analyze contracts version by version, treating each upgrade as a standalone artifact.<sup>[5](#fn-5)</sup> But proxy vulnerabilities are introduced *across* versions. Adding a variable to a base contract is safe code in isolation. It becomes a storage collision disaster in the context of a prior deployment. The research analyzed 3,546 documented vulnerability cases in upgradeable contracts; the USCSA approach (AST diff analysis combined with an LLM across versions) achieved 92.26% precision and 89.67% recall. Single-version tools missed a substantial portion.

A separate 2025 paper, "The Dark Side of Upgrades," analyzed 83,085 upgraded contracts and found 31,407 related issues, including four entire risk categories that "lack public awareness and mitigation strategies."<sup>[2](#fn-2)</sup>

OWASP responded by adding SC10: Proxy & Upgradeability Vulnerabilities as a new entry in the Smart Contract Top 10.<sup>[4](#fn-4)</sup> It is the first category driven specifically by operational failure modes rather than code-level bugs. That is worth sitting with: a top-10 security category that exists because deployment processes failed, not code. The threat model is different from what auditors are trained to find.

In 2025, attackers ran automated scanners across multiple chains looking for freshly deployed proxies that had not yet been initialized. Backdoors were installed and left dormant for months, surviving all subsequent code audits before being activated.

The attack window is operational. No code review closes it.

## Tracing proxy behavior at runtime

`delegatecall` is visible in full execution traces. A decoded trace shows exactly which implementation handled a given call, what storage was read and written, and whether any unexpected contract stepped into the call path.

Ethernal renders the full call tree including delegatecall chains. The post-upgrade verification workflow is direct: send a test transaction through the proxy, pull the trace, confirm the new implementation address appears in the delegatecall leg. If the implementation address in the trace does not match the contract you just deployed, the proxy state is wrong.

The same trace layer is useful for incident response. If the implementation slot changes unexpectedly, the storage diff appears in the block where it happened. The transaction that caused the change is fully traceable, which is the operational signal that catches a storage collision or unauthorized upgrade in production.

For L2 and L3 teams running custom chains, Ethernal connected to a private network gives you this trace layer for every upgrade deployment before anything reaches mainnet.

## Safe deployment checklist

OWASP SC10:2026 and Octane Security's CI/CD guidance<sup>[4](#fn-4)</sup><sup>[6](#fn-6)</sup> converge on the same set of controls:

1. Deploy and initialize in a single transaction, never in separate steps
2. Call `_disableInitializers()` in all implementation constructors
3. Use the `initializer` modifier on every `initialize()` function
4. Use EIP-1967 randomized storage slots, not slot 0
5. Add `__gap` arrays to all base contracts
6. Add `onlyProxy` to UUPS `upgradeTo`
7. Never leave upgrade authority on an EOA, use multisig with a timelock
8. Run a storage layout diff in CI and block merges that break layout
9. Simulate every upgrade on a fork with real mainnet state before going live
10. Trace a test transaction immediately post-upgrade to confirm the new implementation is active

---

The proxy pattern solved immutability. It introduced a different class of risk: operational security.

1.5 million contracts currently have active collision vulnerabilities. The 2025 coordinated scanning campaign showed that attackers do not find these manually; they automate it at scale. The code can be perfect, the audit clean, and the protocol still at risk because the threat lives in how and when the contracts were deployed, not in what they do.

Upgradeable contract security is not a code review problem. It is a deployment engineering problem. The checklist above is the starting point.

---

## References

<span id="fn-1">1.</span> Chen, Z., et al. "Proxion: Uncovering Hidden Proxy Smart Contracts for Finding Collision Vulnerabilities in Ethereum." _arXiv_, September 2024. [https://arxiv.org/abs/2409.13563](https://arxiv.org/abs/2409.13563)

<span id="fn-2">2.</span> Wang, Y., et al. "The Dark Side of Upgrades: Security Risks in Upgradeable Smart Contracts." _arXiv_, August 2025. [https://arxiv.org/abs/2508.02145](https://arxiv.org/abs/2508.02145)

<span id="fn-3">3.</span> iosiro. "OpenZeppelin UUPS Proxy Vulnerability Disclosure." _iosiro.com_, 2021. [https://www.iosiro.com/blog/openzeppelin-uups-proxy-vulnerability-disclosure](https://www.iosiro.com/blog/openzeppelin-uups-proxy-vulnerability-disclosure)

<span id="fn-4">4.</span> OWASP. "SC10:2026 - Proxy and Upgradeability Vulnerabilities." _OWASP Smart Contract Top 10_, February 2026. [https://owasp.org/www-project-smart-contract-top-10/2026/en/src/SC10-proxy-and-upgradeability-vulnerabilities.html](https://owasp.org/www-project-smart-contract-top-10/2026/en/src/SC10-proxy-and-upgradeability-vulnerabilities.html)

<span id="fn-5">5.</span> Li, X., et al. "USCSA: Upgradeable Smart Contract Security Analysis via Evolution-Aware AST Diffing and Large Language Models." _arXiv_, December 2025. [https://arxiv.org/abs/2512.08372](https://arxiv.org/abs/2512.08372)

<span id="fn-6">6.</span> Octane Security. "Upgradeable Smart Contracts: Proxies, Patterns, Pitfalls, and CI/CD Safeguards." _octane.security_, 2025. [https://www.octane.security/post/upgradeable-smart-contracts-proxies-patterns-pitfalls-cicd-safeguards](https://www.octane.security/post/upgradeable-smart-contracts-proxies-patterns-pitfalls-cicd-safeguards)

<span id="fn-7">7.</span> Coinspect. "Upgradeable Smart Contract Security." _coinspect.com_, 2025. [https://www.coinspect.com/blog/upgradeable-smart-contract-security/](https://www.coinspect.com/blog/upgradeable-smart-contract-security/)

<span id="fn-8">8.</span> Recuero, R. "Post-Mortem: $K Proxy Hack & Our Path Forward." _Kinto / Medium_, July 2025. [https://medium.com/mamori-finance/post-mortem-k-proxy-hack-our-path-forward-c2c3809882c6](https://medium.com/mamori-finance/%EF%B8%8F-post-mortem-k-proxy-hack-our-path-forward-c2c3809882c6)
