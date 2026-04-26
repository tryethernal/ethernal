---
title: "One Block Field, Three Hard Problems: Inside EIP-7928's Block-Level Access Lists"
description: "EIP-7928 adds one field to every block header and unlocks parallel execution, deterministic state healing, and executionless sync. Here's how it works."
date: 2026-04-26
tags:
  - EIP-7928
  - L2
  - Ethereum
  - Glamsterdam
  - Parallel Execution
  - Snap Sync
image: "/blog/images/eip-7928-block-level-access-lists.png"
ogImage: "/blog/images/eip-7928-block-level-access-lists-og.png"
status: published
readingTime: 7
---

You're running an L2 node. You check sync status. "Healing: 94% complete." You come back two days later. "Healing: 91% complete."

Trie healing can go backwards. On nodes with many peers and slow disk I/O, the healing phase discovers stale nodes, fetches them, discovers more stale nodes, and loops. Documented cases in Geth span days and weeks of stuck sync before operators gave up and restarted from scratch.<sup>[1](#fn-1)</sup>

This is one of three hard problems that [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) solves with a single new block field.<sup>[2](#fn-2)</sup> It is also the least-discussed of the three. EIP-7928 is one of the two headline EIPs in Ethereum's upcoming Glamsterdam hard fork, alongside EIP-7732 (ePBS).<sup>[3](#fn-3)</sup> The mechanism it introduces, the Block-Level Access List, is worth understanding in full.

## What is a Block-Level Access List?

A Block-Level Access List (BAL) is an RLP-encoded structure attached to each block that records every account and storage slot touched during block execution, along with their post-execution values.

This is not a hint. It is an authenticated record.

The important contrast is with [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930), which introduced transaction-level access lists for gas discounts:

| | EIP-2930 | EIP-7928 |
|---|---|---|
| Scope | Per transaction | Per block |
| Declared by | Transaction sender | Block producer |
| Content | What the tx *might* access | What the block *actually* touched |
| Post-values | No | Yes |
| Purpose | Gas discount hints | Authenticated state diff |

The data structure looks like this:

```
BlockAccessList = [
  AccountChange(
    address: bytes20,
    storage_changes: [
      SlotChange(
        slot: bytes32,
        changes: [
          StorageChange(
            block_access_index: uint16,  # which transaction caused this change
            new_value: bytes32
          )
        ]
      )
    ],
    storage_reads: [bytes32, ...],  # slots read but not modified
    balance_changes: [BalanceChange(block_access_index, post_balance)],
    nonce_changes:   [NonceChange(block_access_index, new_nonce)],
    code_changes:    [CodeChange(block_access_index, new_code)]
  ),
  ...
]
```

The `block_access_index` is the transaction's position within the block (uint16, so up to 65,535 transactions). Only entries where the post-value differs from the pre-value appear. Slots are sorted lexicographically. The reserved index `0xFFFF` marks the state root computation step.

The block header gains one new field:

```
block_access_list_hash = keccak256(rlp.encode(block_access_list))
```

Validation is strict: the execution layer computes the BAL during block execution, hashes it, and checks it against the header. A mismatch means the block is invalid. This makes the BAL an authenticated artifact, not an advisory.

Average BAL size runs around 70 KiB per block, roughly doubling current block size.<sup>[4](#fn-4)</sup> A "parallel I/O BAL" minimal variant strips read-only slots and delivers approximately 78% of full-BAL throughput at around 23 KiB.

## Use case 1: parallel transaction execution

The dependency problem for parallel execution has a clean statement: you cannot safely execute two transactions concurrently if they touch overlapping storage slots. Without knowing read/write sets upfront, you either execute sequentially or speculate and roll back on conflicts.

Current approaches like optimistic execution (used by Reth and explored by Monad) detect conflicts at runtime and re-execute the losing transaction. This works, but conflict detection adds overhead and serializes the re-execution path.

BALs change the problem. From the *previous* block's BAL, you know exactly which slots were written. Before executing the next block, you can classify transactions into non-conflicting groups and execute those groups in parallel. The `block_access_index` field tells you which transaction caused each state change, so you can construct a dependency graph across the entire block.

Research modeling worst-case parallel execution under EIP-7928 found that 60-80% of transactions access disjoint storage slots, enabling safe parallelization without any speculation at all.<sup>[5](#fn-5)</sup> The remaining 20-40% can be sequenced based on the dependency graph.

The BAL also enables parallel disk pre-fetching. Before executing a block, the client reads the BAL and fetches all referenced accounts and storage slots from disk in parallel. This eliminates the sequential disk I/O bottleneck that becomes critical at high gas limits.

Glamsterdam targets a gas limit increase from 60M to 200M per block and approximately 10,000 TPS, with a projected 78.6% reduction in gas fees. Neither the gas limit expansion nor the throughput target is achievable without the parallelism that BALs make practical.

## Use case 2: fixing trie healing with snap/2

Snap sync (the current default for most Ethereum clients) works by downloading the state trie in parallel account ranges. It is fast. The problem is that the chain keeps advancing while the download runs. By the time the download finishes, some of the early-fetched nodes are stale because later blocks modified them.

The healing phase resolves this: discover stale nodes, fetch correct versions, apply them. But healing is iterative. Each round of fixes exposes new stale nodes that were downstream of the ones just corrected. On nodes with many active peers (which means more state requests coming in) and slow disk I/O, the discovery rate can outpace the fix rate. Healing progress goes negative.

This is not a pathological edge case. It is a documented failure mode with multiple Geth issues filed, some unresolved for years.<sup>[1](#fn-1)</sup>

snap/2 (PR #11391, posted March 10, 2026) replaces the iterative healing phase entirely.<sup>[6](#fn-6)</sup> The mechanism is straightforward: instead of probing the trie for inconsistencies, the syncing node replays block BALs forward from the snapshot point.

The new healing workflow:

1. Download the state snapshot (same as snap/1)
2. Request BALs for every block since the snapshot via eth/71 (EIP-8159)<sup>[7](#fn-7)</sup>
3. For each block, apply the BAL diffs: update every storage slot, balance, nonce, and code entry to its post-execution value
4. No trie probing, no iterative discovery

The result is deterministic and bounded. The number of BALs to replay equals the number of blocks elapsed during the snapshot download. That number is known. Each BAL is a finite diff. The healing phase completes in one forward pass.

This only works because BALs encode post-execution values. Before EIP-7928, producing a state diff for a block required re-executing it with a full EVM. snap/2 is only possible because BALs exist.

EIP-8159 (the companion wire protocol EIP) adds two new p2p messages, `GetBlockAccessLists (0x12)` and `BlockAccessLists (0x13)`, to the eth/71 protocol version. Without these, syncing nodes cannot request historical BALs from peers. snap/2 requires eth/71 for historical sync; during normal operation, the consensus layer provides BALs via the Engine API.

## Use case 3: executionless state updates

A client that holds all BALs since genesis can advance its state without running the EVM at all. For each block, apply the AccountChange entries: write the new values for every storage slot, balance, nonce, and code entry in the BAL.

This sounds like it requires trusting the block producer. But the BAL hash is committed in the block header, which is hash-linked into the chain. Any inconsistency between the declared BAL and the actual execution output makes the block invalid. A client applying BAL diffs is not trusting the producer's word; it is trusting the same consensus that protects every other field in the block.

The beneficiaries here are light verifiers, stateless clients, and indexers doing historical re-sync. An indexer that needs to re-process historical state changes today must replay transactions through an EVM. With BALs, it reads structured diffs directly. The savings compound over millions of blocks.

## What this means for block explorers

Four concrete changes land for block explorer operators post-Amsterdam.

First, a new header field. The `block_access_list_hash` appears in every block header after the Glamsterdam fork, analogous to `withdrawalsRoot` after Shanghai and `blobGasUsed` after Cancun. Indexers need to store and display it.

Second, explicit state change data. Today, showing which storage slots changed in a block requires either EVM tracing or relying on execution receipts. Post-EIP-7928, the BAL is an authenticated, structured feed of every slot written in the block. An explorer can display "state changes in this block" as a flat list, directly from the BAL, with no re-execution.

Third, richer block pages. The BAL lists every account touched in a block. "Accounts active in this block" and "Storage slots modified" become first-class display fields, useful for MEV analysis, audit, and debugging.

Fourth, and most directly relevant to L2 operators: snap/2 makes node sync reliable. L2 node operators who run Ethernal against a local node have encountered the stuck-healing failure. BAL-based deterministic healing eliminates it structurally. You do not have to wait for the trie healing loop to self-resolve or restart sync from scratch.

## Status and timeline

EIP-7928 is in Review status with active devnet testing. BAL devnet-3 launched on March 4, 2026, with public testnet activations on Holesky and Sepolia expected in the months before mainnet. More than 12 EIP-7928 breakout calls have been held as of early 2026.<sup>[2](#fn-2)</sup>

Glamsterdam targets H1 2026, following the Fusaka hard fork (December 2025). The two headline EIPs are EIP-7928 (BAL) and EIP-7732 (ePBS).<sup>[3](#fn-3)</sup>

All major clients are tracking implementation. Hyperledger Besu opened a dedicated tracking issue,<sup>[8](#fn-8)</sup> Erigon filed its own,<sup>[9](#fn-9)</sup> and LambdaClass documented how their ethrex client handles state healing in the current snap/1 model, with BAL-based healing as the target path.<sup>[10](#fn-10)</sup> BNB Smart Chain published a post on implementing BAL for their own chain, signaling that the design is being adopted beyond Ethereum mainnet.<sup>[11](#fn-11)</sup>

snap/2 (PR #11391) and EIP-8159 (eth/71) are companion proposals. All three need to land together. The dedicated BAL reference site at [blockaccesslist.xyz](https://blockaccesslist.xyz/) tracks specification progress and devnet status.

## One decision, three problems

The BAL falls out naturally from a simple idea: after executing a block, record what you touched and what the values became.

That single decision, record outputs not just inputs, is what makes three entirely separate problems solvable with one mechanism. Parallel execution needs read/write sets known before execution. State healing needs a deterministic diff to replay forward. Executionless verification needs a structured record of state transitions. The previous block's BAL is exactly each of those things.

What I find striking is that parallel execution, deterministic healing, and executionless sync have been pursued as separate engineering projects by different teams. EIP-7928 doesn't solve each one with a bespoke mechanism. It turns out all three were missing the same primitive: a complete, authenticated record of what changed and what the values became. That convergence isn't obvious until you see it.

The cost is roughly 70 KiB of extra data per block, which roughly doubles current block size. That is a real cost, and whether it is the right trade-off is what devnet testing is working through. But the design is sound. One field, authenticated by the block hash, shared across every use case that needs it.

---

## References

<span id="fn-1">1.</span> Various contributors. "Snap sync state corruption / stuck healing issues." _GitHub / ethereum/go-ethereum_, 2021-2024. [https://github.com/ethereum/go-ethereum/issues/22534](https://github.com/ethereum/go-ethereum/issues/22534)

<span id="fn-2">2.</span> ethpandaops team. "EIP-7928: Block-Level Access Lists." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7928](https://eips.ethereum.org/EIPS/eip-7928)

<span id="fn-3">3.</span> Ethereum Foundation. "Glamsterdam: Ethereum Roadmap." _ethereum.org_, 2026. [https://ethereum.org/roadmap/glamsterdam/](https://ethereum.org/roadmap/glamsterdam/)

<span id="fn-4">4.</span> ethpandaops team. "BAL Size Analysis." _Ethereum Improvement Proposals Assets_, 2025. [https://eips.ethereum.org/assets/eip-7928/bal_size_analysis](https://eips.ethereum.org/assets/eip-7928/bal_size_analysis)

<span id="fn-5">5.</span> Various contributors. "Modeling the Worst-Case Parallel Execution Under EIP-7928." _ethresear.ch_, 2025. [https://ethresear.ch/t/modeling-the-worst-case-parallel-execution-under-eip-7928/23418](https://ethresear.ch/t/modeling-the-worst-case-parallel-execution-under-eip-7928/23418)

<span id="fn-6">6.</span> nero_eth. "snap/2 , Replacing Trie Healing with BALs." _ethresear.ch_, March 10, 2026. [https://ethresear.ch/t/snap-v2-replacing-trie-healing-with-bals/24333](https://ethresear.ch/t/snap-v2-replacing-trie-healing-with-bals/24333)

<span id="fn-7">7.</span> Various contributors. "EIP-8159: eth/71 , Block Access List Exchange." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8159](https://eips.ethereum.org/EIPS/eip-8159)

<span id="fn-8">8.</span> Hyperledger Besu contributors. "EIP-7928: Block Access Lists tracking issue." _GitHub / hyperledger/besu_, 2025. [https://github.com/hyperledger/besu/issues/8747](https://github.com/hyperledger/besu/issues/8747)

<span id="fn-9">9.</span> Erigon contributors. "EIP-7928: Block Access Lists tracking issue." _GitHub / erigontech/erigon_, 2025. [https://github.com/erigontech/erigon/issues/19139](https://github.com/erigontech/erigon/issues/19139)

<span id="fn-10">10.</span> LambdaClass. "How ethrex Heals State During Snap Sync." _LambdaClass Blog_, 2026. [https://blog.lambdaclass.com/how-ethrex-heals-state-during-snap-sync/](https://blog.lambdaclass.com/how-ethrex-heals-state-during-snap-sync/)

<span id="fn-11">11.</span> BNB Chain team. "Boosting BNB Smart Chain Performance with Block Access List." _BNB Chain Blog_, 2025. [https://www.bnbchain.org/en/blog/boosting-bnb-smart-chain-performance-with-block-access-list](https://www.bnbchain.org/en/blog/boosting-bnb-smart-chain-performance-with-block-access-list)
