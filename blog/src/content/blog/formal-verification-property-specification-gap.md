---
title: "The Prover Ran. The Property Was Wrong."
description: "Formal verification proves a contract satisfies its specified properties. It says nothing about properties nobody wrote. This is the spec problem."
date: 2026-06-24
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Formal Verification
keywords: []
image: "/blog/images/formal-verification-property-specification-gap.png"
ogImage: "/blog/images/formal-verification-property-specification-gap-og.png"
status: published
readingTime: 6
---

The Certora engagement ran for three weeks. Prover terminates. All 23 properties verified. No violations found. The protocol team published the audit report.

Three weeks after deployment, a flash loan drained $8M from the lending protocol. The post-mortem traced the vulnerability to a price oracle read inside a function reachable mid-flash-loan callback. An attacker manipulated the oracle during a flash loan, called the vulnerable function at the manipulated price, extracted value, and repaid the loan in the same transaction.

The property "oracle reads must not occur during active flash loan callbacks" never appeared in the CVL spec. Nobody wrote it. The Certora Prover never had a chance to fail it.

The prover was correct. The spec was incomplete.

This is a different failure mode from the one we explored with Euler Finance's $197M exploit, where the bug was a missing business rule that existed nowhere in documentation. This one is about the spec layer that's supposed to be strongest: mathematically rigorous, exhaustive, machine-checked. Formal verification doesn't fail because provers are buggy. It fails because no one wrote the property that mattered.

## Two kinds of "we verified this"

Testing and fuzzing confirm that stated invariants hold for the inputs you tried. Formal verification mathematically proves that stated properties hold for all possible inputs. The distinction matters. A verified property is a guarantee. A passing test suite is evidence.

But both depend on the same precondition: someone wrote the right properties.

A minimal CVL invariant for an ERC-20 looks straightforward:

```cvl
invariant totalSupplyIntegrity()
    totalSupply() == sumOf(balanceOf, users)
```

This property is obvious. The oracle-during-flash-loan property is not. The health factor check that cost $197M was not. The cross-contract accounting invariant that the next protocol will miss is not. The obvious properties get written. The non-obvious ones depend entirely on the domain expertise and imagination of whoever sits down to write the spec.

That is the bottleneck. Not the prover. Not the tooling. The spec.

## What formal verification actually checks

Certora's Verification Language (CVL) gives you three ways to express properties:<sup>[1](#fn-1)</sup>

- Invariants: state conditions that must hold throughout contract execution, regardless of what sequence of calls precede them.

- Pre/post-conditions: Hoare-logic assertions about what must be true before and after a function call. The Euler health factor check is this category: before any collateral reduction, health factor must exceed 1.0.

- Rules: multi-step scenario assertions with explicit setup, assumptions, and checks. "After a flash loan, the protocol's reserve ratio must return to its pre-loan level" is a rule.

CVL also requires declaring state modification contexts and uses low-level primitives to map storage reads and writes via hooks. The EEA's security research describes the language as "error-prone" even for expert users.<sup>[3](#fn-3)</sup> Writing properties is not the same skill as writing contracts. A team that produces excellent Solidity may produce a thin or structurally incomplete CVL spec.

Other formal verification tools use different specification formats (Halmos uses Python assertions, Manticore uses its own spec language), but the core constraint is the same across all of them: the prover is only as good as the properties fed into it.

## The 623-property baseline

