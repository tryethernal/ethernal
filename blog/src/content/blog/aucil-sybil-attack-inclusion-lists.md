---
title: "AUCIL Was Built to Remove Ethereum's Inclusion-List Trust Problem. A Sybil Attack Just Moved It."
description: "A July 2026 ethresear.ch post shows AUCIL's auction-based inclusion lists aren't Sybil-proof, undermining the censorship guarantee they were built to protect."
date: 2026-08-09
tags:
  - Ethereum
  - Inclusion Lists
  - Protocol
  - Mechanism Design
  - Censorship Resistance
  - MEV
keywords: []
image: "/blog/images/aucil-sybil-attack-inclusion-lists.png"
ogImage: "/blog/images/aucil-sybil-attack-inclusion-lists-og.png"
status: published
readingTime: 8
---

On July 12, 2026, a researcher posted two dry-sounding questions to ethresear.ch: where can Sybil attacks enter AUCIL, and what would a Sybil-proof version look like.<sup>[1](#fn-1)</sup> Ten months earlier, AUCIL had been introduced with a specific selling point: it removes the trusted party that Ethereum's other inclusion-list design depends on. No aggregator, no single point of failure, a formally proved lower bound on the cost to censor a transaction. The post shows that the fix for one single point of failure introduced a different one. That's not a knock on the authors. It's a reminder that closing one trust hole in a mechanism design doesn't guarantee you didn't open another one you weren't looking for.

## Two ways to build an inclusion list

Ethereum has two live research tracks for enforcing that proposers include specific transactions, regardless of what a block builder wants.

FOCIL (EIP-7805) uses a committee of 16 validators, chosen by the consensus layer, with inclusion enforced at the fork-choice level. We covered [FOCIL's full committee model, CL/EL/Engine API design, and Hegota timeline here](/blog/eip-7805-focil-ethereum-censorship-resistance). This piece won't re-derive it.

AUCIL takes a different approach: no fixed committee. Any number of proposers submit competing candidate lists, and an auction mechanism, not a trusted aggregator, merges them into the final inclusion list. AUCIL was published in February 2025 by Sarisht Wadhwa and Kartik Nayak (Duke University), Julian Ma, Thomas Thiery, Barnabe Monnot, Luca Zanolini (Ethereum Foundation), and Fan Zhang (Yale University), first announced on ethresear.ch in September 2024.<sup>[2](#fn-2)</sup>

## What AUCIL actually promised

Committee-based designs like FOCIL have a structural weak point: something has to merge each committee member's list into a single final inclusion list. Whoever does that merging, the aggregator, is a single point of failure. Strategically drop a few lists during aggregation and you've weakened the whole mechanism without touching the committee itself.

AUCIL's response is a two-phase design that removes the aggregator entirely:<sup>[3](#fn-3)</sup>

1. **Phase I (input list creation).** Each of `n` proposers independently builds a utility-maximizing candidate list of transactions, reaching what game theorists call a correlated equilibrium: no proposer can do better by unilaterally picking a different set.
2. **Phase II (aggregation via auction).** Instead of a trusted party merging the lists, competition among proposers determines the final inclusion list.

The headline claim: censorship cost scales with the number of participants. AUCIL's authors prove a lower bound where bribing your way past the mechanism costs O(n·f), compared to O(f) for a single trusted aggregator you'd only need to bribe once. More proposers in the system means a more expensive attack. No trusted aggregator to compromise, no attesters that need to verify an aggregation step they can't easily audit.

## The property nobody checked: Sybil-proofness

A mechanism is Sybil-proof if splitting yourself into multiple identities never increases your total reward. This is not a bespoke complaint invented for this post. It's a named, established property in mechanism design, studied in query-incentive networks and peer-to-peer reward systems long before it showed up in an Ethereum context.<sup>[4](#fn-4)</sup>

Ethereum's other inclusion-list design already got a rigorous attack analysis in 2025. Aikaterini-Panagiota Stouka, Julian Ma, and Thomas Thiery published a bribery-resistance analysis of FOCIL, extending Roughgarden's transaction fee mechanism framework (the same framework used to formally justify EIP-1559) with a Bayesian game model where a proposer's incentives are evaluated under the assumption that an adversary is actively bribing them.<sup>[5](#fn-5)</sup> That's bribery-aware analysis, and it exists for FOCIL.

No equivalent Sybil analysis existed for AUCIL until the July 2026 post. That's the gap this piece is about, and it's a strange one to have left open for a mechanism whose entire pitch is an auction anyone can join.

## The attack: gaming your own reward mechanism

AUCIL's Phase I uses a greedy allocation algorithm to divide fee-based rewards across proposers and transactions. Evaluated one identity at a time, this allocation is genuinely incentive-compatible: no single proposer has a profitable way to deviate. That part of the original paper's proof holds.

The problem appears when one attacker controls more than one proposer identity and optimizes across them jointly. The attacker can deliberately accept a worse allocation on one identity specifically to unlock a disproportionately better allocation on the other, a cross-identity subsidy that no single honest proposer could ever reach on its own. Neither identity, examined in isolation, shows a profitable unilateral deviation. The exploit only exists once you allow one party to hold two seats and play them together. It's a clean piece of game theory, and it means the original proof was answering a narrower question than anyone realized: incentive-compatible for whom, exactly.

The post's structural example uses two transactions and an allocation that looks incentive-compatible when each proposer is checked separately, but yields more combined reward to a two-identity attacker than either identity could earn alone, and more than a single non-Sybil proposer could ever earn. Per-identity incentive-compatibility and Sybil-proofness are different properties. AUCIL's Phase I has the first. It doesn't have the second.

The actual damage isn't the attacker's extra reward. It's what that extra reward comes at the expense of: **coverage multiplicity**, the number of independent proposers whose input lists are protecting any given transaction. AUCIL's cost-to-censor bound, the O(n·f) result, is a direct function of that multiplicity. Sybil-inflating one side of the allocation thins out multiplicity elsewhere in the system. Manufacture enough identities in the right places and the proven floor no longer holds at the value it was proven for. The math still works. It's just answering a question about a system that no longer matches the one actually running.

## FOCIL doesn't have this problem. It has a different one.

FOCIL's committee seats come from the real, active validator set, drawn by the consensus layer. You cannot manufacture a cheap fake seat the way you can spin up a new proposer identity in an open auction. Sybil manufacture is structurally closed off in FOCIL by construction.

What FOCIL remains exposed to is bribery of the real, expensive-to-acquire seats it does have, exactly what the Stouka/Ma/Thiery analysis addresses. The two designs don't share a vulnerability class. They trade one axis of attack for the other.

| | FOCIL (EIP-7805) | AUCIL |
|---|---|---|
| Trust assumption | Committee drawn from real validator set by consensus | Open auction among proposer identities |
| Sybil resistance | Structural, by construction | Not proven; Phase I violates Sybil-proofness |
| Known vulnerability class | Bribery of real committee seats | Sybil manufacture in Phase I allocation |
| Current status | EIP-7805, targeting Hegota (H2 2026) | Research proposal, not an EIP |

The post proposes three mitigation directions, none formalized or implemented yet:

1. Stake-weighted fee partitions in place of equal division per proposer per transaction.
2. A correlated-equilibrium selection algorithm that explicitly targets equity across proposers, not just aggregate utility.
3. Redesigning Phase II to use a stake-weighted lottery instead of VRF-based sampling, so raw identity count stops being a free lever an attacker can pull.

This is an open research thread, not a retraction. AUCIL's aggregator-trust removal still stands; it's the Sybil-proofness of the mechanism that replaced the aggregator that now needs its own fix.

One related note for anyone tracking FOCIL's own repair work: EIP-8046 (Uniform Price Inclusion Lists) addresses FOCIL's block-stuffing vector, a separate problem on a separate track. FOCIL and AUCIL aren't competing for the same fix.

## Why this matters beyond the paper

Both of these mechanisms only deliver their formal guarantees if the real-world inputs match the model's assumptions. Proposer identity, stake, and coverage multiplicity aren't abstractions once a design like this ships. They're things someone has to actually observe on a live chain to know whether the guarantee is holding at any given moment.

That's an auditability problem before it's a game-theory problem. If a mechanism like AUCIL, or whatever Sybil-resistant successor comes out of this thread, ever ships, distinguishing five independent proposer identities from one entity running five clients under different keys is exactly the kind of on-chain identity and stake correlation a block explorer is positioned to surface, not something a reader should have to take on faith. I'd rather that gap be visible on-chain than left to a footnote in a research paper. It's the same instinct behind our plan to expose per-block IL committee data once FOCIL lands: censorship-resistance claims are protocol-level facts, and they should be checkable, not asserted.

## Frequently asked questions

### Is AUCIL going to replace FOCIL as Ethereum's inclusion-list design?

No. FOCIL (EIP-7805) is the design moving through the EIP process toward the Hegota fork. AUCIL remains a research proposal exploring a non-committee-based alternative; it has not been formalized as an EIP.

### Does the Sybil finding mean AUCIL is abandoned?

No. The July 2026 post proposes concrete mitigation directions, including stake-weighted fee partitions, equity-aware equilibrium selection, and a stake-weighted Phase II lottery. It's an open problem the research community is actively working on, not a rejection of the design.

### Is FOCIL Sybil-proof?

Structurally, yes. Committee seats are drawn from the real, active validator set by the consensus layer rather than self-declared by participants, so there's no cheap way to manufacture extra seats. FOCIL's known weak point is bribery of those real seats, a separate problem already given formal treatment by Stouka, Ma, and Thiery.

## References

<span id="fn-1">1.</span> AbhiMan1601. "Sybil Attacks on AUCIL." _ethresear.ch_, July 12, 2026. [https://ethresear.ch/t/sybil-attacks-on-aucil/25447](https://ethresear.ch/t/sybil-attacks-on-aucil/25447)

<span id="fn-2">2.</span> Wadhwa, S., Nayak, K., Ma, J., Thiery, T., Monnot, B., Zanolini, L. "AUCIL: An Auction-Based Inclusion List Design for Enhanced Censorship Resistance on Ethereum." _ethresear.ch_, September 12, 2024. [https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422)

<span id="fn-3">3.</span> Wadhwa, S., Nayak, K., Ma, J., Thiery, T., Monnot, B., Zanolini, L., Zhang, F. "AUCIL: An Inclusion List Design for Rational Parties." _IACR ePrint Archive_, 2025/194, February 2025. [https://eprint.iacr.org/2025/194](https://eprint.iacr.org/2025/194)

<span id="fn-4">4.</span> Various authors. "On Sybil-Proof Mechanisms." _arXiv_, 2407.14485, 2024. [https://arxiv.org/abs/2407.14485](https://arxiv.org/abs/2407.14485)

<span id="fn-5">5.</span> Stouka, A.P., Ma, J., Thiery, T. "Multiple Proposer Transaction Fee Mechanism Design: Robust Incentives Against Censorship and Bribery." _arXiv_, 2505.13751, May 2025. [https://arxiv.org/abs/2505.13751](https://arxiv.org/abs/2505.13751)

<span id="fn-6">6.</span> soispoke, D'Amato, F., Ma, J. "EIP-7805: Fork-Choice Enforced Inclusion Lists (FOCIL)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805)
