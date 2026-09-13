---
title: "Ethereum's Block Gossip Has a Bandwidth Problem. The Fix Trades Away Security on Purpose."
description: "A 2026 ethresear.ch proposal optimizes RLNC block propagation by shrinking a formal security margin, and says so explicitly, with the math shown."
date: 2026-09-13
tags:
  - Ethereum
  - Protocol
  - Networking
  - Security
keywords: []
image: "/blog/images/rlnc-bandwidth-security-tradeoff-ethereum.png"
ogImage: "/blog/images/rlnc-bandwidth-security-tradeoff-ethereum-og.png"
status: published
readingTime: 8
---

A 110KB Ethereum block takes roughly 6 to 7 gossip hops to cross the network today, and most of the bandwidth spent getting it there is waste: peers rebroadcasting data that other peers already have.<sup>[1](#fn-1)</sup> A January 2025 proposal from researcher potuz fixes that with random linear network coding (RLNC), cutting propagation to 3 to 4 hops and bandwidth overhead to roughly 5% of what Gossipsub uses today.<sup>[1](#fn-1)</sup> A February 2026 follow-up goes further, proposing five ways to shrink the coding overhead even more.<sup>[2](#fn-2)</sup>

Buried in that follow-up is a sentence worth stopping on: squeezing the coefficients this hard measurably shrinks a formal security bound, and the author says that's acceptable because the starting margin was "complete overkill" for Ethereum's actual threat model.<sup>[2](#fn-2)</sup> That's the interesting part of this thread. Not the bandwidth win, the fact that someone quantified exactly what it costs and published the number.

## Why block gossip is slow in the first place

Ethereum's gossip layer, Gossipsub, moves blocks by flooding: each node that receives a block forwards the whole thing to a handful of peers, typically around 8.<sup>[1](#fn-1)</sup> Those peers forward it again, and so on, until the network has it. The problem is redundancy. A peer connected to five neighbors who all already have the block still gets sent the same 110KB payload five times, and the network only moves forward one hop at a time regardless of how many parallel paths exist.

For a chain running a 12-second slot, propagation delay isn't cosmetic. A block that takes longer to reach the network eats into the window validators have to see it, verify it, and attest before the slot's deadline. It's the same category of problem as the payload-timing issues coming out of ePBS research, just one layer down: how fast can a piece of data physically get everywhere it needs to be.<sup>[1](#fn-1)</sup> For anyone running an L2 or L3 with its own P2P layer, or just running nodes and watching for sync lag, propagation speed is the raw material every downstream latency number is built from.

## What random linear network coding actually changes

Instead of forwarding whole blocks, RLNC forwards combinations of blocks. Split a block into N chunks. Rather than sending complete chunks to around 8 peers, a node sends random linear combinations of those chunks to a wider set, around 40 peers.<sup>[1](#fn-1)</sup> A combination looks like this, over a finite field:

```
combination = c1·chunk1 + c2·chunk2 + ... + cN·chunkN
```

Each `ci` is a randomly chosen coefficient. Once a receiving node has collected N independent combinations, it can solve the resulting linear system and recover all N original chunks, even though no single message it received was a complete chunk. The benefit compounds because a node doesn't need the exact same chunk relayed to it twice; any sufficiently independent combination from any neighbor adds new information, so gathering data in parallel from different peers is strictly useful instead of mostly redundant.

potuz's benchmarks show propagation dropping from 6 to 7 hops to 3 to 4, bandwidth overhead falling to about 5% of current Gossipsub levels, and wasted (redundant) bandwidth dropping to 28% of what Gossipsub wastes today. CPU cost is modest: about 26ms for the proposer encoding the chunks and about 29.6ms for a receiver decoding them, and both are parallelizable.<sup>[1](#fn-1)</sup>

## The failure mode plain gossip never had

Flooding gossip has a simple safety property: a bad or invalid packet gets dropped, and nothing downstream is affected. The rest of the network never sees it.

Network coding doesn't have that property by default, because it works by mixing data *inside* the network rather than just relaying it. Every intermediate node combines what it received into new combinations before forwarding them again. If one of the inputs to that combination is malicious or corrupted, the resulting combination is corrupted too, and every subsequent combination that mixes with it inherits the contamination. A single bad chunk, injected at the right point, can poison reconstruction for every downstream peer that touches it.

This is a well-studied failure mode in coding theory, usually called a pollution attack or Byzantine attack on network coding, and it traces back to Boneh, Freeman, Katz, and Waters' 2009 formal treatment of linearly homomorphic signatures as a defense.<sup>[3](#fn-3)</sup> The standard fix lets a node verify, using a signature scheme that's homomorphic with respect to linear combination, that a received combination is a legitimate mix of *signed* original data, without needing to see the original data first.

potuz's original proposal already builds this in. Small coefficients could leak which peer a chunk originated from, a subtle privacy issue, so coefficients are randomized rather than minimized. Pedersen commitments let a receiving node validate a chunk's authenticity before mixing it into further combinations and rebroadcasting, which is exactly what stops one bad chunk from cascading.<sup>[1](#fn-1)</sup>

## The optimization, and what it costs

The February 2026 follow-up, from GottfriedHerold with input from Arantxa Zapico and Benedikt Wagner, targets a specific remaining cost: transmitting the coefficients themselves.<sup>[2](#fn-2)</sup> Sending N coefficients per message costs N·log2(|F|) bits, where F is the finite field the coefficients are drawn from. On top of the payload data itself, that's real overhead.

The follow-up proposes five techniques, roughly in order of sophistication:

| Technique | What it saves | Where it's weakest |
|---|---|---|
| Small coefficients | Bounds coefficients to a range [-B, B], cutting bits from N·log2\|F\| to N·log2(2B+1) | Coefficient magnitude grows exponentially with hop count, so gains fade past the first few hops |
| Tree of hashes | Sends a hash seed instead of a coefficient vector; receiver regenerates coefficients deterministically | Large first-hop savings, worse growth deeper into the propagation tree |
| Projective coordinates | Only the coefficient subspace matters, so normalize the first nonzero entry to 1 and drop it | Saves roughly one field element per message, a fixed rather than compounding gain |
| Reducing known subspaces | If sender and receiver already share k chunks worth of information, only transmit coefficients orthogonal to what the receiver has, roughly N−k elements instead of N | Requires the two peers to already have overlapping state to reduce against |
| Sparse coefficient sets | Structured randomness (coefficients as a polynomial r_i = s^(i-1)) combined with subspace reduction | Most complex to implement and reason about |

The subspace-reduction approach is flagged as the most promising of the five.<sup>[2](#fn-2)</sup>

Here's the trade-off, stated plainly in the follow-up: every one of these techniques works by shrinking the set of possible coefficients, and the RLNC soundness guarantee depends directly on how large that set is. The relevant failure probability is p = 1/|S|, where S is the set coefficients are drawn from. A smaller S means fewer possible coefficients, which means a higher chance that two independently generated combinations collide, or that a forged combination happens to pass verification undetected.<sup>[2](#fn-2)</sup> Shrinking bandwidth and shrinking that probability's denominator are the same move.

The author's justification is direct: Ethereum's baseline RLNC security margin is "complete overkill" for the real threat model, so there's room to spend some of it on bandwidth.<sup>[2](#fn-2)</sup> That's not hand-waving. It's paired with the actual backstop, the same linearly homomorphic signature scheme referenced above, which independently verifies that a combination legitimately derives from signed original chunks. Shrinking the coefficient space lowers the raw information-theoretic margin against accidental collision, but it doesn't lower the cryptographic bar against a forged, malicious combination, because that check doesn't depend on coefficient space size at all. The two defenses are doing different jobs, and the optimization only touches one of them.

Worth distinguishing from a coding technique covered here before: PeerDAS (EIP-7594) uses erasure coding for data availability sampling, letting a node verify a blob is available without downloading all of it.<sup>[4](#fn-4)</sup> RLNC here is solving a different problem at a different layer, how fast a block or blob physically propagates across the gossip network once you've decided to send it. Availability verification and propagation speed are both coding-theory problems on Ethereum right now, but they don't overlap.

## Why this is worth watching if you run infrastructure

"Coding gives you bandwidth for free" is never actually free. It trades against a formal, quantifiable security parameter, whether or not anyone bothers to compute what that parameter is. The responsible version of this trade, which is what this thread models, states the new failure probability explicitly and pairs any shrinkage with an independent cryptographic check rather than just shipping the bandwidth win and moving on.

For teams operating their own L2 or L3 gossip layer, or anyone running nodes and watching for drift, this is the kind of protocol-layer decision that eventually shows up as an observable symptom three layers removed from the actual cause: sync lag, a stale block height, a node's health metrics quietly degrading. Explorer and monitoring tooling that surfaces sync freshness is often the first place this kind of thing becomes visible, long before anyone traces it back to a coefficient-space tuning decision made months earlier in a research thread.

## The fix is the visible line item. The bill is the quiet one.

Cutting block propagation from 7 hops to 3 is the headline. The quieter change is a security bound with a name and a number attached to it, published in the open, discussed and justified months before it would ever reach mainnet. That's what mature protocol engineering looks like: not the absence of trade-offs, but trade-offs made explicit enough that someone else can check the arithmetic.

## Frequently asked questions

### What is random linear network coding (RLNC) in Ethereum?

RLNC is a proposed replacement for how Ethereum's gossip network propagates blocks and blobs. Instead of forwarding whole blocks to a small set of peers, a node splits a block into chunks and forwards random linear combinations of those chunks to a wider set of peers. A receiver reconstructs the original block once it has collected enough independent combinations to solve the resulting linear system. Benchmarks from the original January 2025 proposal show this cutting propagation from 6 to 7 hops down to 3 to 4, with bandwidth overhead around 5% of current Gossipsub levels.

### Why does optimizing RLNC coefficients reduce security?

RLNC's soundness relies on coefficients being drawn from a large set, with failure probability p = 1/|S| where S is that set. Techniques that shrink the coefficients to save bandwidth, such as bounding their range or reusing known subspaces, necessarily shrink S, which raises the probability that two independently generated combinations collide or that a forged combination isn't caught. The February 2026 optimization proposal states this trade-off explicitly and argues Ethereum's baseline margin has enough slack to absorb it.

### How is a pollution attack on RLNC different from a bad packet in normal gossip?

In flooding-style gossip, a bad or invalid packet is simply dropped by honest nodes and never combined with anything else. In network coding, intermediate nodes mix received data into new combinations before fully verifying it, so a single malicious or corrupted combination can contaminate every combination derived from it downstream. This pollution-attack risk is specific to coding-based propagation and doesn't exist in plain replication gossip, which is why RLNC proposals pair the coding layer with cryptographic defenses like Pedersen commitments and linearly homomorphic signatures.

### Is RLNC the same as PeerDAS or data availability sampling?

No. PeerDAS (EIP-7594) uses erasure coding so a node can verify a blob is available without downloading the whole thing, solving a data availability problem at the consensus layer. RLNC targets propagation speed, how quickly a block or blob physically spreads across the P2P gossip network once a node decides to broadcast it. Both use coding theory, but they solve different problems at different layers of the stack.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is random linear network coding (RLNC) in Ethereum?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "RLNC is a proposed replacement for how Ethereum's gossip network propagates blocks and blobs. Instead of forwarding whole blocks to a small set of peers, a node splits a block into chunks and forwards random linear combinations of those chunks to a wider set of peers. A receiver reconstructs the original block once it has collected enough independent combinations to solve the resulting linear system. Benchmarks from the original January 2025 proposal show this cutting propagation from 6 to 7 hops down to 3 to 4, with bandwidth overhead around 5% of current Gossipsub levels."
      }
    },
    {
      "@type": "Question",
      "name": "Why does optimizing RLNC coefficients reduce security?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "RLNC's soundness relies on coefficients being drawn from a large set, with failure probability p = 1/|S| where S is that set. Techniques that shrink the coefficients to save bandwidth, such as bounding their range or reusing known subspaces, necessarily shrink S, which raises the probability that two independently generated combinations collide or that a forged combination isn't caught. The February 2026 optimization proposal states this trade-off explicitly and argues Ethereum's baseline margin has enough slack to absorb it."
      }
    },
    {
      "@type": "Question",
      "name": "How is a pollution attack on RLNC different from a bad packet in normal gossip?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In flooding-style gossip, a bad or invalid packet is simply dropped by honest nodes and never combined with anything else. In network coding, intermediate nodes mix received data into new combinations before fully verifying it, so a single malicious or corrupted combination can contaminate every combination derived from it downstream. This pollution-attack risk is specific to coding-based propagation and doesn't exist in plain replication gossip, which is why RLNC proposals pair the coding layer with cryptographic defenses like Pedersen commitments and linearly homomorphic signatures."
      }
    },
    {
      "@type": "Question",
      "name": "Is RLNC the same as PeerDAS or data availability sampling?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. PeerDAS (EIP-7594) uses erasure coding so a node can verify a blob is available without downloading the whole thing, solving a data availability problem at the consensus layer. RLNC targets propagation speed, how quickly a block or blob physically spreads across the P2P gossip network once a node decides to broadcast it. Both use coding theory, but they solve different problems at different layers of the stack."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> potuz. "Faster block/blob propagation in Ethereum." _ethresear.ch_, January 3, 2025. [https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370)

<span id="fn-2">2.</span> GottfriedHerold. "RLNC Optimizations." _ethresear.ch_, February 18, 2026. [https://ethresear.ch/t/rlnc-optimizations/24149](https://ethresear.ch/t/rlnc-optimizations/24149)

<span id="fn-3">3.</span> Boneh, D., Freeman, D., Katz, J., Waters, B. "Signing a Linear Subspace: Signature Schemes for Network Coding." _Public Key Cryptography (PKC) 2009_, 2009. [https://eprint.iacr.org/2008/316](https://eprint.iacr.org/2008/316)

<span id="fn-4">4.</span> Ethereum Foundation. "EIP-7594: PeerDAS - Peer Data Availability Sampling." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7594](https://eips.ethereum.org/EIPS/eip-7594)
