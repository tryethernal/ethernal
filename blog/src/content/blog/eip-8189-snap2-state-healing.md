---
title: "The Sync That Never Finishes: How snap/2 Replaces Trie Healing"
description: "EIP-8189 replaces snap/1's iterative trie healing with deterministic BAL replay. Here's why the old approach can't converge and what changes in snap/2."
date: 2026-06-10
tags:
  - EIP-8189
  - Ethereum
  - Snap Sync
  - L2
  - Glamsterdam
  - State Healing
keywords: []
image: "/blog/images/eip-8189-snap2-state-healing.png"
ogImage: "/blog/images/eip-8189-snap2-state-healing-og.png"
status: published
readingTime: 7
---

Four days. That's how long one operator ran snap sync on Geth v1.10.25 before checking the logs and finding this:

```
State heal in progress accounts=314,891@18.50MiB slots=393,108@29.70MiB
nodes=49,406,413@13.37GiB pending=30512
```

Forty-nine million trie nodes to traverse. After four days. On a 16 GB RAM machine with a 2 TB gp3 volume. The operator upgraded to Geth v1.11 and got a partial improvement. But the root cause wasn't a Geth bug.<sup>[1](#fn-1)</sup>

The healing counter can go backwards. A node that shows 94% healed on day 2 can show 91% on day 4. This is not a regression or a race condition in a specific client. It is a structural property of how snap/1 trie healing works.

