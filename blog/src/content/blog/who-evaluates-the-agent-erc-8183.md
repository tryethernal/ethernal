---
title: "Who Evaluates the Agent? The Hardest Problem in Onchain AI Commerce"
description: "ERC-8183 introduces trustless job escrow for AI agents. The hardest part is not the payment: it's deciding who gets to say the work is done."
date: 2026-03-12
tags:
  - AI Agents
  - ERC-8183
  - Smart Contracts
  - Ethereum
image: "/blog/images/who-evaluates-the-agent-erc-8183.png"
ogImage: "/blog/images/who-evaluates-the-agent-erc-8183-og.png"
status: draft
readingTime: 9
---

An AI agent finishes a $4,000 code audit. It submits the report. Somewhere on Ethereum, an escrow contract holds the USDC. Payment releases when someone decides the work meets the standard.

Who decides?

That question is the hardest unsolved problem in onchain AI commerce. A draft ERC published in March 2026, [ERC-8183 (Agentic Commerce Protocol)](https://eips.ethereum.org/EIPS/eip-8183)<sup>[1](#fn-1)</sup>, co-authored by Davide Crapis from the Ethereum Foundation and Virtuals Protocol, takes the first serious shot at answering it. The protocol gets the job primitive right. The evaluator question it raises is worth understanding before you build on it.

## The job primitive

ERC-8183 defines a `Job` struct with a five-state lifecycle:

```
Open → Funded → Submitted → Completed
                           → Rejected
                           → Expired
```

Three parties participate:

- **Client**: funds the escrow, defines the task
- **Provider**: delivers the work
- **Evaluator**: attests whether work was completed or should be rejected

The payment (ETH or any ERC-20 token) locks into escrow at funding time. Once the job is `Funded`, the client cannot unilaterally reclaim it. This protects the provider: once they start work, the payment is committed. The evaluator is the only address that can move the job forward.

Here's a simplified version of the core interface:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgenticJob {
    enum JobState { Open, Funded, Submitted, Completed, Rejected, Expired }

    struct Job {
        address client;
        address provider;
        address evaluator;
        address paymentToken;    // address(0) for native ETH
        uint256 paymentAmount;
        uint256 deadline;
        JobState state;
        bytes32 descriptionHash; // IPFS hash of job specification
        string  submissionURI;   // provider's deliverable URI
    }

    event JobCreated(uint256 indexed jobId, address client, address evaluator);
    event JobFunded(uint256 indexed jobId, address provider, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, string submissionURI);
    event JobCompleted(uint256 indexed jobId, address provider, uint256 payment, string reason);
    event JobRejected(uint256 indexed jobId, string reason);

    function createJob(
        address evaluator,
        address paymentToken,
        uint256 paymentAmount,
        uint256 deadline,
        bytes32 descriptionHash
    ) external returns (uint256 jobId);

    function fundJob(uint256 jobId) external payable;
    function submitJob(uint256 jobId, string calldata submissionURI) external;

    // evaluator only
    function complete(uint256 jobId, string calldata reason) external;
    function reject(uint256 jobId, string calldata reason) external;

    function claimExpired(uint256 jobId) external;
}
```

The interface is clean. The tricky part is that `evaluator only` modifier. Everything depends on who, or what, sits at that address.

## The evaluator design space

The standard is evaluator-agnostic by design. Any address can play the part. In practice, five patterns cover most real deployments.

**1. EOA (human evaluator)**

Fastest to deploy. The client picks a trusted person, maybe themselves, a colleague, or a professional reviewer. That person calls `complete()` or `reject()`.

Works for: low-frequency, high-trust work. Code reviews between known parties, content creation with a designated editor.

Trade-off: requires human availability. If the evaluator goes offline, the job is stuck until the deadline expires. For agent-speed commerce (hundreds of jobs per hour), human-in-the-loop does not scale.

**2. Multisig or DAO**

Raise the bar for a single bad actor by requiring M-of-N signatures. The client sets up a Safe wallet as evaluator and requires three of five team members to sign off.

Works for: higher-value jobs where unilateral decisions feel risky.

Trade-off: latency. Getting four people to sign takes time, and governance overhead grows with job frequency.

**3. On-chain smart contract evaluator**

For deterministic tasks, this is the only fully trustless option. The evaluator is a contract that verifies the submission against pre-specified conditions and calls `complete()` automatically.

Example: a coding challenge where the submission is a contract address. The evaluator deploys the submitted bytecode against a test harness and completes the job if all test vectors pass:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITestTarget {
    function run() external view returns (bytes32);
}

contract TestHarnessEvaluator {
    IAgenticJob public immutable jobContract;

    mapping(uint256 => bytes32) public expectedOutputHashes;

    constructor(address _jobContract) {
        jobContract = IAgenticJob(_jobContract);
    }

    function registerTest(uint256 jobId, bytes32 expectedHash) external {
        // called by job client at creation time
        expectedOutputHashes[jobId] = expectedHash;
    }

    function evaluate(uint256 jobId, address submittedContract) external {
        bytes32 result = ITestTarget(submittedContract).run();
        if (result == expectedOutputHashes[jobId]) {
            jobContract.complete(jobId, "All test vectors passed");
        } else {
            jobContract.reject(jobId, "Test vector mismatch");
        }
    }
}
```

