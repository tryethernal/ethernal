---
title: "Ethereum Fixed Its Block-Broadcast Speed Problem. It Just Found a Second Deadline to Worry About."
description: "A devnet benchmark cut execution payload propagation from 4.89s to 0.73s. But ePBS's new PTC deadline still has no defense against strategic delay."
date: 2026-09-07
tags:
  - Ethereum
  - ePBS
  - EIP-7732
  - Protocol
  - Networking
  - Glamsterdam
keywords: []
image: "/blog/images/segmented-payload-broadcast-ethereum-timing-games.png"
ogImage: "/blog/images/segmented-payload-broadcast-ethereum-timing-games-og.png"
status: published
readingTime: 8
---

A devnet benchmark this cycle measured how long it takes a 1 MiB execution payload to reach the network under Ethereum's enshrined proposer-builder separation (ePBS) design. Median completion: 4.89 seconds. The budget researchers were targeting: roughly 3.<sup>[2](#fn-2)</sup>

That gap matters because ePBS splits block production into two broadcasts instead of one, each racing a clock. We covered the first consequence of that split, the "free option" problem where builders can walk away from a committed payload, [in an earlier piece](/blog/epbs-free-option-problem-eip-7732). That article flagged blob-propagation timing as an open question, dependent on "network conditions still being characterized on devnets." This cycle answered it, and surfaced a second problem nobody had connected to the first.

## Why the slot needed a stopwatch

