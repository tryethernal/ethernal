---
title: "The State Growth Tax: Inside Ethereum's Proposal to Charge You for Dormant State"
description: "New EIP draft prices SSTORE by age: dormant state costs more to write. How period tracking works and what this means for DeFi protocols with idle positions."
date: 2026-04-02
tags:
  - Ethereum
  - EIP
  - State
  - Gas
  - DeFi
  - L2
image: "/blog/images/ethereum-tiered-state-write-pricing.png"
ogImage: "/blog/images/ethereum-tiered-state-write-pricing-og.png"
status: published
readingTime: 7
---

Your AMM has 40,000 liquidity positions from 2023. Users opened them, collected fees for a few months, then stopped. The positions are dormant: last written two years ago, sitting in Ethereum's state trie, consuming disk I/O on every node in the network. Under today's gas schedule, closing those positions costs exactly the same as writing to a slot touched in the current block. A new EIP draft proposes to change that.

Ethereum has always charged you to write state. It has never charged you for letting state grow stale. Until now.

## What problem does tiered state write pricing solve?

The problem is flat-cost state writes combined with permanent state persistence. A `SSTORE` to a slot that hasn't been touched since 2021 carries the same gas cost as a `SSTORE` to a slot written two blocks ago. The actual resource cost is different: recently written state lives in OS page caches and write-optimized storage paths; old state requires cold reads from the deepest layers of the database before the write can complete.

Ethereum's state has grown to 360 million accounts and 1.5 billion storage slots as of early 2026.<sup>[1](#fn-1)</sup> The flat pricing model created the conditions for this growth: you pay once to create state and nothing to keep it. The closest prior reform, [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929)'s warm/cold access distinction, addressed *read* costs. It did not address the ongoing cost of *writing* to state you last touched a year ago.

