---
title: "720 IP Addresses Is All It Takes to Isolate an Ethereum Node in 2026"
description: "A 2026 WWW paper eclipses post-Merge Ethereum nodes with a five-stage attack, reopening a threat the 2018 Kademlia fix was supposed to have closed."
date: 2026-10-01
tags:
  - Ethereum
  - Protocol
  - Networking
  - Security
  - Node Operations
keywords: []
image: "/blog/images/eclipse-attack-ethereum-node-isolation-2026.png"
ogImage: "/blog/images/eclipse-attack-ethereum-node-isolation-2026-og.png"
status: published
readingTime: 8
---

An operator restarts a full node after a routine OS patch. Nothing looks wrong. The node reconnects, syncs, starts serving RPC calls. No crash, no error in the logs.

What the operator can't see: the node's persistent peer database was seeded weeks earlier by an attacker who's been quietly replacing entries round after round. In the scramble of the restart, every one of its roughly 34 incoming slots and most of its outgoing connections get raced and won by the same handful of attacker-controlled hosts. The node is up. It's also alone, talking only to peers that control its entire view of the chain.

That's not a hypothetical. It's the result from a paper accepted to The Web Conference 2026 (WWW'26), running April 13 to 17 in Dubai: on Sepolia, 30 out of 30 trial restarts ended in a complete incoming-slot takeover within 30 seconds.<sup>[1](#fn-1)</sup> The authors, a team from Beijing University of Posts and Telecommunications and UNSW Sydney, built the first end-to-end eclipse attack against post-Merge Ethereum execution-layer nodes, and it works against mainnet too.

## What an eclipse attack actually buys an attacker

An eclipse attack doesn't crash a node or take it offline. It isolates it. Every peer connection the victim has, incoming and outgoing, quietly belongs to the attacker, while the node itself keeps running normally and shows no outward sign anything changed.

That matters because a node's view of the chain is only as good as the peers feeding it. A fully eclipsed node can be fed a manufactured chain state. The paper lists the downstream risks directly: deanonymization of the victim's transactions, selfish-mining setups, double-spend exposure, and manipulation of any smart-contract interaction that trusts what that one node reports.<sup>[1](#fn-1)</sup> Anything downstream of that node, including a service reading from it as its only source of truth, inherits the attacker's version of reality with no error to signal that something's wrong.

## 2018: cheap, and supposedly fixed

Eclipse attacks entered Ethereum's threat model in 2018, when Marcus, Heilman, and Goldberg showed that an attacker with just two hosts, each running one IP, could fully isolate a node.<sup>[2](#fn-2)</sup> The attack exploited Kademlia-derived table-insertion logic that bound no identity to a node entry, combined with the fact that a single IP could stand up many logical nodes at once.

The fix landed in geth 1.8 and 1.9: tighter node-ID binding, more aggressive trusted-peer seeding, and hardcoded bootnodes.<sup>[2](#fn-2)</sup> Afterward, Ethereum developers described the bar as raised high enough that eclipse attacks were "not feasible without more substantial resources." That's the exact claim the 2026 paper overturns.

That confidence held for about a year. In 2019, Henningsen, Teunis, and collaborators showed Geth's Kademlia-inspired discovery logic could still be eclipsed, this time with two hosts split across distinct /24 subnets, against long-running nodes.<sup>[3](#fn-3)</sup> That pushed further "low-invasive countermeasures" into geth 1.9.0. Read together, the two papers establish a pattern: patch, quiet period, new paper. The 2026 result continues it, not by beating the 2018 fix head-on, but by routing around it entirely through a discovery mechanism that didn't exist as an attack surface in 2018, and through precise timing of the restart window.

## 2026: five stages, 720 IP addresses

The WWW'26 attack runs in five stages, each targeting a different part of how a node finds and keeps peers.<sup>[1](#fn-1)</sup>

#### Stage 1: discovery table poisoning

The attacker sends unsolicited `Ping` messages to the target. Ethereum's passive discovery logic inserts the sender into the target's discovery table on receipt. Entries that survive five minutes migrate into the node's persistent database. The attacker runs this in rounds: kill the first batch, launch a fresh one every two hours, across six or more rounds, replacing honest entries with attacker ones over time. The paper reports 95% discovery-table occupancy within 24 hours on the first round, and later rounds reaching near-100% occupancy in about an hour.

#### Stage 2: DNS peerlist poisoning

This targets the official devp2p crawler that maintains Ethereum's EIP-1459 DNS node list. Attacker nodes register low-value ENR IDs, which the crawler ranks higher, then monitor `ENRRequest` timing to infer when the crawler is active and farm its scoring system: plus one point per successful `ENRResponse`, halved on failure, evicted below zero. Patient but cheap. The paper's timeline shows 50% of the list poisoned in roughly 100 days, 75% in 166 days, and full (worst-case) coverage in about 538 days. The authors call it the cheapest DNS-list attack reported against a cryptocurrency network.

#### Stage 3: network-wide slot occupation

Before the target restarts, attacker nodes fill as many *other* benign peers' spare incoming slots as possible, network-wide, so that when the target comes back online there's nowhere honest left to connect to. The paper reports about 90% of nodes with spare slots occupied within two hours.

#### Stage 4: outgoing connection hijacking

On restart, Ethereum has no active connection-eviction policy, so whichever peers respond fastest to Pings win the slot. A swarm of attacker nodes races to answer first. Combined with 50% DNS and database poisoning coverage, outgoing hijack success jumps from 45% to 95%.

#### Stage 5: incoming connection hijacking

Attacker nodes aggressively fill the target's roughly 34 incoming slots, racing a 30-second per-IP rate-limit window. Success: 100% (30 of 30) on Sepolia within 30 seconds, and 60% (24 of 40) on mainnet within two days, with 45% (18 of 40) already hijacked inside the first 30 seconds.

| Stage | Sepolia testnet | Mainnet |
|---|---|---|
| DB pre-filling IPs | 208 | 624 |
| DNS poisoning IPs | 28 | 28 |
| Slot occupation IPs | 200 (reused) | 200 (reused) |
| Outgoing hijack IPs | 28 | 28 |
| Incoming hijack IPs | 40 | 40 |
| **Total distinct IPs** | **304** | **720** |

The structural finding that makes all of this easier than it should be: the authors scanned over 2,000 public mainnet nodes and found more than 80% cap incoming slots at 10 or fewer. Only 2.8% of mainnet nodes had a spare incoming slot at scan time, versus 31.3% on Sepolia.<sup>[1](#fn-1)</sup> Most of the mainnet network is already "full," which is precisely the precondition Stage 3 needs to work.

## Why DNS discovery is the new seam

EIP-1459 defines Ethereum's DNS-based node list as a signed Merkle tree distributed via DNS TXT records: a signed root, branch entries, and ENR leaf entries, all under one secp256k1 key.<sup>[4](#fn-4)</sup> It was designed to scale bootstrap discovery beyond hardcoded bootnodes, not to resist an attacker gaming the crawler that maintains it.

The signature scheme itself isn't broken. The attacker's entries get legitimately signed and written into the tree because the crawler's own scoring logic, not the cryptography, is what gets manipulated. That's a gap the 2018 countermeasures had no way to anticipate, because DNS-based discovery didn't exist as a protocol feature yet.

## What this means if you run your own node

Ethernal's audience runs block explorer backends, L2 and L3 archive nodes, and indexing or RPC infrastructure that reads from a self-hosted node. Every one of those services inherits whatever that node believes about the chain. An eclipsed node doesn't throw an error. It keeps serving RPC calls and keeps looking healthy, while quietly propagating a different, attacker-controlled reality to everything downstream, including an indexer or block explorer with no independent way to notice.

A few things follow directly from the paper's own findings and mitigations, none of which have shipped in any client yet. Static or trusted peer lists reduce how much a restart depends on fresh discovery, since stages 4 and 5 both depend on the target having no warm peer set to fall back on. Peer diversity matters more than peer count, too: a node reporting 25 healthy peers that all sit in a handful of ASNs or IP ranges is a signal, not a comfort, and the paper's whole attack works because a homogeneous peer set is invisible to the metrics most operators actually watch.

"It reconnected" is not a health check. None of the paper's proposed fixes (ping-rate blacklisting above 5 pings per minute with escalating backoff, capping how many DNS-list entries can share one IP, a community-sourced DNS blacklist) are shipped in geth, Nethermind, Besu, Erigon, or Reth as of this writing. That's current exposure, not a historical footnote.

For infrastructure that reads from a single node as its only source of truth, the same peer-hygiene scrutiny that applies to the node's own security should apply to its P2P trust boundary. An indexing pipeline is only as trustworthy as the peer set backing the node it reads from.

## Where this goes next

The authors responsibly disclosed the attack to Ethereum's security team. The Ethereum Foundation acknowledged it and said it's "committed to improving the P2P layer," but no fix had shipped as of the paper's writing.<sup>[1](#fn-1)</sup> On the academic side, a near-contemporaneous 2026 proposal called AetherWeave sketches a stake-weighted, Sybil-resistant peer discovery scheme as a structural defense, though it remains speculative and unimplemented.<sup>[5](#fn-5)</sup>

Eclipse attacks aren't a bug that gets patched once and closed. They're a property of trusting a small, discoverable set of peers for a node's entire view of a distributed system. The 2018 fix closed the Kademlia table-insertion hole. It had no way to anticipate EIP-1459's DNS discovery, which didn't exist yet. Whatever discovery mechanism Ethereum adds next, be it DAS subnets or something else, reopens the same question from a new angle.

## Frequently asked questions

### What is an eclipse attack on Ethereum?

An eclipse attack isolates a node by taking over every peer connection it has, both incoming and outgoing, so the attacker controls its entire view of the network. The node keeps running normally and shows no error, but every piece of chain data it sees comes from the attacker, who can feed it a manufactured version of the chain.

### Didn't Ethereum already fix eclipse attacks in 2018?

Ethereum shipped countermeasures in geth 1.8 and 1.9 after a 2018 paper by Marcus, Heilman, and Goldberg showed a node could be isolated with just two attacker hosts. Those fixes addressed the specific Kademlia table-insertion flaw used at the time, and developers said the resource bar for a new attack had been raised significantly. A 2026 paper shows that bar can still be cleared, this time through DNS-based discovery (EIP-1459), which didn't exist as an attack surface in 2018.

### How many resources does the 2026 eclipse attack require?

The WWW'26 paper's full five-stage attack uses 304 distinct IP addresses against Sepolia testnet and 720 against mainnet. That covers discovery-table poisoning, DNS peerlist poisoning, network-wide slot occupation, and connection hijacking on both the outgoing and incoming side.

### What can node operators do about eclipse attacks today?

The paper's proposed mitigations (ping-rate blacklisting, capping DNS-list entries per IP, community-sourced DNS blacklists) have not shipped in any major execution client yet. In the meantime, operators get practical benefit from relying on static or trusted peer lists rather than fresh discovery alone at restart, and from monitoring peer diversity (IP range and ASN spread) rather than treating peer count or a clean reconnect as a sufficient health signal.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is an eclipse attack on Ethereum?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An eclipse attack isolates a node by taking over every peer connection it has, both incoming and outgoing, so the attacker controls its entire view of the network. The node keeps running normally and shows no error, but every piece of chain data it sees comes from the attacker, who can feed it a manufactured version of the chain."
      }
    },
    {
      "@type": "Question",
      "name": "Didn't Ethereum already fix eclipse attacks in 2018?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Ethereum shipped countermeasures in geth 1.8 and 1.9 after a 2018 paper by Marcus, Heilman, and Goldberg showed a node could be isolated with just two attacker hosts. Those fixes addressed the specific Kademlia table-insertion flaw used at the time, and developers said the resource bar for a new attack had been raised significantly. A 2026 paper shows that bar can still be cleared, this time through DNS-based discovery (EIP-1459), which didn't exist as an attack surface in 2018."
      }
    },
    {
      "@type": "Question",
      "name": "How many resources does the 2026 eclipse attack require?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The WWW'26 paper's full five-stage attack uses 304 distinct IP addresses against Sepolia testnet and 720 against mainnet. That covers discovery-table poisoning, DNS peerlist poisoning, network-wide slot occupation, and connection hijacking on both the outgoing and incoming side."
      }
    },
    {
      "@type": "Question",
      "name": "What can node operators do about eclipse attacks today?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The paper's proposed mitigations (ping-rate blacklisting, capping DNS-list entries per IP, community-sourced DNS blacklists) have not shipped in any major execution client yet. In the meantime, operators get practical benefit from relying on static or trusted peer lists rather than fresh discovery alone at restart, and from monitoring peer diversity (IP range and ASN spread) rather than treating peer count or a clean reconnect as a sufficient health signal."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> Shi, Liang, Guo, Wang, Lan, Wang, Zheng. "Eclipse Attacks on Ethereum's Peer-to-Peer Network." _The Web Conference 2026 (WWW'26)_, April 13–17, 2026. [https://arxiv.org/abs/2601.16560](https://arxiv.org/abs/2601.16560)

<span id="fn-2">2.</span> Marcus, Y., Heilman, E., Goldberg, S. "Low-Resource Eclipse Attacks on Ethereum's Peer-to-Peer Network." _IEEE EuroS&PW 2018 / Cryptology ePrint 2018/236_. [https://eprint.iacr.org/2018/236](https://eprint.iacr.org/2018/236)

<span id="fn-3">3.</span> Henningsen, S., Teunis, D. et al. "Eclipsing Ethereum Peers with False Friends." _arXiv:1908.10141_, 2019. [https://arxiv.org/pdf/1908.10141](https://arxiv.org/pdf/1908.10141)

<span id="fn-4">4.</span> Kadianakis, G., Garbellotto, F., Loerakker, F. "EIP-1459: Node Discovery via DNS." _Ethereum Improvement Proposals_. [https://eips.ethereum.org/EIPS/eip-1459](https://eips.ethereum.org/EIPS/eip-1459)

<span id="fn-5">5.</span> "AetherWeave: Sybil-Resistant Robust Peer Discovery with Stake." _arXiv:2603.23793_, 2026. [https://arxiv.org/abs/2603.23793](https://arxiv.org/abs/2603.23793)
