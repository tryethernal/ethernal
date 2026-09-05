---
title: "The Transaction State Your Block Explorer Can't See Yet"
description: "ERC-8166 defines a standard interface for shared sequencers, giving agents and explorers a common way to poll pending transaction status across L2s."
date: 2026-09-05
tags:
  - AI Agents
  - Shared Sequencers
  - L2
  - ERC-8166
  - Ethereum
image: "/blog/images/shared-sequencer-standard-erc-8166.png"
ogImage: "/blog/images/shared-sequencer-standard-erc-8166-og.png"
status: published
readingTime: 8
---

An autonomous agent submits a payout transaction at 3am, no human watching. It is settling an [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) job payment, and the transaction routes through a shared sequencer rather than direct to an L2's own mempool. The sequencer accepts it and returns a status. That status shape is specific to whichever sequencer happens to be in the path that day.

If the agent's retry logic misreads "still pending inside the sequencer" as "failed," it resubmits, and the job payout might land twice. If it misreads "failed" as "pending," it waits forever and silently drops the payment. A human operator would refresh a page, wait five minutes, or open a support ticket. An unattended agent has no such fallback; it has to decide, programmatically, right now, whether to retry, escalate, or abort. That decision depends entirely on a status code that today has no standard shape.

[ERC-8166](https://github.com/ethereum/ERCs/pull/1550), "Shared Sequencer Interface for Agent L2s," proposes fixing that gap. It is currently a draft PR authored by Michael Winczuk, working number 8166 per the [Ethereum Magicians discussion thread](https://ethereum-magicians.org/t/shared-sequencer-interface-for-autonomous-agent-layer-2s/27772), not yet merged or officially assigned.<sup>[1](#fn-1)</sup>

## Why shared sequencing matters right now

Shared sequencing decouples transaction ordering from a single L2's own operator, letting multiple rollups draw ordering and inclusion guarantees from one external network instead of each running its own centralized sequencer. The pitch is censorship resistance and cross-chain composability: one sequencing layer, many chains built on top.

The category just lost one of its live cross-chain entrants. Astria, a Celestia-based shared sequencer project that had raised $5.5 million in seed funding from Maven 11 plus $12.5 million in strategic financing, fully halted its network in November 2025 at block 15,360,577, after already winding down its Flame EVM rollup and its Celestia validator nodes.<sup>[2](#fn-2)</sup> No detailed public postmortem was given beyond describing itself as an "experimental infrastructure project."

That shutdown narrowed the field to two live systems, each with a structurally different confirmation model. Espresso Systems shipped its "Mainnet 1" in Q1 2026, decentralizing its shared sequencer through HotShot BFT consensus and reaching roughly 8-second finality via its Tiramisu data-availability layer. It serves Arbitrum Orbit, OP Stack, Polygon CDK, and Cartesi chains.<sup>[3](#fn-3)</sup> A chain's L1 settlement contract only accepts blocks that Espresso's consensus also included, so "confirmed" there means "included in Espresso's consensus."

Taiko takes a different approach: a based-rollup model where Ethereum L1 validators themselves are the sequencers, layered with a preconfirmation mechanism run by a small set of whitelisted operators (currently Nethermind, Chainbound, and Gattaca) that gives sub-second inclusion guarantees ahead of L1's roughly 12-second block time, backed by staked-deposit slashing if an operator reneges.<sup>[4](#fn-4)</sup> "Confirmed" on Taiko means something closer to "this specific operator staked a slashable promise."

Two live systems, two incompatible answers to "did my transaction land." An integrator talking to both today writes two entirely separate status-polling implementations.

This is also happening against a backdrop of rising scrutiny of L2 infrastructure quality. In February 2026, Vitalik Buterin publicly criticized the proliferation of "copypasta" EVM L2s, arguing that fees are already low on L1 and that the rollup-centric justification is wearing thin for chains that are just clones with a standard bridge attached.<sup>[5](#fn-5)</sup> He pointed toward tightly-coupled app-specific systems and chains posting real cryptographic commitments back to Ethereum as the patterns still worth building. Shared sequencing, as genuine cross-chain infrastructure rather than a redundant EVM copy, sits on the right side of that line. Standardizing its interface now, before more proprietary shapes calcify, is squarely in that spirit.

## The proprietary-interface problem, specifically for agents

Humans tolerate ambiguity in transaction status because humans can absorb the cost of waiting. Refresh the page. Wait five minutes. Ask a friend in a Discord server if the network feels slow. None of that works for software making unattended, capital-bearing decisions.

An agent needs two things a human doesn't strictly require: a stateless, gas-free way to poll status repeatedly without paying for the privilege, and a machine-parseable reason for failure that lets it branch programmatically between retry, escalate-to-human, and abort-and-refund. Without a standard, an integrator building against N shared sequencers writes N bespoke retry-logic branches, each one guessing at what a given sequencer's revert string or status code actually means.

There's a second-order cost specific to the agent-commerce stack Ethernal has covered previously. If an ERC-8183 job payment fails, "why" matters. Did the job evaluator reject the work, or did the payment transaction fail somewhere inside sequencer infrastructure before it ever reached the chain that hosts the job contract? Those are different failure domains requiring different remediation, and today nothing distinguishes them at the interface level.

## What ERC-8166 actually defines

The core of the proposal is a four-function interface, `ISharedSequencer`, reproduced here from the PR:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

interface ISharedSequencer {

    struct ConfirmationReceipt {
        uint64 timestamp;
        bytes32 l1TxHash;
        bytes32 l2TxHash;
        uint8 status;          // 0=pending, 1=confirmed, 2=failed
        string errorReason;
    }

    struct SequencerMetadata {
        string version;
        address[] supportedL2s;
        uint256 minConfirmationTime;
        uint256 maxTxSize;
    }

    event TransactionSubmitted(address indexed sender, bytes32 indexed transactionId, uint256 paidAmount);
    event TransactionConfirmed(bytes32 indexed transactionId, bytes32 l1TxHash, bytes32 l2TxHash);
    event TransactionFailed(bytes32 indexed transactionId, string errorReason);
    event SequencerSlashed(address indexed sequencer, uint256 slashAmount, string reason);

    function submitTransaction(bytes calldata transactionData) external payable returns (bytes32 transactionId);
    function getConfirmationReceipt(bytes32 transactionId) external view returns (ConfirmationReceipt memory);
    function estimateSubmissionCost(bytes calldata transactionData) external view returns (uint256 totalCostWei);
    function getSequencerMetadata() external view returns (SequencerMetadata memory);
}
```

`submitTransaction` is the only state-changing call. Everything else, including `getConfirmationReceipt`, is a `view` function: an agent can poll status as many times as it needs without paying gas for the query itself, which matters when "poll every few seconds until confirmed" is the actual retry pattern most agents will run.

The `ConfirmationReceipt` struct carries the three states that matter for retry logic: `pending`, `confirmed`, `failed`, plus an `errorReason` string that's meant to be both human-readable and machine-parseable, so an agent's retry branch doesn't have to guess at intent from a raw revert. `estimateSubmissionCost` is the other agent-specific addition: the design principle behind it is accuracy within roughly 10%, tight enough that an agent can budget a transaction before committing funds, rather than discovering the true cost only after submission.

The `SequencerSlashed` event is worth calling out on its own. It exposes sequencer-operator slashing directly on-chain to any integrator watching the interface, rather than leaving that information buried in an off-chain dashboard only the sequencer operator controls. An agent (or an explorer) watching for this event gets an early, structural signal that a given sequencer's reliability guarantees just took a hit.

The interface is deliberately narrow: four functions, no batching, no aggregation logic baked in. The proposal leaves those concerns to wrapper contracts built on top, which keeps the base surface easy to implement correctly and easy to audit.

The reference implementation, `MockSharedSequencer.sol`, backs this up with pragmatic choices: O(1) mapping-based receipt storage instead of an unbounded array (avoiding a classic denial-of-service vector), a minimum submission fee for spam resistance, an emergency pause, and dynamic cost estimation driven by `block.basefee` rather than a static number. The accompanying test suite runs 14 tests, spanning unit, fuzz, and invariant coverage, at approximately 97% code coverage.<sup>[6](#fn-6)</sup>

## What this closes, and what it doesn't

Where ERC-8166 sits relative to the agent-standards stack Ethernal has covered before deserves a precise answer, because the two proposals sound similar and aren't. [ERC-8165](/blog/the-missing-verb-erc-8165) answers "how do these already-landed transactions relate to one plan": it's an execution model for intent submission and solver settlement, operating on transactions that have already made it onto a chain. ERC-8166 answers a question one layer earlier: "is this transaction going to land at all, and if not, why," before it has been confirmed anywhere. The two are complementary, not overlapping. An agent could plausibly use ERC-8165 to specify a swap and ERC-8166's receipt shape to confirm the swap's underlying transaction actually reached the chain.

There's also a direct line to a gap Ethernal's own explorer work has run into before. Arbitrum Orbit chains have retryable tickets that move through pending, redeemed, and expired states outside the canonical block record, and AnyTrust chains post data through a Data Availability Committee whose mode (DAC path versus full-rollup fallback) a generic explorer often can't distinguish.<sup>[7](#fn-7)</sup> A shared sequencer's pending/confirmed/failed lifecycle is the same category of problem, one step earlier in the pipeline, before the transaction has even reached the L2's canonical chain. If a standard receipt shape exists, it becomes something an explorer or any observability layer can normalize and surface consistently across sequencers instead of writing bespoke per-sequencer tooling for each new integration. That's the same pattern Ethernal already builds for Orbit's retryable ticket and DAC-mode visibility, extended one layer down the stack.

## Where this stands

ERC-8166 is a draft PR, not yet merged or assigned an official number by the ERC editors, with an open discussion thread on Ethereum Magicians. With only two or three live shared-sequencer projects in production post-Astria, there's a real question of whether standardizing now is premature, or whether this is exactly the right moment, before more proprietary interfaces spread and integrators build irreversible dependencies on sequencer-specific quirks.

As agent-driven transaction volume grows, "did my transaction land" needs to become a boring, standardized question, the same way ERC-8004 tried to make agent identity a boring, standardized question rather than a bespoke integration problem for every new registry.<sup>[8](#fn-8)</sup>

---

## References

<span id="fn-1">1.</span> Winczuk, M. "Add ERC: Shared Sequencer Interface for Agent L2s." _GitHub ERCs_, PR #1550, February 19, 2026. [https://github.com/ethereum/ERCs/pull/1550](https://github.com/ethereum/ERCs/pull/1550)

<span id="fn-2">2.</span> Unchained. "Celestia Project Astria Network Shuts Down." _Unchained_, 2025. [https://unchainedcrypto.com/celestia-project-astria-network-shuts-down/](https://unchainedcrypto.com/celestia-project-astria-network-shuts-down/)

<span id="fn-3">3.</span> Espresso Systems. "Introducing Espresso Confirmations." _Medium_, 2026. [https://medium.com/@espressosys/introducing-espresso-confirmations-946dbcc1c176](https://medium.com/@espressosys/introducing-espresso-confirmations-946dbcc1c176)

<span id="fn-4">4.</span> 4Pillars. "Preconfirmation feat. Taiko." _4Pillars_, 2026. [https://4pillars.io/en/articles/preconfirmation-feat-taiko](https://4pillars.io/en/articles/preconfirmation-feat-taiko)

<span id="fn-5">5.</span> CoinDesk. "Vitalik Buterin blasts Ethereum 'copypasta' L2 chains, says the rollup excuse is fading." _CoinDesk_, February 5, 2026. [https://www.coindesk.com/markets/2026/02/05/vitalik-buterin-blasts-ethereum-copypasta-l2-chains-says-the-rollup-excuse-is-fading](https://www.coindesk.com/markets/2026/02/05/vitalik-buterin-blasts-ethereum-copypasta-l2-chains-says-the-rollup-excuse-is-fading)

<span id="fn-6">6.</span> Winczuk, M. "erc-shared-sequencer (reference implementation)." _GitHub_, 2026. [https://github.com/michaelwinczuk/erc-shared-sequencer](https://github.com/michaelwinczuk/erc-shared-sequencer)

<span id="fn-7">7.</span> Ethernal. "Which Block Explorer Should You Use for Your Arbitrum Orbit Chain." _Ethernal Blog_. [https://tryethernal.com/blog/block-explorer-arbitrum-orbit-chains](https://tryethernal.com/blog/block-explorer-arbitrum-orbit-chains)

<span id="fn-8">8.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)
