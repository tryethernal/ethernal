---
title: "The Implicit Rule Your Auditor Couldn't Check"
description: "LogicScan treats deployed on-chain protocols as a ground-truth specification for business invariants, flagging what no written spec ever captured."
date: 2026-06-22
tags:
  - Security
  - Auditing
  - Smart Contracts
  - DeFi
keywords: []
image: "/blog/images/the-implicit-rule-your-auditor-couldnt-check.png"
ogImage: "/blog/images/the-implicit-rule-your-auditor-couldnt-check-og.png"
status: published
readingTime: 6
---

March 13, 2023. A function called `donateToReserves` on Euler Finance let users contribute their own collateral to the protocol's reserves. The code was correct. The audit was complete. Slither found nothing. Human auditors found nothing. Three weeks after deployment, an attacker used a flash loan to donate borrowed collateral, rendering their own position insolvent, then self-liquidated it from a second wallet to claim a liquidation bonus larger than the donation cost. The attack played out in a single block. The loss was $197M.<sup>[1](#fn-1)</sup>

The auditors were not negligent. The specification was not incomplete by any written standard. The missing rule (check health factor before reducing collateral) existed nowhere in Euler's documentation. It didn't need to. Every other lending protocol in production enforced it by construction.

You cannot audit a rule that nobody wrote. The question is where to find the rules nobody wrote.

## What "audit ready" actually checks

