---
title: "PeerDAS Has Been Live for 8 Months. Here's How Ethereum Verifies It's Actually Working."
description: "Fusaka replaced full blob replication with probabilistic custody sampling. Here's how dasmon and the wider ecosystem verify nodes actually honor it."
date: 2026-07-29
tags:
  - Ethereum
  - PeerDAS
  - EIP-7594
  - Protocol
  - Networking
  - Fusaka
keywords: []
image: "/blog/images/peerdas-custody-verification-dasmon.png"
ogImage: "/blog/images/peerdas-custody-verification-dasmon-og.png"
status: published
readingTime: 8
---

For the entire history of Ethereum, "is this data available" had a trivial answer: every full node had a full copy. Ask any node, get the same answer. On December 3, 2025, that stopped being true.<sup>[1](#fn-1)</sup> Today that verification comes from dasmon, a monitoring tool that samples peers and checks their answers against KZG commitments. Fusaka activated on mainnet at slot 13,164,544, and its headline feature, PeerDAS, changed what a full node actually holds. Nodes stopped downloading every blob and started holding a deterministic slice, trusting erasure coding and random sampling to make the whole verifiable without anyone holding the whole.

Eight months later, the system works. But "works" here means something more interesting than uptime. It means a continuously re-verified probabilistic guarantee, not a fact anyone can just look up. That's a genuinely new kind of question for node operators, and the tooling to answer it is still being built in public.

## What actually changed at the networking layer

PeerDAS (EIP-7594) replaces full blob replication with column-based sampling.<sup>[2](#fn-2)</sup> Each blob is erasure-coded into rows, the rows are subdivided into cells, and a column is the set of cells at a given index across every row and blob in a block, 128 columns total. Any 64 of those 128 columns, just over half, are enough to reconstruct the full data.

Column-based sampling won out over the simpler row-based alternative for a specific engineering reason: row-based reconstruction needs "extension" data that doesn't exist on the network until a block is built. Column extensions can be computed ahead of time, off the critical path, and the proof-generation cost shifts to whoever sends the blob rather than whoever verifies it. That inversion, cheap to produce, more expensive to verify, is the opposite of the naive assumption and it's why the EIP authors picked columns.

Custody isn't optional or self-selected. The consensus-specs `das-core.md` module defines it precisely.<sup>[3](#fn-3)</sup> `get_custody_groups(node_id, custody_size)` is a deterministic, pseudo-random function of a node's own ID: it hashes successive derived values of that ID and takes them mod 128 until it has collected `custody_size` unique groups. Raise `custody_size` later and the function extends the existing list rather than reshuffling it, so a node that decides to custody more data keeps everything it already had.

The floor for an honest node is `max(SAMPLES_PER_SLOT, custody_group_count)`, which works out to 8 columns (6.25%) even though the baseline `CUSTODY_REQUIREMENT` constant is stated as 4. Validator custody scales with stake: `get_validators_custody_requirement` divides a node's total attached effective balance by 32 ETH per additional group, floored at 8 groups and capped at 128.<sup>[8](#fn-8)</sup> Validators staking at least 2,048 ETH custody 64 or more groups, enough alone to reconstruct the full matrix. Validators staking at least 4,096 ETH custody all 128 groups and function as supernodes, the backbone that guarantees the full data is always held somewhere rather than depending purely on aggregate honest-majority sampling. Requiring more custody from bigger stakers means the nodes with the most resources carry a proportionally bigger share of the backbone, so the network's resilience scales with the same distribution as staking itself.

If you want the execution-layer half of this story, the mempool has its own bandwidth asymmetry that PeerDAS doesn't touch, covered in [our EIP-8070 piece on blobpool bandwidth](/blog/ethereum-blobpool-bandwidth-eip-8070). This article stays on the consensus-layer networking model PeerDAS actually shipped.

## Finding the right peers is its own problem

Custody tells a node what to hold. It doesn't tell a node who else is holding what it needs. Nodes that custody more than the minimum advertise that capacity in their ENR (Ethereum Node Record), and peer discovery runs over discv5, a UDP-based distributed hash table.<sup>[4](#fn-4)</sup> A node needing specific columns queries discv5 for peers whose advertised custody covers those columns instead of connecting at random and hoping. PeerDAS doesn't invent a new transport for any of this. It composes existing primitives: libp2p and gossipsub for distribution, discv5 and ENR for discovery, direct peer requests for targeted sampling.

How many peers does that actually take? A thread on ethresear.ch modeled it as a set-cover problem: given 128 total columns and C columns custodied per peer, how many distinct peers does a node need to connect to before every column is covered.<sup>[5](#fn-5)</sup> Simulating greedy peer discovery, keeping only peers that add new coverage, the answer for 128 columns at 16 per peer averaged approximately 25.9 peers. Across the configurations tested, coverage stayed under roughly 50 peers, a real and boundable number rather than something that melts a node's connection budget.

The non-intuitive result: holding the ratio of columns to per-peer custody constant does not hold the required peer count constant. `peer_count(64, 8)` is not equal to `peer_count(128, 16)`, even though both are the same ratio. A larger column count needs proportionally more peers than the ratio alone suggests. A commenter, leobago, flagged a bug in the peer-retention logic of an earlier version of that model, and the author publicly corrected it once it was pointed out, a sign this is genuinely new terrain being worked out in the open, not settled textbook math.

That timebound is the constraint that makes this a systems problem, not just a probability exercise. The PANDAS paper, from researchers at UCLouvain working alongside go-ethereum's Felix Lange, is built specifically around a tighter sub-slot deadline: it targets disseminating and sampling data within 4 seconds of the start of each consensus slot, and naive peer discovery and connection setup can blow that budget under real network conditions like churn, latency, and adversarial peers.<sup>[6](#fn-6)</sup> The paper proposes adaptive peer-selection mechanisms tuned to hit that deadline reliably. It's evidence this is an active academic research area, not a solved problem shipped once and forgotten.

## The gap nobody had to think about before

Sampling gives you a probabilistic guarantee, not a proof. A node can claim custody of columns in its ENR and simply not serve them reliably when asked, and the only way anyone finds out is by actually asking, repeatedly, and checking the answer against something verifiable.

Pre-Fusaka, "is the data available" required no monitoring at all, because every full node had every blob. Post-Fusaka, it's a live, continuous question: does the aggregate of what peers claim to custody, and actually serve on request, still add up to full availability across the network. ethPandaOps built `dasmon` specifically to answer that.<sup>[7](#fn-7)</sup>

`dasmon` tracks four things continuously: whether peers actually store the columns they claim to custody, custody window compliance over time, whether peers respond correctly when sampled, and network-wide compliance failures that would threaten aggregate blob availability. As the team behind it put it when announcing the tool: "At its core, dasmon answers a simple question: are peers storing the data they say they're storing?"<sup>[7](#fn-7)</sup> It does its own peer discovery and custody-metadata tracking, and instead of resampling randomly, it runs coverage-aware sampling that specifically targets slot-column combinations that haven't been checked yet. Every response is validated against the block's KZG commitments, so the check isn't "did the peer answer" but "did the peer answer with the actually-correct data." Results stream in real time to Xatu, ethPandaOps' observability pipeline, for historical analysis and alerting.

The stated goal is proactive management: detect custody degradation before it's critical, alert as availability ratios approach dangerous thresholds, and trigger preemptive reconstruction and reseeding rather than discovering a problem only after it has already caused a liveness issue. The tool is built and maintained by the EF's P2P Networking team in collaboration with ethPandaOps, and it runs live on ethPandaOps' public dashboard suite, The Lab.

Here's the part worth being honest about: as of current public documentation, there's no visible protocol-level slashing condition for a node that claims custody it doesn't actually serve. The enforcement today is observability and peer scoring, not an economic penalty enshrined in the protocol. A node that fails to serve what it claims gets detected and deprioritized by peers, not automatically punished by the chain. That's arguably the more interesting fact here: an entire new compliance-monitoring discipline emerged around this before the protocol grew its own teeth for it.

## Why this looks familiar

Block explorers exist because "the chain says X happened" isn't useful to a human, or an on-call engineer, until it's made visible, queryable, and verifiable in a UI. That's the entire reason the category exists.

PeerDAS created the same problem one layer down the stack. "The network says this data is available" isn't trustworthy until something continuously checks it and surfaces the result legibly. `dasmon` is that tooling for the p2p and consensus layer. Block explorers have always been that tooling for execution-layer state and transactions.

This isn't a shipped Ethernal feature, and it shouldn't be presented as one. As blob-availability questions become something app developers and infra operators check day-to-day rather than only protocol researchers, the natural place to surface "is this data still available, not just included" is the same surface people already check for "did my transaction land." That's a real gap in explorer tooling today, worth watching rather than a claim about what exists.

## What's next

Glamsterdam is targeting the end of August 2026, about a month from now, and it builds directly on the networking model PeerDAS established. Its headline proposals, ePBS (EIP-7732) and Block-Level Access Lists (EIP-7928), are covered elsewhere on this blog if you want the detail.

The broader pattern is worth naming on its own. Ethereum keeps moving trust from "everyone has everything" to "the aggregate behavior of many partial-knowledge participants is verifiably sufficient." Light clients did a version of this for state. Fraud and validity proofs did a version of this for execution. PeerDAS is the networking-layer version, and the interesting infrastructure work increasingly isn't the protocol spec itself. It's the verification tooling that has to exist alongside it.

## Frequently asked questions

### What is PeerDAS in one sentence?

PeerDAS (EIP-7594) is the networking protocol Ethereum activated with Fusaka on December 3, 2025 that lets nodes verify blob data availability by sampling a deterministic subset of erasure-coded columns instead of downloading every blob in full.

### How many peers does a node need to fully sample PeerDAS columns?

Modeling from ethresear.ch puts it around 25.9 peers on average to cover all 128 columns when each peer custodies 16, and results across tested configurations stayed under roughly 50 peers. The required peer count does not scale purely with the ratio of columns to per-peer custody; a higher total column count needs proportionally more peers than the ratio alone suggests.

### Is there a penalty for nodes that don't actually serve the data they claim to custody?

As far as current public documentation shows, no protocol-level slashing condition exists for custody non-compliance. Enforcement today happens through observability tooling like `dasmon` and libp2p-layer peer scoring and disconnection, not an economic penalty built into the protocol.

### What is dasmon and who built it?

`dasmon` is a live custody-compliance monitoring tool built by the Ethereum Foundation's P2P Networking team in collaboration with ethPandaOps. It continuously checks whether peers actually store and correctly serve the columns they claim to custody, validating responses against KZG commitments, and streams results to ethPandaOps' Xatu observability pipeline for alerting and historical analysis.

### When does Glamsterdam ship and how does it relate to PeerDAS?

Glamsterdam is targeting the end of August 2026. It builds on the networking and custody model PeerDAS established in Fusaka, and its headline proposals, ePBS (EIP-7732) and Block-Level Access Lists (EIP-7928), extend that same trajectory of moving Ethereum's trust model toward verifiable aggregate behavior rather than any single participant holding everything.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is PeerDAS in one sentence?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PeerDAS (EIP-7594) is the networking protocol Ethereum activated with Fusaka on December 3, 2025 that lets nodes verify blob data availability by sampling a deterministic subset of erasure-coded columns instead of downloading every blob in full."
      }
    },
    {
      "@type": "Question",
      "name": "How many peers does a node need to fully sample PeerDAS columns?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Modeling from ethresear.ch puts it around 25.9 peers on average to cover all 128 columns when each peer custodies 16, and results across tested configurations stayed under roughly 50 peers. The required peer count does not scale purely with the ratio of columns to per-peer custody; a higher total column count needs proportionally more peers than the ratio alone suggests."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a penalty for nodes that don't actually serve the data they claim to custody?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "As far as current public documentation shows, no protocol-level slashing condition exists for custody non-compliance. Enforcement today happens through observability tooling like dasmon and libp2p-layer peer scoring and disconnection, not an economic penalty built into the protocol."
      }
    },
    {
      "@type": "Question",
      "name": "What is dasmon and who built it?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "dasmon is a live custody-compliance monitoring tool built by the Ethereum Foundation's P2P Networking team in collaboration with ethPandaOps. It continuously checks whether peers actually store and correctly serve the columns they claim to custody, validating responses against KZG commitments, and streams results to ethPandaOps' Xatu observability pipeline for alerting and historical analysis."
      }
    },
    {
      "@type": "Question",
      "name": "When does Glamsterdam ship and how does it relate to PeerDAS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Glamsterdam is targeting the end of August 2026. It builds on the networking and custody model PeerDAS established in Fusaka, and its headline proposals, ePBS (EIP-7732) and Block-Level Access Lists (EIP-7928), extend that same trajectory of moving Ethereum's trust model toward verifiable aggregate behavior rather than any single participant holding everything."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> Ethereum Foundation. "Fusaka Mainnet Announcement." _blog.ethereum.org_, November 6, 2025. [https://blog.ethereum.org/2025/11/06/fusaka-mainnet-announcement](https://blog.ethereum.org/2025/11/06/fusaka-mainnet-announcement)

<span id="fn-2">2.</span> Ryan, Danny, Dankrad Feist, Francesco D'Amato, Hsiao-Wei Wang, and Alex Stokes. "EIP-7594: PeerDAS - Peer Data Availability Sampling." _Ethereum Improvement Proposals_. [https://eips.ethereum.org/EIPS/eip-7594](https://eips.ethereum.org/EIPS/eip-7594)

<span id="fn-3">3.</span> Ethereum Foundation. "consensus-specs: specs/fulu/das-core.md." _GitHub_. [https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/das-core.md](https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/das-core.md)

<span id="fn-4">4.</span> DeepWiki. "ethereum/consensus-specs: P2P Networking Protocol." [https://deepwiki.com/ethereum/consensus-specs/3.1-p2p-networking-protocol](https://deepwiki.com/ethereum/consensus-specs/3.1-p2p-networking-protocol)

<span id="fn-5">5.</span> ethresear.ch community. "Number of peers you need for peer sampling in PeerDAS (EIP-7594)." _ethresear.ch_. [https://ethresear.ch/t/number-of-peers-you-need-for-peer-sampling-in-peerdas-eip-7594/20562](https://ethresear.ch/t/number-of-peers-you-need-for-peer-sampling-in-peerdas-eip-7594/20562)

<span id="fn-6">6.</span> Pigaglio, Matthieu, Onur Ascigil, Michał Król, Sergi Rene, Felix Lange, Kaleem Peeroo, Ramin Sadre, Vladimir Stankovic, and Etienne Rivière. "PANDAS: Peer-to-peer, Adaptive Networking for Data Availability Sampling within Ethereum Consensus Timebounds." _arXiv:2507.00824_. [https://arxiv.org/pdf/2507.00824](https://arxiv.org/pdf/2507.00824)

<span id="fn-7">7.</span> raul, samcm, savid, and matty. "Announcing Live Custody Monitoring for PeerDAS." _ethpandaops.io_. [https://ethpandaops.io/posts/live-custody-monitoring-peerdas/](https://ethpandaops.io/posts/live-custody-monitoring-peerdas/)

<span id="fn-8">8.</span> Ethereum Foundation. "consensus-specs: specs/fulu/validator.md." _GitHub_. [https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/validator.md](https://github.com/ethereum/consensus-specs/blob/master/specs/fulu/validator.md)