Works for: math proofs, code challenges, verifiable data transformations, anything with a deterministic correct answer.

Limitation: most real-world AI work is not deterministic. "Write a good blog post" cannot be evaluated on-chain.

**4. ZK-proof verifier**

Zero-knowledge machine learning (zkML) can prove that a specific model ran on specific inputs and produced a specific output, without revealing model weights or inputs. The evaluator contract checks the proof. This is the theoretically correct answer for AI work. ERC-8004's validation registry already cites ZK attestations as a first-class verification path.<sup>[3](#fn-3)</sup>

Reality today: zkML proof generation is slow and expensive for anything beyond toy models. It is an active research area, not a production pattern yet.

**5. TEE (Trusted Execution Environment)**

A TEE like Intel TDX or AWS Nitro Enclaves runs the evaluation logic inside a hardware-isolated environment. The enclave produces a cryptographic attestation: "code X ran on input Y and produced output Z." That attestation is verifiable on-chain.

More practical than ZK today. ERC-8004's validator registry uses TEE attestations for agent identity verification, and the Virtuals Protocol team cites TEE-based evaluators as their production path for ERC-8183.<sup>[4](#fn-4)</sup>

Trade-off: you are trusting the hardware manufacturer (Intel, AMD, AWS) to correctly implement the attestation. The trust assumption does not disappear. It shifts from "trust this person" to "trust this hardware."

## The known risk

ERC-8183 v0.1 is explicit about its own limitation. The evaluator has final say. There is no on-chain dispute mechanism. If the evaluator calls `reject()` with a spurious reason, the provider has no recourse until a future version adds one.

