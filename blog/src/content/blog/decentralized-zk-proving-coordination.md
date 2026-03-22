---
title: "When Provers Race: The Coordination Problem in Decentralized ZK"
description: "Concurrent ZK provers collide at 33K gas per failure. Why the coordination problem is hard and what three proposed mechanisms look like."
date: 2026-03-22
tags:
  - ZK
  - Ethereum
  - Infrastructure
  - Cryptography
  - L2
image: "/blog/images/decentralized-zk-proving-coordination.png"
ogImage: "/blog/images/decentralized-zk-proving-coordination-og.png"
status: draft
readingTime: 7
---

You've deployed a Groth16 verifier contract. Two provers generate valid proofs concurrently against the same Merkle root. One submits at block N. The other's transaction lands in the same block and reverts. The proof was cryptographically valid. The transaction was not. You burn 33,000 gas on the failure and your protocol appears healthy if you only look at successful submissions. The reverts are invisible unless you're actively watching.

This is not a bug. It is the coordination problem at the heart of every decentralized ZK prover network. And nobody has fully solved it yet.

## Why ZK provers collide

The collision problem lives in the architecture of privacy-preserving UTXO protocols built on Sparse Merkle Trees (SMTs). Funds are represented as "notes" (commitments stored as leaf nodes in an SMT). When a user spends a note or creates a new one, a prover must generate a ZK proof (typically Groth16) that verifies balance conservation: inputs equal outputs, all commitments are valid, no double-spend occurred.<sup>[1](#fn-1)</sup>

The proof references a specific SMT root: the state of the tree at the moment the prover began computation. That root is the proof's anchor. Submit the proof, and the on-chain verifier checks it against the current root. If the root has not changed since the prover started, the proof is valid and the state transition goes through.

Here is the problem: two provers can start computing against the same root simultaneously. Proof generation takes seconds to minutes. Both finish. Both submit. The first submission updates the root. The second arrives milliseconds later, still referencing the old root. The verifier rejects it. The transaction reverts, and 33,000 gas is spent on the failure.

This is structurally different from a standard mempool race condition. In a mempool race, a higher priority fee wins. In a ZK collision, the economic properties of the proof are irrelevant once a conflicting state transition has landed. You cannot bid more to make your proof valid first; the circuit is stateless. The only solution is coordination before submission.

## Three coordination mechanisms

Aleksandar Veljkovic's Curvy proposal describes three mechanisms for managing concurrent provers.<sup>[1](#fn-1)</sup> Each has trade-offs. None is a complete answer.

### Slot-based sequencing

The simplest approach: an on-chain request queue assigns each prover a time window defined by a block range `[fromBlock, toBlock]`. Only the prover holding the current slot can submit. Others wait.

```solidity
interface IProverQueue {
    function requestSlot(uint256 fromBlock, uint256 toBlock) external payable;
    function submitProof(bytes calldata proof, uint256 slotId) external;
    function slashInactiveProver(uint256 slotId) external;
}
```

The advantage is deterministic turn-taking: no collisions possible within a valid slot assignment. The weakness is a clear DoS vector: an attacker can reserve slots cheaply and not submit, blocking other provers for the duration of the window. Without an economic penalty that exceeds the cost of the slot itself, the throttle becomes a weapon.

### Collateral-backed participation

The second mechanism requires provers to lock stake before joining the active prover set. Collateral creates Sybil resistance: the cost to spin up competing prover identities scales with their activity. Fees from the proving pool distribute to honest participants, creating a positive-sum incentive structure.

The trade-off is access. A meaningful collateral requirement reduces the number of entities who can participate, which is the opposite of the decentralization goal. It does filter for serious operators, which improves reliability. But it reproduces a quality-versus-openness tension that Ethereum's validator economics have been managing for years.

### Request throttling

The third approach rate-limits each prover address: one request per N minutes, for example. Collateral then scales linearly with request frequency; provers who want faster access pay proportionally more. Low-velocity provers can participate with minimal stake; high-frequency provers stake more.

The hybrid version (throttle plus collateral) creates an adaptive access control mechanism. It keeps the prover set open while making systematic slot-hogging expensive.

### The pattern these mechanisms reveal

All three approaches mirror solutions that Ethereum's block-production layer already uses. Slot sequences map directly to PBS (Proposer-Builder Separation) slot auctions. Collateral mirrors validator stakes. Rate-scaled collateral mirrors EIP-1559's base fee mechanism, which prices access by demand.

The prover layer is not inventing new economics. It is rediscovering block production under different constraints, without the decade of EIP iterations that shaped the current mempool.

## Where the rest of the prover ecosystem stands

The coordination problem Curvy identifies is not isolated to one protocol. It is showing up across every serious effort to decentralize proof generation.

**Succinct's PROVE network** takes a marketplace approach: off-chain auctions let provers compete for proving requests, with on-chain settlement and slashable stakes for invalid proofs. The auction model reduces collision surface by routing each job to a single winner before computation begins, rather than letting multiple provers race on the same input.<sup>[4](#fn-4)</sup>

**Hardware benchmarks** show proving infrastructure is reaching practical thresholds. The ZisK proving system clocks approximately 7.4 seconds per block using 24 GPUs.<sup>[5](#fn-5)</sup> zkSync's Airbender achieves under 50 seconds per block on a single GPU.<sup>[6](#fn-6)</sup> Both teams have cited a sub-$100,000 hardware target as the threshold for home-enthusiast proving: the point at which decentralized participation becomes economically accessible.

**L1 zkEVM development** has surfaced a different bottleneck. The L1 zkEVM Breakout session from March 2026 (with participants from Tamago, Lighthouse, and multiple client teams) identified the transport layer, not circuit proving time, as the current performance constraint.<sup>[2](#fn-2)</sup> Benchmarking EnginePayload with the Windness RPC showed the bottleneck sitting between proof generation and submission, not inside the circuit itself. The Tamago project is addressing adjacent concerns: a modified Go compiler that enables bare-metal execution without an OS, targeting a reduced attack surface and smaller code footprint for zkVM environments.

The common thread across all these efforts: every decentralized proving architecture has to solve two problems simultaneously. Liveness under Byzantine actors (what happens when a prover wins a slot and then disappears). And economic sustainability for provers who sometimes lose races and sometimes fail to submit in time. Neither problem has a final answer.

## What prover coordination looks like on-chain

Failed proof submissions are visible in any block explorer as reverted transactions to the verifier contract. This matters more than it sounds. Without full transaction trace visibility, a prover network operator sees only successful submissions. The protocol appears healthy. The coordination failures are silent.

With trace-level inspection, the picture changes. Reverted submissions show which provers collided, at what block, against what input root. Slot reservation events show queue utilization. Stake registration and slashing events are on-chain. The full economic behavior of the prover network is observable, if you have a tool that indexes and decodes it.

The gas cost of coordination failures scales quickly. At 33,000 gas per failed submission:

| Collisions per day | Gas wasted per day | At 20 gwei (ETH) |
|--------------------|--------------------|------------------|
| 10 | 330,000 | 0.0066 ETH |
| 100 | 3,300,000 | 0.066 ETH |
| 1,000 | 33,000,000 | 0.66 ETH |
| 10,000 | 330,000,000 | 6.6 ETH |

A protocol running 1,000 collisions per day at 20 gwei is burning 0.66 ETH daily on coordination overhead: more than $1,300 at a $2,000 ETH price. That is measurable. It is also invisible to protocol teams who are not watching failed transactions.

[Ethernal](https://tryethernal.com) connects to any EVM-compatible node and surfaces full transaction traces including reverts. For prover network operators, this is the operational telemetry layer: which transactions failed, why, and at what cost. The difference between "my protocol is healthy" and "my protocol is silently hemorrhaging coordination failures" depends entirely on whether you can see the revert data.

## Open problems

The three mechanisms from Curvy are proposals, not deployments. The field is still early, and several problems remain structurally unsolved.

**Proof-of-correctness before submission** would let the network reject invalid proofs without on-chain execution cost. This requires recursive verification: a prover would need to prove their proof is valid before submitting it. That is expensive and creates a regress problem. No practical solution has been deployed at scale.

**MEV in prover networks** is the next frontier. High-value proving slots (for large transactions or high-fee environments) could be extracted in the same way block production MEV is extracted today. A prover who knows which transactions are pending (visible from mempool data) can prioritize profitable proving targets. Slot auctions amplify this: off-chain auctions may disadvantage slower or less-connected provers in ways that centralize the winning set.

**Hardware inequality** interacts poorly with collateral models. A faster prover wins collisions systematically. Collateral requirements do not equalize hardware advantages. Provers with consumer GPUs face structural disadvantages against operators running dedicated proving hardware, regardless of stake size.

**Recursive proof aggregation** shows up throughout the field as a potential cost-reduction primitive. The ZK-AMS paper describes constant-cost on-chain verification regardless of batch size using Nova-style folding.<sup>[3](#fn-3)</sup> The L1 zkEVM Devnet-4 is blocked on completing ZK-friendly encoding specifications for recursive aggregation. Both applications are pointing at the same primitive, but it is still experimental. Reducing the per-proof cost of retries through aggregation would change the economics of collisions, but that path is not yet production-ready.

## What comes after the race

The move from "ZK proofs work" to "ZK proofs run on decentralized infrastructure" requires solving a coordination game that is structurally similar to block production, but without years of adversarial refinement behind it. The mempool we have today survived a decade of EIP iterations. Prover networks are running their first iterations now.

The patterns emerging from this work (staked prover sets, slot sequencing, throttled access) will define the proving market structure for the next several years. They are not yet settled. Engineers building ZK infrastructure today are designing these mechanisms in real time, against live economic pressure, with protocols that are already in production.

The interesting question is not whether decentralized proving is possible. The hardware benchmarks show it is. The interesting question is what the coordination layer looks like when it has to be as reliable as block production. That answer is still being written.

---

## References

<span id="fn-1">1.</span> Veljkovic, A. "Curvy: Decentralized Proving." _Ethereum Research_, March 11, 2026. [https://ethresear.ch/t/curvy-decentralized-proving/24352](https://ethresear.ch/t/curvy-decentralized-proving/24352)

<span id="fn-2">2.</span> L1 zkEVM Breakout Participants. "L1-zkEVM Breakout #02, March 11, 2026." _Ethereum Magicians_, March 2026. [https://ethereum-magicians.org/t/l1-zkevm-breakout-02-march-11-2026/27895](https://ethereum-magicians.org/t/l1-zkevm-breakout-02-march-11-2026/27895)

<span id="fn-3">3.</span> Lin, Z., Wang, T., Zhang, S., Shi, L., and Yu, S. "Managing Credible Anonymous Identities in Web 3.0 Services: A Scalable On-Chain Admission Framework with Recursive Proof Aggregation." _arXiv_, February 2026. [https://arxiv.org/abs/2602.16130](https://arxiv.org/abs/2602.16130)

<span id="fn-4">4.</span> Succinct. "Introducing the PROVE Network." _Succinct Blog_, 2026. [https://blog.succinct.xyz/prove-network](https://blog.succinct.xyz/prove-network)

<span id="fn-5">5.</span> ZisK. "ZisK Prover Benchmarks: 7.4 Seconds per Block." _ZisK Documentation_, 2026. [https://zisk.technology/benchmarks](https://zisk.technology/benchmarks)

<span id="fn-6">6.</span> zkSync. "Airbender: Under 50 Seconds per Block on a Single GPU." _zkSync Blog_, 2026. [https://zksync.mirror.xyz/airbender](https://zksync.mirror.xyz/airbender)