Under EIP-7732, a beacon block (consensus data plus a signed builder bid) and an execution payload (the actual transactions) publish at different points in the same 12-second slot instead of together.<sup>[4](#fn-4)</sup> The rough anatomy: the beacon block goes out at t=0, the full attestation committee votes around t=3, the builder publishes the execution payload around t=6, and a 512-validator Payload Timeliness Committee (PTC) votes on whether the payload and its blobs arrived on time at t=9.<sup>[1](#fn-1)</sup>

We've already covered the PTC's attack resistance and the free-option incentive problem it creates for builders. This piece isn't re-deriving that. The point here is narrower: the PTC vote at t=9 only means something if the payload can reliably reach 512 scattered validators in the roughly three seconds between publication and vote. Until this cycle, that was an assumption. Now it's a measurement.

## The fix: segmented diffusion

The centerpiece finding comes from a joint ethresear.ch thread with contributors from Vac/nim-libp2p and several client teams, testing how a 1 MiB payload actually propagates across a mixed network of datacenter and home-staker nodes.<sup>[2](#fn-2)</sup>

The baseline approach, gossiping the payload as one whole message, fails badly. Median completion time: 4.89 seconds. In a home-staker-heavy topology with no datacenter nodes participating, only 5% of receivers got the payload within the timely window. The failure mode is store-and-forward: each node has to receive the entire message before it can relay any of it to its peers, so latency stacks up hop by hop across the whole payload instead of overlapping.

The fix is segmentation. Instead of one gossip message, the payload splits into fixed 32×32 KiB segments, each gossiped independently. A node can start forwarding segment 3 to its peers while segment 47 is still arriving from someone else, pipelining the transfer across hops instead of serializing it.

To make each segment independently verifiable without waiting for the full payload, the design adds an `execution_payload_segment_group_id` field to `ExecutionPayloadBid`:

```
ExecutionPayloadBid {
  ...
  execution_payload_segment_group_id: Root  // Merkle root over the segment layout
}
```

That root commits to the full set of segments up front. Any single segment can be checked against it with a Merkle proof, so a validator doesn't need the whole payload in hand to confirm a segment is genuine. Combined with batch publishing, phase forwarding, and disciplined pull requests for missing pieces, the same devnet test produced a median completion time of 0.73 seconds, down from 4.89 (approximately 6.7x faster). Redundancy dropped from 4.4 copies per node to 1.4, and the worst-case tested scenario hit 100% timely receivers.

The rollout is split across two upgrades: the consensus-layer field ships at Gloas, and the networking and gossip rules that make segmentation useful activate at Hegotá, once client implementations get more production testing.<sup>[2](#fn-2)</sup> EIP-8081's Network Upgrade Meta EIP names EIP-7805 (FOCIL) as Hegotá's headline item, so segmented broadcast is arriving alongside other structural changes to how blocks move through the network, not as a standalone patch.<sup>[5](#fn-5)</sup>

Open questions remain: real-world block-install delay on loaded consumer hardware, how bursty slot boundaries get once blobs scale up, the CPU cost of handling roughly 32x more discrete messages per payload, and how per-segment envelope signatures get handled. But the core numbers, an order-of-magnitude improvement on the exact metric that mattered, are the strongest evidence yet that the propagation half of ePBS's timing problem is solvable with network engineering alone.

## Speed isn't the same problem as fairness

Fixing how fast a payload moves doesn't fix who benefits from controlling when it moves. A separate ethresear.ch thread on head-vote timing makes that distinction concrete, and it isn't about ePBS at all. It's about a timing game Ethereum already has.<sup>[3](#fn-3)</sup>

Validators vote for their perceived chain head under LMD-GHOST, and that vote is rewarded correctly only if it's cast on time, inside roughly 4 seconds of a 12-second slot. To deter proposers from reorging the previous slot, Ethereum gives the current slot's block a temporary +40% weight in fork-choice (proposer boost).

The research describes a head-vote timing game that exploits the deadline itself: an adversarial proposer delays broadcasting their block until just inside the plausible network-delay window, right before the attestation deadline. Honest validators, who correctly voted for the parent block because the new one genuinely hadn't arrived by their clock yet, lose head-vote rewards once the late block is confirmed canonical. They're penalized for voting accurately on the information they had.

A related pattern, the k-block attack, has a Byzantine proposer holding several consecutive slots privately extend a hidden branch, then release it all at once to reorg out honest blocks it deliberately withheld.

The authors quantify the damage: exploiting the timing game costs honest validators an average of 15.06% of their total reward in the modeled scenarios. Their proposed fix, a "distance-weighted head reward" that adjusts payouts based on how far a vote's timing deviated from the deadline rather than treating it as pass/fail, cuts that loss to 4.71% without touching the core LMD-GHOST fork-choice rule.

One discussant on the thread pushed back that mainnet proposers, being revenue-maximizing rather than griefing-motivated, wouldn't bother running this attack in practice. The original author's response is the more useful framing: this isn't about how often the attack happens. It's a negative externality, meaning it only needs to be possible and profitable at the margin to justify fixing, the same logic that motivates defenses against attacks that are individually rare but structurally available.

Here's the connection nobody had made explicitly before this cycle: today's timing game exploits Ethereum's one existing slot deadline, the attestation vote at roughly t=4. ePBS's PTC vote, landing at t=9, is a second, structurally similar deadline, a committee voting on a broadcast event with a hard cutoff. Across the sources gathered for this piece, there's no published proposer-boost-equivalent mechanism protecting the PTC vote from an analogous strategic-delay game. Segmentation fixes how fast a payload can arrive. It says nothing about whether a builder or proposer can profit from controlling exactly when, within the deadline, it does.

## What this means for anyone watching the chain

"When did this block become visible" is about to stop being a single timestamp. Once a payload arrives as 32 independently verified segments trickling in over time rather than one atomic block-received event, block visibility becomes a distribution, not a moment.

That's a real gap for infrastructure that still models "block seen" as a single instant. A slot where segments 1 through 30 arrived in the first 200ms but the last two trickled in at the 2.5-second mark looks identical, under an atomic block-received model, to one where all 32 arrived smoothly. Those two slots have very different implications for who could have acted on partial information and when. Monitoring and explorer tooling built for the one-message world will need a model of partial arrival, not just a single completion timestamp, once segmented gossip is live. It's an open engineering question for anyone building chain observability tools, not something anyone has shipped a solution for yet.

## The propagation problem is solved. The fairness problem isn't.

The 6.7x propagation speedup is real, benchmarked, and about to ship in two stages across Gloas and Hegotá. It answers the exact devnet question our earlier ePBS coverage flagged as unresolved: yes, a 1 MiB payload can reliably reach validators inside the timing budget, once you stop treating it as one message.

What it doesn't answer is whether the deadline that speed serves, the PTC vote, can be gamed the way the attestation deadline already can be. Ethereum is about to have two committee votes against two hard cutoffs inside a single slot instead of one. The network engineering half of that problem has a working fix with numbers to back it. The incentive half doesn't yet, and whether it gets one before Glamsterdam and Hegotá ship is worth watching.

## Frequently asked questions

### What is segmented payload broadcast in Ethereum?

Segmented payload broadcast splits an execution payload into fixed 32×32 KiB chunks gossiped as independent messages instead of one large message. This lets nodes forward segments they've already received while still waiting for others to arrive, pipelining the transfer across the network instead of serializing it. A devnet benchmark found this cut median propagation time for a 1 MiB payload from 4.89 seconds to 0.73 seconds.

### What is the Payload Timeliness Committee (PTC)?

The PTC is a 512-validator committee introduced by EIP-7732 (ePBS) that votes at roughly t=9 in a 12-second slot on whether the execution payload and its blobs arrived on time. Its vote depends on the payload having actually propagated to those validators within the available window, which is why propagation speed and the PTC deadline are directly linked.

### Is the Ethereum head-vote timing game the same issue as the PTC deadline problem?

They're related but distinct. The head-vote timing game exploits the existing attestation deadline (roughly t=4 in the slot): a proposer can delay a block just inside the plausible network-delay window to make honestly-timed validator votes incorrect after the fact, costing honest validators an average of 15.06% of rewards in modeled scenarios. The PTC vote at t=9 is a second, structurally similar deadline that segmentation research doesn't address, because segmentation solves broadcast speed, not the incentive to strategically delay within the deadline.

### When does segmented payload broadcast ship?

The rollout is split in two. The consensus-layer field (`execution_payload_segment_group_id` on `ExecutionPayloadBid`) ships at the Gloas upgrade. The networking and gossip rules that make segmentation effective activate at Hegotá, after client implementations get more production testing.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is segmented payload broadcast in Ethereum?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Segmented payload broadcast splits an execution payload into fixed 32x32 KiB chunks gossiped as independent messages instead of one large message. This lets nodes forward segments they've already received while still waiting for others to arrive, pipelining the transfer across the network instead of serializing it. A devnet benchmark found this cut median propagation time for a 1 MiB payload from 4.89 seconds to 0.73 seconds."
      }
    },
    {
      "@type": "Question",
      "name": "What is the Payload Timeliness Committee (PTC)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The PTC is a 512-validator committee introduced by EIP-7732 (ePBS) that votes at roughly t=9 in a 12-second slot on whether the execution payload and its blobs arrived on time. Its vote depends on the payload having actually propagated to those validators within the available window, which is why propagation speed and the PTC deadline are directly linked."
      }
    },
    {
      "@type": "Question",
      "name": "Is the Ethereum head-vote timing game the same issue as the PTC deadline problem?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They're related but distinct. The head-vote timing game exploits the existing attestation deadline (roughly t=4 in the slot): a proposer can delay a block just inside the plausible network-delay window to make honestly-timed validator votes incorrect after the fact, costing honest validators an average of 15.06% of rewards in modeled scenarios. The PTC vote at t=9 is a second, structurally similar deadline that segmentation research doesn't address, because segmentation solves broadcast speed, not the incentive to strategically delay within the deadline."
      }
    },
    {
      "@type": "Question",
      "name": "When does segmented payload broadcast ship?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The rollout is split in two. The consensus-layer field (execution_payload_segment_group_id on ExecutionPayloadBid) ships at the Gloas upgrade. The networking and gossip rules that make segmentation effective activate at Hegota, after client implementations get more production testing."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> Neuder, M. "epbs distilled." _ethresear.ch_, August 24, 2026. [https://ethresear.ch/t/epbs-distilled/25800](https://ethresear.ch/t/epbs-distilled/25800)

<span id="fn-2">2.</span> Vac/nim-libp2p contributors, potuz, raulk, nashatyrev, kamilsa, et al. "Wen fast payload broadcast? Segment codes, push, pull, and everything in between." _ethresear.ch_, 2026. [https://ethresear.ch/t/wen-fast-payload-broadcast-segment-code-push-pull-and-everything-in-between/25913](https://ethresear.ch/t/wen-fast-payload-broadcast-segment-code-push-pull-and-everything-in-between/25913)

<span id="fn-3">3.</span> Yolodannn, yzcrypto. "Timing the head in Ethereum PoS." _ethresear.ch_, 2026. [https://ethresear.ch/t/timing-the-head-in-ethereum-pos/25766](https://ethresear.ch/t/timing-the-head-in-ethereum-pos/25766)

<span id="fn-4">4.</span> Ethereum Foundation. "EIP-7732: Enshrined Proposer-Builder Separation (ePBS)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7732](https://eips.ethereum.org/EIPS/eip-7732)

<span id="fn-5">5.</span> Ethereum Foundation. "EIP-8081: Hegotá Network Upgrade Meta." _GitHub Pull Request #12255_, 2026. [https://github.com/ethereum/EIPs/pull/12255](https://github.com/ethereum/EIPs/pull/12255)