Industry audit readiness standards have converged on a stable checklist: greater than 95% test coverage, Slither and Mythril run clean, code freeze in place, documentation complete.<sup>[2](#fn-2)</sup>

This checklist optimizes for auditor efficiency. It says nothing about whether a protocol's business invariants are complete. A protocol can satisfy every criterion on the list and still be missing the health factor check that costs $197M.

The deeper problem: auditors can only verify what has been specified. If the spec is silent on whether `donateToReserves` should verify collateral health before executing, there is no violation to flag. Static analysis has no mechanism to identify a missing rule. Symbolic execution explores paths that exist in code; it cannot explore paths your code never defined. Fuzzing confirms that stated invariants hold; it cannot tell you that a critical invariant was never stated.

[We covered why logical bugs evade standard tooling in detail here.](/blog/the-bug-auditors-tools-miss) The brief version: the entire automated security stack operates on code versus code. Business logic vulnerabilities require code versus intent. That gap is where the expensive exploits live.

## The on-chain specification

[A February 2026 paper by Jiaqi Gao et al.](https://arxiv.org/abs/2602.03271) proposes a different question.<sup>[3](#fn-3)</sup> Rather than asking "does this code match its specification?", ask: does this code match what every other mature protocol in this category does?

This is contrastive auditing. The premise: the blockchain contains the largest validated corpus of smart contract business logic ever assembled. Protocols that have operated under adversarial production conditions for years without exploit encode correct invariants by survival. AAVE, Compound, Morpho, and dozens of other lending protocols collectively define what lending protocols do. Not through documentation, but through code that has held under pressure.

LogicScan mines this corpus. It retrieves mature deployed protocols in the same functional category as the target, extracts the business invariants they universally enforce, and checks whether the target enforces them too. If every lending protocol in the reference set checks health factor before reducing collateral, and the target does not, that is a flag.

The Euler case would have produced exactly this signal. `donateToReserves` reduces the caller's collateral balance. The invariant corpus (AAVE, Compound, and the rest) universally gates collateral reduction on a health factor check. The function deviates from ecosystem consensus. That deviation is the finding.

## How LogicScan represents business logic

The normalization problem is harder than it sounds. Lending protocols implement health checks in at least a dozen ways: `require(isHealthy(account))`, `if (healthFactor < MIN_HF) revert HealthFactorTooLow()`, a modifier pattern that wraps collateral-reducing functions, a shared internal function called from multiple operations. All express the same invariant. None share syntax.

LogicScan introduces a Business Specification Language (BSL) to resolve this. BSL is an intermediate representation that abstracts a function's business logic into two components: precondition constraints (the checks that must hold before the operation executes) and a semantic action (the core operation itself). All of these, whether `require`, `assert`, `if-revert`, or a modifier pattern, normalize to the same BSL precondition.

With that normalization in place, the three-phase auditing process becomes tractable:

1. **Invariant induction:** Given N template implementations retrieved from the corpus, summarize the common preconditions they share. What does every lending protocol require before reducing collateral?

2. **Consistency verification:** Analyze whether the target function's BSL representation explicitly enforces each identified invariant. Not just whether the check exists somewhere in the protocol, but whether this specific function enforces it.

3. **Deviation analysis:** Not all deviations are bugs. Some protocols distribute validation across multiple functions (the check is elsewhere in the call chain). Some intentionally implement a different security model for good reasons. LogicScan distinguishes benign design choices from exploitable omissions using noise-aware aggregation: running multiple LLM passes and filtering for consistent findings across passes.

The false positive reduction is meaningful. Without aggregation, the false positive rate on DeFiHacks is 47%. With aggregation, it drops to 21.3%.<sup>[3](#fn-3)</sup>

## Performance numbers

| Dataset | Precision | Recall | F1 |
|---------|-----------|--------|-----|
| DeFiHacks | approximately 77% | 94.3% | **85.2%** |
| Web3Bugs | 66.5% | 82.8% | 73.7% |

On 200 production contracts: zero false positives on audited contracts, 7.1% false positive rate on unaudited contracts. The asymmetry makes sense: audited contracts had their deviations reviewed and confirmed as intentional. Unaudited contracts include legitimate design choices that look like deviations.

Cost: $0.08 per 1,000 lines of code analyzed. The system is model-agnostic, evaluated across GPT-5, Claude Sonnet, and Qwen-3.<sup>[3](#fn-3)</sup>

For comparison: Knowdit, which [we covered previously](/blog/ai-auditor-knowdit-code4rena), learns from Code4rena audit reports rather than deployed protocols and achieves 100% recall on high-severity known vulnerability classes. The two approaches are epistemologically distinct. Knowdit covers what failed in past audits. LogicScan covers invariants that have never appeared in any audit report, precisely because they were never specified.

## A complementary direction: PromFuzz

A March 2025 paper describes a dual-agent architecture that applies LLMs and fuzzing together from a different angle.<sup>[4](#fn-4)</sup> PromFuzz pairs an "Auditor Agent" analyzing contract logic defensively with an "Attacker Agent" generating exploit scenarios. The agents insert invariant checkers directly into vulnerable functions, then use those checkers to guide fuzzing toward meaningful violations.

Results: 86.96% F1, more than 50% improvement over prior methods, 30 zero-day bugs found, 24 CVE IDs issued, roughly $18.2B in assets under monitored protocols.<sup>[4](#fn-4)</sup>

PromFuzz and LogicScan occupy complementary positions. PromFuzz is strong on code-level invariant violations it can specify programmatically. LogicScan is strong on business-logic deviations from ecosystem norms , missing preconditions that no one thought to specify. Neither replaces human auditors. Both replace human attention on tasks that are scalable.

## What changes in the audit workflow

The practical shift is in where the screening pass starts.

Current practice: run Slither and Mythril, fix findings, engage human auditors. The auditors bring domain expertise but work without systematic access to the full corpus of what similar protocols enforce.

With contrastive analysis in the pipeline: before engaging auditors, run the target against a reference corpus of mature implementations in the same category. Surface the functions where the target deviates from ecosystem consensus. Send auditors a focused diff of deviations rather than a full codebase review from scratch.

This doesn't work for novel protocols with no reference corpus , first-of-kind mechanism designs, new primitive categories. For those, the specification gap cannot be filled from deployed code because no comparable deployed code exists. But that describes a small fraction of what ships. Most DeFi protocols are variants of established patterns: lending, AMMs, yield aggregators, staking derivatives. For the majority of the space that is variations on proven mechanisms, the on-chain corpus is a legitimate specification.

## After deployment

Pre-audit tools operate on code before users touch it. Deployed contracts interact with real state, real liquidity, real adversaries. Invariants that survived code review can still be violated through unexpected governance actions, protocol upgrades, or cross-protocol interactions the original audit didn't model.

The monitoring counterpart to contrastive auditing is transaction-level tracing. When an invariant is violated on-chain, the violation is visible in the call sequence: a function that should gate on a health check called without it, a balance delta that breaks the accounting invariant the pre-deployment verifier confirmed.

Ethernal's decoded transaction traces surface exactly these patterns , call trees, internal state changes, event logs at each step. The `donateToReserves` attack left a clear trace: flash loan taken, collateral donated, position liquidated, loan repaid, all within a single block. Pre-audit contrastive analysis catches the missing invariant in code. Post-deployment tracing catches the sequence when it executes. [The post-deployment monitoring stack](/blog/after-the-audit-post-deployment-monitoring-stack) covers what that layer looks like in practice.

## The rule exists

The health factor invariant that cost Euler $197M was not invented in response to the exploit. It existed before the exploit. It existed in every other lending protocol that had survived adversarial usage. It was never written into Euler's specification.

LogicScan makes that implicit rule explicit by asking the right question: not "does this code match its spec?" but "does this code match what the ecosystem considers mandatory?"

The blockchain's adversarial history is now a security resource. The protocols that survived encode what correct looks like. The protocols that didn't encode what missing looks like. Both datasets are on-chain and permanent.

---

## References

<span id="fn-1">1.</span> Cifuentes, J. "How Did the Euler Finance Hack Happen? Hack Analysis." _Cyfrin_, 2023. [https://www.cyfrin.io/blog/how-did-the-euler-finance-hack-happen-hack-analysis](https://www.cyfrin.io/blog/how-did-the-euler-finance-hack-happen-hack-analysis)

<span id="fn-2">2.</span> OpenZeppelin. "Smart Contract Security Audit Readiness Guide." _learn.openzeppelin.com_, 2026. [https://learn.openzeppelin.com/security-audits/readiness-guide](https://learn.openzeppelin.com/security-audits/readiness-guide)

<span id="fn-3">3.</span> Gao, J. et al. "LogicScan: LLM-Driven Business Logic Vulnerability Detection for Smart Contracts." _arXiv_, February 2026. [https://arxiv.org/abs/2602.03271](https://arxiv.org/abs/2602.03271)

<span id="fn-4">4.</span> "PromFuzz: Detecting Functional Bugs in Smart Contracts through LLM-Powered and Bug-Oriented Composite Analysis." _arXiv_, March 2025. [https://arxiv.org/html/2503.23718v1](https://arxiv.org/html/2503.23718v1)