The Ethereum Magicians thread on ERC-8183 flags this directly: "The Evaluator is where the real complexity lives. Subjective task evaluation requires sophisticated arbitration." Dispute resolution is listed as a v2 feature.<sup>[2](#fn-2)</sup>

Two specific attack vectors matter here:

**Evaluator-provider collusion**: the evaluator calls `complete()` for work that does not meet the standard. The client paid for nothing. The evaluator may split the payment with the provider after the fact.

**Evaluator-client collusion**: the evaluator calls `reject()` for legitimate work. The client keeps their payment. The provider loses their time.

The current mitigation is reputation. [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004), which went live on Ethereum mainnet on January 29, 2026, defines a Reputation Registry where agent addresses accumulate scores based on completed work.<sup>[3](#fn-3)</sup> ERC-8183 supports optional hooks that let job contracts gate providers (require reputation score above a threshold) and evaluators (require the evaluator to have staked a bond).

This is reputation as an economic deterrent, not a cryptographic guarantee. A new evaluator with no history has nothing to lose. For high-value jobs today, use a multisig evaluator you trust personally. Reserve smart-contract evaluators for deterministic tasks. As reputation systems accumulate history and ZK proving gets cheaper, the trustless path becomes viable for more task types.

## The on-chain footprint

Every evaluator decision leaves an immutable record. When `complete()` fires, the contract emits:

```
JobCompleted(jobId, provider, payment, reason)
```

When `reject()` fires:

```
JobRejected(jobId, reason)
```

The full job lifecycle sits in contract state: creation timestamp, funding transaction, submission URI, completion or rejection, the evaluator address that made the call, and the reason string they attached.

This matters for anyone debugging an agentic commerce deployment. If a job was rejected, you can see which evaluator called it, at which block, with which reason. If an evaluator is systematically rejecting submissions from certain providers, the pattern shows up in the logs. If the escrow release never fired, the state machine tells you exactly which step it is stuck on.

A block explorer that can decode the ERC-8183 state machine makes all of this readable without parsing raw logs. You query the job contract, and the full lifecycle of every job is visible: state transitions, payment amounts, evaluator attestations, timestamps. When debugging agentic commerce contracts on a testnet, [Ethernal](https://tryethernal.com) does this out of the box. Connect it to your RPC, point it at your job contract, and you get a decoded event stream and contract state in under five minutes.

## What good evaluator design looks like

Three patterns that work today:

**For deterministic tasks** (code challenges, math, verifiable data transformations): write a standalone on-chain evaluator contract with explicit test conditions. Keep the evaluator logic separate from the job contract and audit it independently.

**For high-value subjective tasks**: use a multisig evaluator with a reputation-staking mechanism. The evaluator posts a bond, slashable by a DAO or arbitrator if the rejection is ruled spurious. This is the same pattern dispute-resolution protocols like Kleros use for human arbitration on-chain.<sup>[7](#fn-7)</sup>

**For agent-to-agent commerce at scale**: track the ERC-8165 Agentic Onchain Operations standard. Proposed by CSIRO researchers in February 2026, it introduces structured settlement receipts: signed, machine-readable records of intent fulfillment that an evaluator contract can consume as automatic proof of completed work.<sup>[8](#fn-8)</sup> The solver's proof of execution becomes the evaluator's input, closing the trust gap for a wide class of tasks.

The evaluator problem is real, but it is tractable. Every decision is on-chain, every state transition is verifiable, and the standards forming around ERC-8183 are adding the economic and cryptographic primitives that make trustless evaluation possible for progressively more task types.

What makes ERC-8183 worth watching is not that it solves this today. It is that the evaluator-agnostic design leaves the door open for evaluator contracts to evolve. Teams building on v0.1 can swap their EOA evaluator for a TEE-backed contract when the tooling matures, without rewriting their job escrow logic.

The question of who evaluates the agent is still open. But at least now there is a standard place to plug in the answer.

---

## References

<span id="fn-1">1.</span> Crapis, D. and Virtuals Protocol. "ERC-8183: Agentic Commerce Protocol." _Ethereum Improvement Proposals_, 2026. <a href="https://eips.ethereum.org/EIPS/eip-8183" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-2">2.</span> Ethereum Magicians. "ERC-8183: Agentic Commerce — Discussion." _ethereum-magicians.org_, 2026. <a href="https://ethereum-magicians.org/t/erc-8183-agentic-commerce/27902" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-3">3.</span> Crapis, D. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, 2026. <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-4">4.</span> Mpost. "Virtuals Protocol Unveils ERC-8183 Standard to Enable Trustless Commerce Between AI Agents and Users." _mpost.io_, 2026. <a href="https://mpost.io/virtuals-protocol-unveils-new-erc-8183-standard-to-enable-trustless-commerce-between-ai-agents-and-users/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-5">5.</span> CoinDesk. "Ethereum to Roll Out New AI Agents Standard Soon." _coindesk.com_, 2026. <a href="https://www.coindesk.com/tech/2026/01/28/the-protocol-ethereum-to-roll-out-new-ai-agents-standard-soon" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-6">6.</span> Allium. "ERC-8004 Explained: Identity and Reputation for AI Agents." _allium.so_, 2026. <a href="https://www.allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks-for-agent-infrastructure/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-7">7.</span> Kleros. "Kleros: Decentralized Court — Dispute Resolution Protocol." _kleros.io_, 2024. <a href="https://kleros.io" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-8">8.</span> CSIRO et al. "ERC-8165: Agentic Onchain Operations." _Ethereum Magicians_, 2026. <a href="https://ethereum-magicians.org/t/erc-8165-agentic-on-chain-operation-interface/27773" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-9">9.</span> Autonomous Agents on Blockchains Research Group. "Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries." _arxiv.org_, 2026. <a href="https://arxiv.org/html/2601.04583v1" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