[EIP-8189](https://github.com/ethereum/EIPs/pull/11391), authored by nerolation and merged into the EIPs repo in March 2026, replaces the trie healing mechanism entirely.<sup>[2](#fn-2)</sup> The fix ships with Glamsterdam, the same hard fork bringing [EIP-7928 Block-Level Access Lists](https://eips.ethereum.org/EIPS/eip-7928).<sup>[3](#fn-3)</sup> Here's what changes and why the old approach could not be patched into convergence.

## How snap sync works today

Snap sync is the default sync mode for most Ethereum execution clients. It proceeds in four phases:

1. **Account range download:** Fetch the flat account state at a pivot block (HEAD−64)
2. **Storage range download:** Fetch storage tries for all accounts with storage
3. **Bytecode download:** Fetch contract bytecodes
4. **Healing:** Fix inconsistencies caused by the chain advancing while phases 1–3 ran

The pivot block is what matters. By the time you finish downloading account and storage ranges, the chain has moved forward, potentially by hundreds of blocks. The snapshot you assembled reflects a mix of different historical states, because early-fetched ranges are already stale when later ranges arrive.

The healing phase's job is to clean this up. snap/1 does it with two wire protocol messages:

- `GetTrieNodes (0x06)`: Request state trie nodes by path (root hash + grouped paths + byte limit)
- `TrieNodes (0x07)`: Receive the requested nodes, with potential gaps at QoS limits

The syncing node traverses the trie, identifies nodes that don't match the canonical hash at the current chain head, requests correct versions, and repeats. It is iterative discovery: find a stale node, fetch it, find the stale nodes beneath it, fetch those.

## Why healing can't converge

snap/1 trie healing fails to reach completion for four structural reasons, not implementation bugs.

Discovery is sequential. You cannot know which trie nodes are stale without traversing the trie. Each round of healing exposes new stale nodes downstream of the ones just corrected. There is no way to enumerate the full repair set upfront. The protocol spec acknowledges this: healing must "progress faster than chain growth," a requirement it cannot enforce.

Individual trie nodes are 100–500 bytes. At 100ms round-trip latency, each `GetTrieNodes` request takes 100ms to complete. The log line above showed 49 million nodes pending. Even at one millisecond per request, that's 13 hours of network time, assuming the list doesn't grow. It will grow.

The chain adds roughly 2,000 trie nodes per block. If your healing rate falls below the chain's growth rate, even briefly, the backlog grows. The faster the chain, the harder convergence becomes. This is why healing gets worse on nodes with many active peers generating more state churn.

Serving `GetTrieNodes` requires random lookups in the state database. This is expensive on spinning disks and constrained on cloud volumes like Amazon EBS gp3. EIP-7870 specifies NVMe with approximately 50,000 random 4K read IOPS as the realistic minimum for a full node.<sup>[4](#fn-4)</sup> Operators running on gp3 volumes hit the IOPS ceiling during healing.

The result is **weak convergence**: snap/1 may eventually finish, but has no guaranteed upper bound. On slow hardware or fast chains, it may never finish at all.

**For block explorer operators**, a stuck-healing node means data gaps. Blocks arrive, but state transitions cannot be confirmed. Token balances read from a stale trie. Contract calls return wrong values. The explorer shows activity, but the underlying state is inconsistent.

## The snap/2 inversion

EIP-8189 replaces iterative trie discovery with deterministic BAL replay.

The old approach: start from the trie, discover what changed, fetch missing nodes. The new approach: know exactly which blocks elapsed during snapshot download, fetch their BALs, apply state changes sequentially.

The prerequisite is [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928), which adds a `block_access_list_hash` to every block header. The BAL records every account and storage slot touched during block execution, with post-execution values, RLP-encoded and committed cryptographically. A BAL mismatch invalidates the block. It is not an advisory field.<sup>[3](#fn-3)</sup>

snap/2 defines two new wire protocol messages, replacing `GetTrieNodes` and `TrieNodes`:

```
GetBlockAccessLists (0x08)  →  request BALs by block hash
BlockAccessLists    (0x09)  ←  receive BAL data
```

The healing algorithm becomes:

1. Download flat state at the pivot block (snap messages 0x00–0x05, unchanged from snap/1)
2. While downloading, the chain advances from HEAD−64 to a new HEAD
3. At completion: fetch BALs for every block in the elapsed window via `GetBlockAccessLists`
4. Apply each BAL's state diffs sequentially: update every storage slot, balance, nonce, and code entry to its post-execution value
5. Verify each BAL against the `block_access_list_hash` committed in its block header

That's the entire healing phase. No trie traversal. No iterative discovery.

### The numbers

The average BAL is approximately 72 KiB per block on mainnet, based on a 1,000-block sample.<sup>[5](#fn-5)</sup> The typical healing window (the blocks that elapsed during snapshot download) is around 64 blocks.

| | snap/1 | snap/2 |
|---|---|---|
| Data per healing unit | 100–500 bytes (trie node) | approximately 72 KiB (full block diff) |
| Round trips for 64-block window | Hundreds of thousands | 2–3 |
| Total healing data | Tens of gigabytes of trie traversal | ~4.5 MiB |
| Convergence guarantee | None | Bounded upfront |

At the 2 MiB soft limit per response, the 64-block BAL set arrives in 2–3 round trips. The set of blocks to heal is known before healing starts. Chain growth during healing just means fetching more BALs, not restarting discovery.

This is **strong convergence**: the repair set is enumerable, finite, and deterministic.

### Reorg handling

If the chain reorgs during snapshot download, snap/2 handles it cleanly: identify the state mutated on the abandoned fork, delete it locally, then re-apply the canonical BALs forward. The BAL hash in each header provides the verification anchor throughout. There are no ambiguous states to reconcile.

## Why it lives in snap, not eth/71

[EIP-8159](https://eips.ethereum.org/EIPS/eip-8159) adds BAL exchange to the main eth wire protocol (eth/71), with messages `GetBlockAccessLists (0x12)` and `BlockAccessLists (0x13)`.<sup>[6](#fn-6)</sup> The same capability, two different protocols. That is not redundancy.

The purposes are distinct:

- **eth/71 (EIP-8159):** Historical BAL retrieval during normal operation. Peers exchange BALs as part of ordinary chain sync, not specifically for state healing.
- **snap/2 (EIP-8189):** Snap sync healing , a dedicated satellite protocol for state download and repair.

The design principle from the EIP-8189 spec: synchronization primitives belong in satellite protocols. Snap is independently versioned and optional. If a future snap/3 wants to serve only compact state diffs instead of full BALs, it can do so without touching the core eth protocol. The separation preserves the ability to evolve sync independently of block exchange , the same separation that made snap/1 possible in the first place, following precedent from eth/67 and eth/69.

Backward compatibility is preserved through devp2p version negotiation. Nodes that do not support snap/2 continue running snap/1. No flag day.

## What changes after Glamsterdam

**For block explorer operators:** The healing phase has a bounded duration. The counter will not go backwards. Downtime from sync gaps becomes predictable, not open-ended.

**For L2 node operators:** Sync restarts are cheaper. You know exactly how many blocks of BALs you need before starting. A chain with a 10-minute snapshot download window needs roughly 50 blocks of BALs. The repair completes in seconds, not days.

**For client teams:** Two messages removed (`GetTrieNodes`, `TrieNodes`), two added (`GetBlockAccessLists`, `BlockAccessLists`). snap/1 capability remains required for backward compatibility during the transition period. Both snap versions negotiate via devp2p as before.

**Hardware still matters.** EIP-7870's updated recommendations , 4 TB NVMe, 32 GB RAM, 50 Mbps bandwidth for a full node , remain relevant.<sup>[4](#fn-4)</sup> BAL verification is CPU-light, but applying state diffs still requires fast random writes to the state database. NVMe is the right floor.

## The architectural point

snap/1 healing was designed for a world where BALs don't exist. Without a committed record of what changed in each block, the only way to repair a stale snapshot is to traverse the trie and rediscover what's wrong. That traversal is iterative, unbounded, and races against a chain that never stops moving.

EIP-8189 doesn't optimize the old approach. It replaces the mechanism. The chain already knows what changed in every block , that's what the BAL records. snap/2 simply uses that information instead of rediscovering it from scratch.

Two messages in, two messages out. A few megabytes instead of tens of gigabytes of trie traversal. The Glamsterdam change that L2 operators will feel before they fully understand why.

---

## References

<span id="fn-1">1.</span> Various contributors. "Snap sync stuck healing for 4 days." _GitHub / ethereum/go-ethereum_, Issue #25945, 2022. [https://github.com/ethereum/go-ethereum/issues/25945](https://github.com/ethereum/go-ethereum/issues/25945)

<span id="fn-2">2.</span> nerolation. "Add EIP: snap/2 , BAL-Based State Healing." _GitHub / ethereum/EIPs_, PR #11391, March 2026. [https://github.com/ethereum/EIPs/pull/11391](https://github.com/ethereum/EIPs/pull/11391)

<span id="fn-3">3.</span> ethpandaops team. "EIP-7928: Block-Level Access Lists." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7928](https://eips.ethereum.org/EIPS/eip-7928)

<span id="fn-4">4.</span> Various contributors. "EIP-7870: Hardware and Bandwidth Recommendations for Ethereum Clients." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7870](https://eips.ethereum.org/EIPS/eip-7870)

<span id="fn-5">5.</span> nerolation. "snap v2: Replacing Trie Healing with BALs." _ethresear.ch_, March 2026. [https://ethresear.ch/t/snap-v2-replacing-trie-healing-with-bals/24333](https://ethresear.ch/t/snap-v2-replacing-trie-healing-with-bals/24333)

<span id="fn-6">6.</span> Toni Wahrstätter. "EIP-8159: eth/71 Block Access List Exchange." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8159](https://eips.ethereum.org/EIPS/eip-8159)
