---
title: "RANCID, Not ACID: A New Framework for Why Cross-Chain Systems Keep Failing"
description: "A 2026 SoK paper names the bug class ACID never covered. A real Arbitrum exploit shows exactly what it looks like in production."
date: 2026-10-21
tags:
  - Security
  - Auditing
  - Cross-Chain
  - Research
keywords: []
image: "/blog/images/rancid-not-acid-cross-chain-transaction-security.png"
ogImage: "/blog/images/rancid-not-acid-cross-chain-transaction-security-og.png"
status: published
readingTime: 8
---

A transaction on Arbitrum reaches soft finality in about two seconds, the moment the sequencer accepts and orders it.<sup>[3](#fn-3)</sup> Hard finality, when that transaction's batch is actually confirmed on Ethereum L1, can take up to seven days under Arbitrum's challenge window.<sup>[3](#fn-3)</sup> In 2024, a team of researchers found three distinct ways to exploit the gap between those two moments and get paid twice by applications that treated soft finality as final.<sup>[2](#fn-2)</sup> The bug bounty was $500,000. Arbitrum shipped a hard fork to close it.<sup>[1](#fn-1)</sup>

There was no reentrancy. No integer overflow. No missing access control modifier. The contracts did exactly what their code said. So what category of bug is this?

A SACMAT '26 paper published in March 2026 gives it a name.<sup>[4](#fn-4)</sup>

## ACID was built for one context

Database engineers have had a vocabulary for transaction correctness since the 1970s: Atomicity, Consistency, Isolation, Durability. A transaction either fully commits or fully rolls back. The database enforces that guarantee because it owns the whole system, one administrative domain, one source of truth.

Ethereum's own atomicity guarantee is still ACID at its root, just moved up a generation. A smart contract transaction either executes completely within a block or reverts entirely. That single-block atomicity is what makes flash loans possible: borrow, use, repay, all inside one atomic unit, or the whole thing unwinds.

The failure mode starts precisely when a transaction's meaning depends on state that lives in more than one system. A flash loan is atomic within one block. A cross-chain bridge transfer is not atomic across two chains, no matter how confident the UI's "confirmed" checkmark looks. ACID has nothing to say about that gap, because ACID was never designed for a transaction that spans systems with different clocks, different trust assumptions, and different failure modes.

## RANCID: the property set a March 2026 paper proposes

Sky Pelletier Waterpeace (Rowan University) and Nikolay Ivanov, in a SoK paper presented at the 31st ACM Symposium on Access Control Models and Technologies, trace transactional systems through four generations: centralized databases, distributed databases, blockchain/DLT, and what they call multi-context systems, heterogeneous cyber-physical components that must coordinate under real-time constraints.<sup>[4](#fn-4)</sup> A DeFi protocol orchestrating a flash loan across independent contracts, pools, and oracles is their example of the fourth generation. So is an autonomous vehicle coordinating sensors, actuators, and communication links, and a cross-platform payment flow spanning banks, card networks, and merchants.

Classical A/C/I/D still apply at every generation. The paper's argument is that two more properties become load-bearing once you leave generation three, and neither one has a name in classical database theory:

Real-timeness asks whether missing a deadline is catastrophic (hard real-time: a flash loan must repay within the same block, an anti-lock braking system must engage within milliseconds) or merely undesirable (soft real-time: a fraud-detection alert, a dropped network packet that gets retransmitted).

N-many Contexts asks whether a transaction requires coordination across two or more "distinct and potentially heterogeneous operational contexts," each with its own state, trust assumptions, and failure modes. Outside crypto, a ride-hailing trip is N-many-contexts: rider app, driver app, payment processor, and GPS tracking all have to agree on what happened. Inside crypto, a flash loan spans multiple independent smart contracts, liquidity pools, and price oracles, all within a single block.

Put the two properties next to the classical four and you get RANCID: Real-timeness, A/C/I/D, N-many Contexts. The name is the paper's own, and it is deliberately provocative, a signal that something classical ACID reasoning quietly assumed away is now the thing most likely to break.

## Same bug, different generation

The paper surveyed 163 papers and curated 41 as high-impact, classifying each reported vulnerability by CWE (Common Weakness Enumeration) category. The most prevalent weakness across all four generations was CWE-362, Race Condition, appearing in nine of the curated papers.<sup>[4](#fn-4)</sup> The sharpest finding isn't that race conditions are common. It's that the same weakness class shows up with a different name at every generation: a concurrency exploit in Gen I, a partition attack in Gen II, front-running in Gen III, and a cross-context timing attack in Gen IV. Same underlying weakness, different costume.

DoubleUp Roll, the Arbitrum double-spend attack from the opening, maps onto RANCID directly. N equals two: the sequencer's soft-finality context and L1's hard-finality settlement context. R is the property that gets violated: downstream cross-chain integrations assumed hard real-time finality (the transaction is final, full stop) where Arbitrum's architecture only guaranteed soft real-time finality (the transaction is ordered, pending L1 confirmation). The attack, presented at ACM CCS 2024 and awarded both the Distinguished Paper Award and Best Practical Paper on Cybersecurity, manipulated the batch-posting delay to keep a transaction in soft-finality limbo longer than the downstream application assumed, then rolled it back, collecting payment twice.<sup>[1](#fn-1)</sup><sup>[2](#fn-2)</sup> Arbitrum's fix, ArbOS version 10, added safeguards that track plaintext batch sizes to prevent that delay manipulation.<sup>[1](#fn-1)</sup>

Contrast that with the Nomad bridge hack from August 2022, a $190 million loss from a different flavor of multi-context failure.<sup>[5](#fn-5)</sup> A routine upgrade initialized a trusted-root value to `0x00`. That zeroed root made Nomad's per-chain `Replica` contract treat every unproven message as valid by default, no proof required. Nomad is also N-many-contexts (source chain, destination chain, and the relayer connecting them), but the failure wasn't timing. It was a trust-boundary collapse: one context's validation contract silently stopped enforcing the cross-chain proof requirement it was supposed to enforce. DoubleUp Roll and Nomad are both multi-context bugs. They are not the same bug. "Multi-context" isn't one failure mode, it's a category with several distinct shapes inside it.

## What this means if you build or audit across chains

The paper flags its own field's blind spot directly: there is a "pronounced bias toward DLT security research at the expense of broader transactional security," meaning Gen III (single smart contract) analysis is comparatively well studied while Gen IV (multi-context) analysis is sparse, even though bridges, L2s, and oracle-fed DeFi protocols, the systems most people actually build on now, live in Gen IV.<sup>[4](#fn-4)</sup>

That gap shows up in how audits get scoped. Most security reviews treat a bridge or L2 integration as "the contract," full stop. The paper's framing suggests a wider unit of analysis: the contract, plus the sequencer's finality model, plus the relayer, plus the destination chain's own assumptions about what "confirmed" means. None of those are code. All of them are part of the transaction's actual correctness surface.

A concrete exercise that follows from this: for any cross-chain or L2 integration, write down every context involved and state explicitly, in writing, whether your protocol's assumption about each one is hard real-time or soft real-time finality. Most unstated assumptions default, wrongly, to hard. DoubleUp Roll is what happens when that default goes unexamined.

## Visibility is the prerequisite

RANCID-style reasoning only works if your tooling actually shows you more than one context's canonical state. A block explorer that collapses a transaction's status to a single "confirmed" checkmark is hiding exactly the distinction RANCID says matters: sequencer-accepted versus L1-confirmed, bridge-message-sent versus bridge-message-relayed. You cannot write down "is this hard or soft real-time" if your only view of the transaction is one context's summary of it.

This is the layer a block explorer sits in, by design. Surfacing a transaction's status per context, rather than flattening it to one checkmark, is the difference between a tool that lets a team reason about N-many-contexts correctness and one that quietly assumes it away. It's a small thing in a dashboard. It's also the exact piece of information DoubleUp Roll shows was missing from the applications that got exploited twice.

## The gap is the point

The paper's own conclusion is that Gen IV, multi-context, cyber-physical, cross-chain systems are where the real systems increasingly live, and it's the least-studied generation of the four. DAO-style reentrancy still gets the lion's share of attention a decade later, and for good reason, but the industry's actual trajectory, bridges, rollups, oracle networks, appchains, keeps moving further into territory ACID was never built to describe.

Next time an explorer shows you "pending" next to "confirmed," ask which context's clock that status belongs to. That question, not a new static analysis rule or a longer audit checklist, is what RANCID is trying to make a first-class part of how this industry reasons about security.

---

## References

<span id="fn-1">1.</span> Wong, J. "Billions at Stake: Unveiling and Mitigating Double-Spending Attacks in Arbitrum's Rollback Mechanisms." _PolyU Innovation Digest_, September 2025. [https://www.polyu.edu.hk/publications/innovationdigest/issue/202509/highlight/billions-at-stake-unveiling-and-mitigating-double-spending-attacks-in-arbitrum-s-rollback-mechanisms](https://www.polyu.edu.hk/publications/innovationdigest/issue/202509/highlight/billions-at-stake-unveiling-and-mitigating-double-spending-attacks-in-arbitrum-s-rollback-mechanisms)

<span id="fn-2">2.</span> Sun, Y., Li, X., Peng, Z., Luo, X., Jiang, X., Zhou, Y., Zhang, L. "DoubleUp Roll: Double-spending in Arbitrum by Rolling It Back." _ACM CCS 2024_. [https://yinqian.org/papers/ccs24b.pdf](https://yinqian.org/papers/ccs24b.pdf)

<span id="fn-3">3.</span> Offchain Labs. "Chain Finality." _Arbitrum Docs_. [https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/sequencer/chain-finality](https://docs.arbitrum.io/launch-arbitrum-chain/chain-config/sequencer/chain-finality)

<span id="fn-4">4.</span> Waterpeace, S. P., Ivanov, N. "SoK: Evolution, Security, and Fundamental Properties of Transactional Systems." _ACM SACMAT '26_, July 2026. [https://arxiv.org/abs/2603.07381](https://arxiv.org/abs/2603.07381)

<span id="fn-5">5.</span> Halborn. "Explained: The Nomad Hack (August 2022)." _halborn.com_, 2022. [https://www.halborn.com/blog/post/explained-the-nomad-hack-august-2022](https://www.halborn.com/blog/post/explained-the-nomad-hack-august-2022)
