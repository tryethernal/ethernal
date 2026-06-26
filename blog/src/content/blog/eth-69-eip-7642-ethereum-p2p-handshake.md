---
title: "The Handshake That Finally Admits What History You Have"
description: "eth/69 (EIP-7642) ships in Fusaka: total difficulty removed, block range advertised, and 530 GB of bloom filter data cut from the full sync path."
date: 2026-06-26
tags:
  - Ethereum
  - EIP-7642
  - Protocol
  - Networking
  - Fusaka
  - Node Operations
keywords: []
image: "/blog/images/eth-69-eip-7642-ethereum-p2p-handshake.png"
ogImage: "/blog/images/eth-69-eip-7642-ethereum-p2p-handshake-og.png"
status: published
readingTime: 7
---

eth/69 (EIP-7642) changes how Ethereum peers advertise their available block history. Shipped in Fusaka on December 3, 2025,<sup>[2](#fn-2)</sup><sup>[6](#fn-6)</sup> it replaces the frozen total-difficulty field with earliestBlock, latestBlock, and latestBlockHash, and removes 530 GB of redundant Bloom filter data from full syncs.

You're syncing a block explorer backend, or maybe an archive node for an L2 you operate. You request block 8,000,000 (pre-merge) from a peer. The handshake succeeded: same genesis, same fork ID, same network ID. The peer accepted your connection without complaint. You send `GetBlockBodies`. The peer responds with an empty list.

You retry with three other peers. Same result. No errors, no rejection messages. Just empty responses where block data should be.

What you couldn't know under eth/68, Ethereum's previous execution layer peer protocol, is that all four of those peers had pruned their pre-merge history in mid-2025, after the Ethereum Foundation announced official support for partial history expiry.<sup>[1](#fn-1)</sup> The protocol gave you no mechanism to learn that before making the request. You discovered the gap only by failing. Peers now advertise their block range at the start of every connection and update it dynamically as they prune. The failure described above doesn't disappear entirely, but it becomes preventable: you can route around unavailable peers before sending requests they can't serve.

## Three years of a field nobody used

eth/68's Status message carries six fields:

```
[version, networkid, td, blockhash, genesis, forkid]
```

`td` is total difficulty, the cumulative proof-of-work hash that pre-merge clients used to identify the heaviest chain. After The Merge on September 15, 2022, at block 15,537,394, all new blocks have zero difficulty. Total difficulty froze at its terminal value (approximately 58,750,003,716,598,352,816,469) and has never changed since.

Every peer connection on the Ethereum execution layer between September 2022 and December 2025 included a `td` field whose value was always identical, drove no protocol logic, and was never acted on. Three years of dead weight in every handshake.

eth/69 removes `td` entirely and replaces it with three fields that actually change:<sup>[2](#fn-2)</sup>

```
[version, networkid, genesis, forkid, earliestBlock, latestBlock, latestBlockHash]
```

`earliestBlock` is the oldest block number the peer is willing to serve. `latestBlock` and `latestBlockHash` replace the old `blockhash` field while making the meaning unambiguous. The version number itself reflects a competitor that didn't make the cut. As Marius van der Wijden wrote in the Ethereum Magicians thread: "I've decided to rename this proposal to `eth/69` since the other proposal for `eth/69` (EIP-7542) is unlikely to go in before this proposal."<sup>[3](#fn-3)</sup>

## What history expiry did to the network

The Status message redesign would have happened eventually as post-merge cleanup. What made it urgent was the partial history expiry rollout.

[EIP-4444](https://eips.ethereum.org/EIPS/eip-4444) permits execution clients to prune pre-merge block bodies and receipts once they exceed 82,125 epochs in age (roughly one Earth year).<sup>[4](#fn-4)</sup> For pre-merge data specifically, a Phase 1 cutoff was established: clients could drop pre-merge block bodies and receipts after May 1, 2025.<sup>[2](#fn-2)</sup> The Ethereum Foundation announced official support on July 8, 2025, and all five major clients shipped within months:<sup>[1](#fn-1)</sup>

| Client | Version | Flag / behavior |
|--------|---------|-----------------|
| Geth | v1.16.0+ | `geth prune-history` / `--history.chain postmerge` |
| Nethermind | v1.32.2+ | Activated by default on new syncs |
| Besu | v25.7.0+ | Online or offline pruning |
| Erigon | v3.0.12+ | `--history-expiry` flag |
| Reth | v1.5.0+ | Receipt-specific pruning flags |

The storage freed by removing pre-merge data runs 300 to 500 GB per node.<sup>[1](#fn-1)</sup> Nodes can now fit comfortably on a 2 TB drive.

The consequence for the network is a fragmented history distribution. A peer running default Nethermind has an `earliestBlock` near 15,537,394 (the merge block). A peer that hasn't pruned serves from block 0. A peer with a rolling 1-year window has an `earliestBlock` advancing continuously forward. Under eth/68, these nodes looked identical at handshake time. Under eth/69, they announce the difference before you send a single request.

Historical data that is no longer available over P2P doesn't vanish permanently. The EF's guidance relies on a 1-of-N trust model: at least one entity retains the full chain, and the rest can retrieve externally.<sup>[1](#fn-1)</sup> Community mirrors and torrent files are catalogued at [eth-clients.github.io/history-endpoints](https://eth-clients.github.io/history-endpoints/). The Portal Network, a separate p2p system designed for content-addressed historical data retrieval, is the intended long-term infrastructure.<sup>[5](#fn-5)</sup>

## The BlockRangeUpdate message

The Status message exchange happens once, at connection time. But history expiry is ongoing. A node that connects with `earliestBlock: 15537394` today might advance that number next week after a scheduled prune job runs.

eth/69 adds a new message type for exactly this case: message 0x11, `BlockRangeUpdate`.<sup>[2](#fn-2)</sup>

```
[earliestBlock, latestBlock, latestBlockHash]
```

A node sends this message whenever its served block range changes. The design avoids two failure modes: firing per-prune-event (too chatty for a node pruning block-by-block) and never sending mid-connection updates (leaves peers with stale range information). The rate limit settles between those extremes: one `BlockRangeUpdate` per epoch, no more than once per 32 blocks, roughly every 6.4 minutes.

A node running an overnight prune operation will advance its `earliestBlock` over several hours. Peers connected throughout that window receive incremental updates, each one narrowing the effective history range they can expect. The update replaces the silent empty-response failure with a tracked state transition: the peer told you it was pruning, you tracked it, you stopped sending requests it couldn't serve.

## The bloom filter nobody was storing

The receipt struct redesign in eth/69 is independent of the history expiry story but lands in the same upgrade.

In eth/68, receipts are transmitted with this structure:

```
[tx-type, post-state-or-status, cumulative-gas, bloom, logs]
```

`bloom` is a 256-byte Bloom filter per receipt, one per transaction, containing the aggregate of all log topics and addresses for that transaction. Bloom filters support fast log queries: check the filter before scanning the full log list, skip if the filter doesn't match.

Bloom filters are fully recomputable from the logs. Given the logs, you rebuild the filter with no additional information. Execution clients do not store synced receipt Bloom filters at rest; they regenerate on demand.

But during sync, those 256 bytes per receipt were transmitted across the wire for every receipt, even though the receiving node would immediately discard them and reconstruct on demand when needed.

eth/69 removes `bloom` from the receipt struct entirely:<sup>[2](#fn-2)</sup>

```
[tx-type, post-state-or-status, cumulative-gas, logs]
```

The bandwidth savings: roughly 530 GB per full sync. That figure is additive to the 300 to 500 GB freed by history expiry storage pruning, though they measure different things. The Bloom removal affects sync bandwidth. History expiry affects persistent storage. Both reduce load on the same nodes.

The 530 GB figure stands out because it comes from a two-word change to a struct definition. No new protocol mechanism, no coordination across clients required. Just a field that had been transmitted for years, never stored, never used for anything that couldn't be derived from the logs it was computed from.

## What this means for historical data tools

Block explorers and indexers depend on historical block and receipt data. The history expiry rollout changes things for anyone relying on "query a local node" as a retrieval path for pre-merge data.

Under eth/69, infrastructure operators can use `earliestBlock` as a routing criterion before sending requests. This is strictly better than eth/68's approach of sending requests and learning about the gap from empty responses. But peer selection only helps if there are peers willing to serve the ranges you need.

For operators who require pre-merge history, the practical options are: configure your own node not to prune, maintain a dedicated archive node, or source data from the mirrors listed at eth-clients.github.io/history-endpoints. EIP-4444's long-term vision is a rolling 1-year history window across the general P2P network, with the Portal Network handling everything older. That transition isn't complete yet, but eth/69's `earliestBlock` field is the mechanism that makes it navigable when it is.<sup>[4](#fn-4)</sup>

The architectural lesson from history expiry is one block explorers have always addressed in practice: index at ingestion time, store in your own database, don't depend on live node P2P calls for historical data. The underlying node's current `earliestBlock` is irrelevant to an indexer that wrote the data to its own database when the block first arrived. What eth/69 makes explicit at the protocol level, indexing infrastructure addresses by making historical access independent of the node's current pruning state.

Ethernal indexes transactions, logs, and state changes as each block syncs. Historical queries go to the database, not back through the node's P2P stack. As more nodes on the network advance their `earliestBlock`, this architecture becomes the stable foundation for historical access regardless of how the network's history distribution evolves.

## The protocol tells the truth now

eth/69 is a cleanup upgrade with three independent results.

Total difficulty's removal closes a three-year chapter. A field carried in every handshake since September 2022, always the same frozen value, driving no protocol decisions, is gone. The three new fields that replace it (`earliestBlock`, `latestBlock`, `latestBlockHash`) carry operational meaning that changes over time and informs routing decisions.

The `BlockRangeUpdate` message adds continuous state tracking to what was previously a one-time advertisement. Nodes can prune incrementally and announce the change to connected peers rather than leaving them to discover it through failed requests.

The Bloom filter removal saves 530 GB of sync bandwidth through a single struct field deletion.

Together with history expiry and the Portal Network roadmap, eth/69 is one piece of Ethereum's transition from a network where every node implicitly claimed to serve all history, to a network where nodes advertise what they actually have. That transition has been underway since The Merge. eth/69 is the point where the P2P handshake itself caught up.

## Frequently asked questions

### What is eth/69?

eth/69 is version 69 of the Ethereum execution layer peer protocol, defined in [EIP-7642](https://eips.ethereum.org/EIPS/eip-7642) and shipped in the Fusaka upgrade on December 3, 2025. It replaces the `td` (total difficulty) field in the Status message with `earliestBlock`, `latestBlock`, and `latestBlockHash`. It also adds a `BlockRangeUpdate` message for mid-connection range updates and removes the Bloom filter field from transmitted receipt structs.

### What did eth/68 get wrong about total difficulty?

Nothing wrong exactly. `td` was a valid chain selection field pre-merge. After The Merge on September 15, 2022, all blocks have zero difficulty and total difficulty is frozen. The field became meaningless for protocol decisions but remained in every handshake for three years before eth/69 removed it.

### How much bandwidth does eth/69 save during a full sync?

The Bloom filter removal saves approximately 530 GB per full sync. This is separate from the 300 to 500 GB of persistent storage freed by history expiry pruning (EIP-4444). The two savings measure different things: sync bandwidth versus stored disk usage.

### What happens to pre-merge Ethereum history under history expiry?

Pre-merge block bodies and receipts are no longer served by most execution clients on the default P2P network. Nodes can retrieve this data from community mirrors and torrent files at eth-clients.github.io/history-endpoints. The Portal Network is the intended long-term system for content-addressed historical data retrieval. eth/69's `earliestBlock` field lets nodes advertise which history they serve, so peers can route requests accordingly.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is eth/69?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "eth/69 is version 69 of the Ethereum execution layer peer protocol, defined in EIP-7642 and shipped in the Fusaka upgrade on December 3, 2025. It replaces the td (total difficulty) field in the Status message with earliestBlock, latestBlock, and latestBlockHash. It also adds a BlockRangeUpdate message for mid-connection range updates and removes the Bloom filter field from transmitted receipt structs."
      }
    },
    {
      "@type": "Question",
      "name": "What did eth/68 get wrong about total difficulty?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nothing wrong exactly. td was a valid chain selection field pre-merge. After The Merge on September 15, 2022, all blocks have zero difficulty and total difficulty is frozen. The field became meaningless for protocol decisions but remained in every handshake for three years before eth/69 removed it."
      }
    },
    {
      "@type": "Question",
      "name": "How much bandwidth does eth/69 save during a full sync?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Bloom filter removal saves approximately 530 GB per full sync. This is separate from the 300 to 500 GB of persistent storage freed by history expiry pruning (EIP-4444). The two savings measure different things: sync bandwidth versus stored disk usage."
      }
    },
    {
      "@type": "Question",
      "name": "What happens to pre-merge Ethereum history under history expiry?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Pre-merge block bodies and receipts are no longer served by most execution clients on the default P2P network. Nodes can retrieve this data from community mirrors and torrent files at eth-clients.github.io/history-endpoints. The Portal Network is the intended long-term system for content-addressed historical data retrieval. eth/69's earliestBlock field lets nodes advertise which history they serve, so peers can route requests accordingly."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> Ethereum Foundation. "Partial History Expiry." _blog.ethereum.org_, July 8, 2025. [https://blog.ethereum.org/2025/07/08/partial-history-exp](https://blog.ethereum.org/2025/07/08/partial-history-exp)

<span id="fn-2">2.</span> SamWilsn; van der Wijden, Marius. "EIP-7642: eth/69 - Drop pre-merge fields from eth protocol." _Ethereum Improvement Proposals_, Final. [https://eips.ethereum.org/EIPS/eip-7642](https://eips.ethereum.org/EIPS/eip-7642)

<span id="fn-3">3.</span> Ethereum Magicians. "EIP-7642: eth/69 - Drop pre-merge fields from eth protocol." _ethereum-magicians.org_. [https://ethereum-magicians.org/t/eip-7642-eth-69-drop-pre-merge-fields-from-eth-protocol/19005](https://ethereum-magicians.org/t/eip-7642-eth-69-drop-pre-merge-fields-from-eth-protocol/19005)

<span id="fn-4">4.</span> lightclient; Lange, Felix. "EIP-4444: Bound Historical Data in Execution Clients." _Ethereum Improvement Proposals_. [https://eips.ethereum.org/EIPS/eip-4444](https://eips.ethereum.org/EIPS/eip-4444)

<span id="fn-5">5.</span> Ethereum Foundation. "Protocol Priorities Update for 2026." _blog.ethereum.org_, February 18, 2026. [https://blog.ethereum.org/2026/02/18/protocol-priorities-update-2026](https://blog.ethereum.org/2026/02/18/protocol-priorities-update-2026)

<span id="fn-6">6.</span> Conduit. "Ethereum Fusaka Upgrade EIPs Cheat Sheet." _conduit.xyz_, 2025. [https://www.conduit.xyz/blog/ethereum-fusaka-upgrade-eips-cheat-sheet/](https://www.conduit.xyz/blog/ethereum-fusaka-upgrade-eips-cheat-sheet/)