[EIP PR #11390](https://github.com/ethereum/EIPs/pull/11390), authored by Wei Han Ng, Amirul Ashraf, Guillaume Ballet, Maria Silva, and Gary Rong, introduces a third dimension to state write pricing: age.<sup>[1](#fn-1)</sup>

## How period tracking works

The core mechanism is a new field added to every account and storage slot: `last_written_period`. The period is derived deterministically from the block number:

```python
current_period = max(0, (block_number - PERIOD_START_BLOCK) // PERIOD_LENGTH)
```

`PERIOD_LENGTH` is approximately 6 months in blocks. `PERIOD_START_BLOCK` is the fork activation block. Every account and every storage slot records when it was last written in these period units, not in block numbers.

The RLP encoding changes reflect this:

```
# Account (before)
account = RLP([nonce, balance, storageRoot, codeHash])

# Account (after)
account = RLP([nonce, balance, storageRoot, codeHash, last_written_period])

# Storage slot (before)
slot_value = RLP(value)

# Storage slot (after)
slot_value = RLP([value, last_written_period])
```

Backwards compatibility is handled through the RLP prefix byte. A 4-field account (old format) is decoded with `last_written_period = 0`, placing it immediately in the Dormant tier. A legacy storage slot is a bare bytestring (prefix `0x80`+), while the new format is an RLP list (prefix `0xC0`+); clients distinguish them by the first byte.

When an `SSTORE` executes, the client computes the tier before pricing:

```python
period_age = current_period - last_written_period

if period_age < IDLE_MIN_AGE:
    tier = ACTIVE   # cheapest
elif period_age < DORMANT_MIN_AGE:
    tier = IDLE
else:
    tier = DORMANT  # most expensive
```

The gas cost of each write depends on which tier is matched:

| Operation | Active | Idle | Dormant |
|---|---|---|---|
| Account mutation | `ACTIVE_ACCOUNT_WRITE` | `IDLE_ACCOUNT_WRITE` | `DORMANT_ACCOUNT_WRITE` |
| Storage mutation | `ACTIVE_STORAGE_WRITE` | `IDLE_STORAGE_WRITE` | `DORMANT_STORAGE_WRITE` |

The specific constants , `ACTIVE_STORAGE_WRITE`, `DORMANT_STORAGE_WRITE`, and the age thresholds , are all marked TBD in the current draft. They will be determined through benchmarking, similar to how [EIP-7904](https://ethereum-magicians.org/t/glamsterdam-repricings-3-mar-4-2026/27893)'s compute repricing measured actual client execution times.<sup>[2](#fn-2)</sup> The mechanism is settled; the numbers are not.

## What reads don't do

Reads intentionally do not update `last_written_period`. This is a deliberate design choice with two reasons.

First, updating a trie leaf on every cold `SLOAD` would turn read operations into writes , increasing storage I/O, invalidating caches, and triggering trie rehashing. The write amplification would be substantial.

Second, and more critically, updating state metadata on a read would violate [EIP-214](https://eips.ethereum.org/EIPS/eip-214)'s `STATICCALL` guarantee.<sup>[3](#fn-3)</sup> `STATICCALL` is defined as producing no state changes. If reading a storage slot caused its period metadata to update, every `STATICCALL` touching old state would be a state-modifying operation. The EIP's authors explicitly flagged this as a correctness blocker.

EIP-2929's warm/cold distinction still applies to reads separately. The two mechanisms operate in parallel: warm/cold tracks access within a transaction; Active/Idle/Dormant tracks write age across the chain's entire history.

A few edge cases the EIP specifies: a no-op `SSTORE` (writing the same value already stored) doesn't bump the period or change the cost. New slot creation starts at `last_written_period = current_period`, placing it in the Active tier immediately. Slot deletion removes the slot but bumps the containing account's period, because `storageRoot` changes.

## The 3.4 GB overhead tradeoff

Adding a field to every account and storage slot is not free. The EIP estimates:<sup>[1](#fn-1)</sup>

- 360 million accounts × 1 byte = approximately 0.36 GB
- 1.5 billion storage slots × 2 bytes = approximately 3.0 GB
- **Total worst-case overhead: approximately 3.4 GB**

The actual impact is lower. State that is never written after the fork retains its legacy encoding , zero overhead. Only slots that receive a post-fork `SSTORE` transition to the new format. The 3.4 GB figure assumes every piece of state is written at least once post-fork, which is the upper bound.

The EIP frames this directly: introducing overhead to fight state growth is an honest tradeoff. The bet is that the gas incentives will reduce net state creation faster than the metadata accumulates.

## What this means for DeFi protocols and L2 operators

**DeFi protocols with large idle inventories** are the most affected. AMMs, lending protocols, and options vaults that hold thousands of dormant positions will face elevated costs when those positions are finally touched. The specific multiplier is TBD until constants are benchmarked, but the direction is clear: the older the state, the more expensive the write.

This creates a new category of protocol operation: state maintenance. A protocol could run a cron job that periodically rewrites dormant positions, bumping their `last_written_period` to keep them in the Active tier. The EIP anticipates this behavior and considers it intentional. The authors framed it directly: the proposal "intends to make state maintenance an ongoing cost borne by the parties who benefit from cheap future writes."<sup>[1](#fn-1)</sup> The analogy to property taxes is apt: you pay more to hold idle land than productive land.

Governance state is particularly exposed. Vote records, delegation mappings, and proposal hashes that were written during active governance periods but haven't been touched since will be expensive to reset or migrate. Protocol teams planning governance contract upgrades should audit their state age now.

**L2 and L3 operators** need to track two things. First, if your sequencer includes transactions with `SSTORE` to old L1 state slots, your gas estimates need the tier factor applied , static estimates based on today's flat pricing will be wrong. Second, `last_written_period` is part of consensus state; it affects trie hashing. Every EVM client in your stack , including any forked clients running your chain , must implement the field correctly. A client that ignores `last_written_period` and hashes accounts as 4-field RLP will diverge on the first post-fork write to any account.

The EIP explicitly allows (without mandating) a client optimization: use the period field to tier storage backends. Active-tier state lives in write-optimized paths (NVMe, RAM cache); Dormant-tier state migrates to cheaper HDD storage. This is infrastructure intelligence surfaced from consensus-layer data.

## How this fits into the broader state roadmap

Tiered Write Pricing is not state expiry. The distinction matters.

State expiry proposals (like EIP-7736 and related work) would remove state from the active trie after a period of non-access. They track *read-inactivity* , state that nobody has read or written falls off the active state tree and must be proven with a witness to access again.

This proposal tracks *write-inactivity only*. A storage slot that is `SLOAD`ed every block for three years but never rewritten will accumulate period age and eventually reach the Dormant tier. It will not be expired. The cost to read it stays the same; the cost to write it goes up.

The EIP's authors position it as groundwork for a future *write-renewal expiry* policy: if a slot is never written past a certain period age threshold, it could eventually be pruned. But that is a separate proposal. This EIP only introduces the pricing signal.

There is also a relationship to [EIP-7928 Block-Level Access Lists (BALs)](https://eips.ethereum.org/EIPS/eip-7928), currently proposed as part of Snap v2.<sup>[4](#fn-4)</sup> BALs record every account and storage location accessed during block execution, enabling state reconstruction without re-execution. The two proposals are complementary: BALs solve the sync convergence problem by providing a deterministic state diff per block; tiered write pricing solves the incentive problem by making dormant state expensive to accumulate. Neither replaces the other.

Timeline: EIP PR #11390 was opened March 10, 2026, and is in draft status. The gas constants remain TBD. It requires [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929) and [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930) as prerequisites and was not included in the Glamsterdam repricing scope, which focuses on [EIP-8007](https://eips.ethereum.org/EIPS/eip-8007)'s compute and state access work.<sup>[2](#fn-2)</sup>

## What to do before the constants land

The gas constants are TBD, but the mechanism is stable enough to act on.

Audit your protocol's dormant state footprint. Identify which storage slots in your contracts have not been written since early 2024 or earlier. Contracts with large mapping structures , user balances, position records, vote tallies , are the highest-risk surface. Once constants are benchmarked, any of those slots landing in the Dormant tier will carry materially higher write costs.

If you run an Ethernal explorer, transaction traces already show `SSTORE` opcodes and their gas costs at the call level. Use that data to identify which contract paths are write-heavy and estimate exposure before the pricing model changes. The trace view gives you the raw opcode breakdown , enough to model the before/after cost once the tier multipliers are published.

State has never been free. For the first time, it will be priced as a function of time.

---

## References

<span id="fn-1">1.</span> Ng, Wei Han, Amirul Ashraf, Guillaume Ballet, Maria Silva, Gary Rong. "EIP: Tiered State Write Pricing." _GitHub , ethereum/EIPs PR #11390_, March 10, 2026. [https://github.com/ethereum/EIPs/pull/11390](https://github.com/ethereum/EIPs/pull/11390)

<span id="fn-2">2.</span> "Glamsterdam Repricings #3, Mar 4, 2026." _Ethereum Magicians_, March 4, 2026. [https://ethereum-magicians.org/t/glamsterdam-repricings-3-mar-4-2026/27893](https://ethereum-magicians.org/t/glamsterdam-repricings-3-mar-4-2026/27893)

<span id="fn-3">3.</span> Buterin, Vitalik, et al. "EIP-214: New Opcode STATICCALL." _Ethereum Improvement Proposals_, 2017. [https://eips.ethereum.org/EIPS/eip-214](https://eips.ethereum.org/EIPS/eip-214)

<span id="fn-4">4.</span> Wahrstätter, Toni, Dankrad Feist, Francesco D'Amato, et al. "EIP-7928: Block-Level Access Lists." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7928](https://eips.ethereum.org/EIPS/eip-7928)
