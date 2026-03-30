---
title: "FOCIL Explained: How Ethereum Is Hardcoding Censorship Resistance Into the Protocol"
description: "EIP-7805 adds a 16-validator committee that can't be collectively bribed. How FOCIL works across CL, EL, and Engine API, Ethereum's H2 2026 headliner."
date: 2026-03-30
tags:
  - Ethereum
  - EIP-7805
  - MEV
  - Protocol
  - Censorship Resistance
image: "/blog/images/eip-7805-focil-ethereum-censorship-resistance.png"
ogImage: "/blog/images/eip-7805-focil-ethereum-censorship-resistance-og.png"
status: published
readingTime: 8
---

Imagine you broadcast a transaction that interacts with a newly sanctioned contract. It lands in the public mempool. Block after block follows, each built by the same two entities, and neither will include it. An hour passes. Two hours. The transaction never clears. This is Ethereum today, and it is entirely legal. FOCIL is the proposal that changes the protocol so this can't happen undetected, and eventually can't happen at all.

## The block production problem

More than 80% of Ethereum blocks are currently built by just two entities.<sup>[1](#fn-1)</sup> This is not an accident. MEV-Boost, the dominant relay mechanism, routes block production through specialized builders who extract maximum value from transaction ordering. Builders have every incentive to exclude transactions that complicate their MEV strategies or trigger compliance filters.

The practical consequences are well documented. During the OFAC sanctions on Tornado Cash in 2022, multiple relays and builders refused to include Tornado Cash-related transactions. At the peak, more than 70% of blocks were censoring at the relay level, a figure tracked by mevwatch.info in real time.<sup>[2](#fn-2)</sup> Proposers, bound to those relays via MEV-Boost, had no protocol-level recourse.

The obvious fix was to give proposers direct control over which transactions get included. But single-proposer inclusion list designs, called "fIL" in research discussions, introduced a different failure mode: bribing or coercing a single validator per slot neutralizes the mechanism entirely. One compromised proposer is enough. The protocol needed a mechanism where compromising one participant changes nothing.

FOCIL distributes that responsibility across a committee of 16.

## What FOCIL does: the committee model

FOCIL (Fork-Choice Enforced Inclusion Lists), formalized as EIP-7805 by soispoke, Francesco D'Amato, and Julian Ma, introduces a per-slot committee of 16 validators selected pseudorandomly from the active validator set.<sup>[3](#fn-3)</sup>

Each committee member independently scans the public mempool and assembles an inclusion list (IL) of transactions it believes should be included in the next block. Members broadcast their ILs over p2p gossip before a view freeze deadline at t=9s into the 12-second slot. The block proposer must then build a block that satisfies the combined transaction set from those ILs.

The "fork-choice enforced" part is where the mechanism gets teeth. Attesters, the validators who vote on the canonical chain, only vote for a block if it satisfies the IL conditions for all non-equivocating committee members. A block that ignores valid ILs doesn't just fail. It gets voted out of the canonical fork. Censorship requires making the entire committee complicit, not just the proposer.

The security improvement over single-proposer designs is significant:

| Attack Vector | fIL (single proposer) | FOCIL (committee of 16) |
|---|---|---|
| Bribery | Bribe 1 proposer | Must bribe all 16 members |
| Extortion | Coerce 1 validator | Requires full committee compromise |
| IL equivocation | Exploitable | Slashable offense |
| Same-slot resistance | 1-slot delay | Same-slot (no delay) |

The honesty assumption is 1-of-N: if even one of the 16 committee members is honest and has seen the censored transaction in its mempool view, the transaction's inclusion can be enforced. This makes FOCIL resistant to the targeted bribery that killed earlier inclusion list designs.

## Why this isn't just a beacon chain change

Most people encountering FOCIL for the first time assume it's a consensus layer patch. It is not. FOCIL touches three distinct protocol layers simultaneously: the consensus layer specification, the execution layer, and the Engine API that connects them.

This cross-layer scope is the primary reason FOCIL moved from Glamsterdam (H1 2026) to Hegota (H2 2026). You cannot ship half of a three-layer change and expect it to function correctly.

### Consensus layer

The CL spec defines two new containers:

```python
class InclusionList(Container):
    slot: Slot
    validator_index: ValidatorIndex
    inclusion_list_committee_root: Root
    transactions: List[Transaction, MAX_TRANSACTIONS_PER_PAYLOAD]

class SignedInclusionList(Container):
    message: InclusionList
    signature: BLSSignature
```

Each `InclusionList` carries the slot number, the validator's index, a committee root for verification, and the raw transaction list. The `SignedInclusionList` adds the BLS signature for p2p authentication.

Three constants govern the mechanism:

| Parameter | Value |
|---|---|
| `IL_COMMITTEE_SIZE` | 16 validators |
| `MAX_BYTES_PER_INCLUSION_LIST` | 8,192 bytes (8 KiB) |
| `DOMAIN_IL_COMMITTEE` | `0x0C000000` |

The timing within a 12-second slot is precise:

| Time | Event |
|---|---|
| t=0 to t=8s | IL committee members construct and broadcast ILs |
| t=7 to t=9s | Fallback window if no block received by t=7s |
| t=9s | View freeze deadline, no new ILs accepted |
| t=11s | Builder freezes IL view and updates execution payload |
| Slot N+1, t=0s | Proposer broadcasts block with payload |
| Slot N+1, t=4s | Attesters verify IL inclusion and vote |

### Engine API

Three methods change at the CL-EL boundary:

- `engine_getInclusionListV1`: New method. The execution engine retrieves the IL for a slot.
- `engine_forkchoiceUpdated`: Extended. `payloadAttributes` now includes IL data.
- `engine_newPayload`: Extended. Returns a new `INCLUSION_LIST_UNSATISFIED` status when a block fails IL conditions.

### Fork-choice rules

Three new behaviors are added for attesters:

1. Store ILs observed over gossip before the view freeze deadline.
2. If more than one IL arrives from the same committee member, mark that member as an equivocator and ignore further ILs from them.
3. Only attest to a beacon block if it satisfies IL conditions for all ILs from non-equivocating members.

### P2P gossip validation

Six rules govern IL propagation: the IL slot must match the current or previous slot; the committee root must match expectations for that slot; no more than two ILs per committee member may be relayed; the BLS signature must be valid; the validator must be a member of the IL committee for that slot; and the IL size must not exceed 8 KiB.

This is the full cross-layer picture. CL defines the data and timing. EL enforces inclusion post-execution. The Engine API bridges the two. None of the three layers functions correctly in isolation.

## The conditional inclusion nuance

FOCIL is not a blank mandate. Inclusion is conditional, and those conditions matter for builders, auditors, and anyone reasoning about the mechanism's limits.

A transaction listed in an IL can be legitimately excluded from the block if:
- It is already present elsewhere in the block (deduplication)
- The block has no remaining gas capacity
- The transaction is invalid at execution time (failed nonce or balance check)

Validity is checked post-execution. The execution layer evaluates each IL transaction against the post-execution state. If a transaction was valid to append but was omitted without a capacity or deduplication reason, the engine returns `INCLUSION_LIST_UNSATISFIED`.

This creates an attack surface. A builder could front-run an IL transaction with a cheaper transaction from the same sender, advancing the nonce and invalidating the IL transaction. A more dangerous variant: spam cheap transactions to fill block space before IL transactions can be appended. The IL transaction gets excluded because the block is "full," and this is technically valid under the FOCIL rules.

EIP-8046 (Uniform Price Inclusion Lists, or UPIL), authored by Anders Elowsson, proposes a fix.<sup>[4](#fn-4)</sup> It introduces a new `RANK_TX_TYPE` transaction type with a `max_ranking_fee_per_gas` field. The block publishes a `marginal_ranking_fee_per_gas`, and no regular transaction may displace an IL transaction with a higher ranking fee. A uniform price auction clears at the highest ranking fee among excluded IL transactions. UPIL is not yet part of the FOCIL specification, but it is the leading candidate for closing the block stuffing vector before Hegota ships.

## Open questions going into Hegota

FOCIL is scheduled for inclusion in Hegota (H2 2026), with all six CL clients and all five EL clients already running implementations.<sup>[5](#fn-5)</sup> Local devnets with Prysm, Lodestar, Teku, and Geth have demonstrated interop successfully. Several questions remain open.

**Fee incentives.** IL committee members currently receive no explicit compensation. The design relies on altruism and protocol loyalty. This feels like a gap worth watching: asking validators to do extra work for free is a reasonable source of long-term concern, even if protocol loyalty holds in the short term.

**Account abstraction compatibility.** EIP-7702 transactions (EOA delegation, included in Pectra) are compatible with FOCIL's conditional inclusion model. Complex smart account wallets with arbitrary state dependencies are not fully resolved. A wallet whose validity depends on external state changes between mempool broadcast and execution creates inclusion uncertainty that FOCIL's post-execution check doesn't cleanly handle.

**The delta parameter.** FOCIL's `Eval` function uses a delta parameter to set overlap tolerance between block content and the IL set. Tuning delta is a liveness-versus-censorship-prevention tradeoff that depends on network conditions not yet observed in production.

**Multi-slot MEV.** FOCIL addresses censorship within a single slot. Builders who collude across multiple consecutive slots to suppress a transaction across several blocks are not addressed by this mechanism. There is no clean protocol-level answer for this yet.

FOCIL and ePBS (EIP-7732, Glamsterdam SFI) are designed as complementary layers, not competing proposals.<sup>[6](#fn-6)</sup> ePBS separates block building from block proposing at the protocol level, removing the need for trusted relays like MEV-Boost. FOCIL enforces what goes into blocks regardless of who built them. Together they address the full builder centralization problem: who builds, and what they are required to include.

## What this means for block explorer users

FOCIL compliance will be visible at the block level, and this changes what a block explorer can actually show.

Today, detecting censorship requires heuristic analysis: comparing transaction timestamps in the mempool against block inclusion times, identifying delay patterns across multiple blocks, inferring intent from statistical anomalies. It is probabilistic and contested.

After FOCIL ships, every block will carry an on-chain record of which validators formed the IL committee, which ILs were broadcast before the view freeze, and whether the block satisfied them. A transaction that should have been included under a valid IL but wasn't, resulting in `INCLUSION_LIST_UNSATISFIED`, becomes a protocol-level fact rather than a statistical inference.

For engineers running chains where censorship resistance is a requirement, that shift from heuristic to auditable matters. When Hegota ships and FOCIL lands on your chain, Ethernal will surface per-block IL committee membership and compliance data alongside the existing transaction trace and decoded event views.

## Frequently asked questions

### Does FOCIL guarantee unconditional transaction inclusion?

No. Inclusion is conditional on transaction validity, block space, and deduplication. A transaction that fails a nonce or balance check at execution time can be legitimately excluded even if it appears in an IL. The `INCLUSION_LIST_UNSATISFIED` status is only returned when a transaction was valid to include but was omitted without a legitimate reason.

### Is FOCIL replacing ePBS?

No. EIP-7805 (FOCIL) and EIP-7732 (ePBS) are designed as complementary mechanisms. ePBS governs who builds blocks by enshrining proposer-builder separation at the protocol level. FOCIL governs what must go into blocks by enforcing committee inclusion lists on attesters. They ship in consecutive forks by design: ePBS in Glamsterdam (H1 2026), FOCIL in Hegota (H2 2026).

### Why was FOCIL moved from Glamsterdam to Hegota?

FOCIL requires simultaneous changes to the consensus layer specification, the execution layer, and the Engine API. Shipping a partial implementation across two of the three layers would produce an incoherent system. The All Core Devs process moved it to Hegota to allow complete cross-layer implementation and devnet testing. It was not dropped; all six CL clients and all five EL clients already have implementations running on local devnets.

### What is the 1-of-N honesty assumption?

FOCIL's censorship resistance holds as long as at least one of the 16 IL committee members is honest and has seen the censored transaction in its mempool view. If all 16 members collude or are coerced, FOCIL provides no protection. The design makes this much harder than single-proposer designs (bribe 1 vs. bribe 16), but does not make collusion impossible.

---

## References

<span id="fn-1">1.</span> soispoke, D'Amato, F., Ma, J. "EIP-7805: Fork-Choice Enforced Inclusion Lists (FOCIL), Motivation." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805)

<span id="fn-2">2.</span> mevwatch.info. "OFAC Compliance & Tornado Cash Relay Censorship Tracker." _mevwatch.info_, 2022. [https://www.mevwatch.info/](https://www.mevwatch.info/)

<span id="fn-3">3.</span> soispoke, D'Amato, F., Ma, J. "EIP-7805: Fork-Choice Enforced Inclusion Lists (FOCIL)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805)

<span id="fn-4">4.</span> Elowsson, A. (@anderselowsson). "EIP-8046: Uniform Price Inclusion Lists (UPIL)." _ethresear.ch_, 2025. [https://ethresear.ch](https://ethresear.ch)

<span id="fn-5">5.</span> Dietrichs, A., van der Wijden, M., Kripalani, R. "Ethereum Protocol Priorities 2026." _Ethereum Foundation Research Blog_, February 2026. [https://blog.ethereum.org](https://blog.ethereum.org)

<span id="fn-6">6.</span> Ethereum Foundation. "EIP-7732: Enshrined Proposer-Builder Separation (ePBS)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7732](https://eips.ethereum.org/EIPS/eip-7732)