A 2024 paper from MetaTrust Labs and Nanyang Technological University, published as a Distinguished Paper at NDSS 2025, offers the most systematic view of what the current spec layer looks like in practice.<sup>[1](#fn-1)</sup>

The researchers analyzed 61 Certora audit reports and extracted 623 human-written CVL properties: the full corpus of what Certora engagements have actually verified across dozens of production protocols.

Roughly 10 properties per audit. For protocols with dozens of functions and complex state machines.

The composition of those 623 properties matters. Most are structural invariants: total supply equals sum of balances, access control enforced on privileged functions, no operation succeeds when paused. These are the properties that are easy to specify because they map directly to documented requirements.

What's underrepresented: economic invariants, flash loan interaction scenarios, cross-contract state consistency, oracle staleness windows. The properties that require deep protocol-specific domain knowledge. The properties that catch the expensive bugs.

## PropertyGPT: automating the spec layer

The MetaTrust / NTU paper introduces PropertyGPT, which attacks the property generation problem directly using retrieval-augmented generation.<sup>[1](#fn-1)</sup>

The approach: embed all 623 human-written properties into a vector database. When given a target contract function, retrieve the most similar existing properties, then prompt an LLM to generate a new property for the target by analogy. The system iterates, using Certora compiler feedback to fix compilation errors, and ranks outputs using a weighted four-dimension similarity algorithm.

The results on real protocols:

| Metric | Result |
|--------|--------|
| Recall vs. ground truth | 80% |
| Precision | 64% |
| CVEs detected (from 13 representative) | 9 of 13 |
| Past attack incidents detected | 17 of 24 |
| Zero-day vulnerabilities found | 12 |
| Bug bounty rewards earned | $8,256 |
| Efficiency improvement for complex DeFi contracts | 40% |

80% recall means PropertyGPT can replace the expert writing four out of every five properties from scratch. The 40% efficiency improvement translates directly to reduced engagement costs. Formal verification engagements have run above $200,000 precisely because the human expert hours needed to formalize invariants are expensive.

The remaining 20% is not randomly distributed.

## The 20% gap is where the expensive bugs live

The properties PropertyGPT fails to generate are the ones that require protocol-specific domain knowledge no prior audit has ever encoded. They cannot be retrieved because they don't exist in the vector database. No lending protocol audit has ever formally specified "oracle reads during flash loan callbacks violate the integrity invariant," not because auditors are negligent, but because each protocol's flash loan architecture is unique enough that the property must be derived from scratch.

These are the categories that fall into the gap:

- Flash loan interaction invariants: "A price oracle read taken before and after a flash loan callback must not diverge." The callback structure is specific to the protocol; no retrieval system can generate this without understanding the full execution flow.

- Cross-contract economic consistency: "Total collateral recorded in the lending contract must always equal total collateral tracked in the collateral token contract." Two contracts, two state variables, one invariant. Requires knowing both contracts' storage layout and the relationship between them.

- Oracle staleness windows: "A collateral valuation must not use a price observation older than N blocks under any execution path." Requires knowing the oracle's update frequency, the protocol's liquidation latency, and the economic model for under-collateralization.

These are not obscure edge cases. They describe the attack surface that has drained hundreds of millions from production protocols. And they are precisely what a RAG system built on prior audit history cannot generate.

## The spec gap in audit standards

The Enterprise Ethereum Alliance's EthTrust Security Levels Specification v3 defines three certification tiers:<sup>[3](#fn-3)</sup>

| Level | Coverage |
|-------|----------|
| [S] | Automated checks (Slither, Mythril equivalents) |
| [M] | Manual code review audit |
| [Q] | Full logic and documentation review |

[Q] is the highest tier. It requires "logic and documentation review." There are no formal property requirements at any tier. A protocol can achieve [Q] certification without writing a single CVL invariant.

This is not a criticism of EthTrust. It reflects where the industry currently stands. Writing comprehensive formal properties is expensive enough that it isn't a realistic requirement for even the most rigorous certification tier. PropertyGPT directly addresses this cost barrier, but at 80% recall, not 100%.

The analogy is code coverage. A 100% branch coverage report says nothing about whether you tested the right branches. Coverage measures execution, not correctness. Formal verification coverage , the share of a protocol's semantic space covered by its property set , has no equivalent metric. You can verify 23 properties and be fully confident you haven't missed the one that matters.

A 95% test coverage report doesn't tell you what wasn't tested. An 80% property recall score doesn't tell you which 20% is missing.

## Empirical data as a complementary spec source

Before formal specifications exist, deployed protocols carry implicit behavioral specs in their transaction history.

A lending protocol with five million transactions over two years of adversarial production has demonstrated something: under those five million inputs, the invariants held. The transactions did not drain the protocol. Each one is a data point for what "correct execution" looks like in practice.

This is a different kind of knowledge from what formal specs encode. A CVL property specifies what must be true for all inputs, symbolically. On-chain transaction history shows what held for actual inputs, empirically. The empirical record can reveal which oracle-interaction patterns appeared frequently, which flash loan call sequences ran without incident, which cross-contract state transitions were validated by the market over time.

A block explorer with full transaction traces makes this empirical analysis tractable , every decoded function call, every internal state transition, every invariant that held across thousands of blocks is accessible and queryable. Ethernal's call tree rendering, which shows delegatecall chains and storage changes at each step, makes it possible to scan historical transactions for the patterns that would eventually need to become formal properties.

This does not close the spec gap. On-chain history tells you what happened. It doesn't tell you what could happen under inputs the protocol has never seen. But it complements the formal spec layer in the direction where automated property generation is weakest: protocol-specific economic behaviors under real market conditions.

## The bottleneck is the spec, not the prover

Formal verification is the strongest security tool available for smart contracts. It provides guarantees that no amount of testing can match. The provers work. Certora, Halmos, and Manticore all terminate on well-formed properties and produce correct results.

The constraint is the input to the prover, not the prover itself.

PropertyGPT closes 80% of the automation gap for property generation. That's a meaningful advance: four out of five properties that would previously require a domain expert to write from scratch can now be generated automatically and checked against compiler feedback. The $8,256 in bug bounties and 12 zero-day vulnerabilities found on real protocols confirm the approach works in production.

The 20% that remains , protocol-specific economic invariants, flash loan interactions, cross-contract consistency conditions , requires domain expertise that retrieval cannot supply. This is where engagement cost concentrates and where the expensive exploits are found.

Treating property writing as the primary cost center of formal verification changes how teams should allocate review budgets. The prover is not the bottleneck. Writing comprehensive properties for the protocol-specific behaviors that no prior audit has encoded is.

The spec was incomplete. That is the finding.

---

## References

<span id="fn-1">1.</span> Liu, Y., et al. "PropertyGPT: LLM-driven Formal Verification of Smart Contracts through Retrieval-Augmented Property Generation." _NDSS Symposium 2025 (Distinguished Paper)_, arXiv:2405.02580. [https://ar5iv.labs.arxiv.org/html/2405.02580](https://ar5iv.labs.arxiv.org/html/2405.02580)

<span id="fn-2">2.</span> MetaTrust Labs. "NDSS 2025 Distinguished Paper Award: PropertyGPT Revolutionizes Smart Contract Security Through AI-Powered Formal Verification." _metatrust.io_, 2025. [https://metatrust.io/blogs/post/ndss-2025-distinguished-paper-award-propertygpt-revolutionizes-smart-contract-security-through-aipowered-formal-verification](https://metatrust.io/blogs/post/ndss-2025-distinguished-paper-award-propertygpt-revolutionizes-smart-contract-security-through-aipowered-formal-verification)

<span id="fn-3">3.</span> Enterprise Ethereum Alliance. "EEA EthTrust Security Levels Specification v3." _entethalliance.org_, March 2025. [https://entethalliance.org/specs/ethtrust-sl/](https://entethalliance.org/specs/ethtrust-sl/)

<span id="fn-4">4.</span> Certora. "Certora Prover Documentation." _certora.com_. [https://www.certora.com/](https://www.certora.com/)

<span id="fn-5">5.</span> Hu, Z., et al. "LiquiLM: Deep Convolutional Network and Large Language Model Hybrid for DeFi Liquidity Vulnerability Detection." _arXiv_, April 2026. [https://arxiv.org/pdf/2604.03860](https://arxiv.org/pdf/2604.03860)
