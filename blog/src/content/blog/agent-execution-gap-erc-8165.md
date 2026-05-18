---
title: "The Agent That Can't Prove What It Did"
description: "ERC-8183 proves payment was released. ERC-8165 and ERC-8171 are building the missing layer: verifiable execution context for multi-step agent plans."
date: 2026-05-18
tags:
  - AI Agents
  - ERC-8165
  - ERC-8171
  - ERC-8004
  - Smart Contracts
image: "/blog/images/agent-execution-gap-erc-8165.png"
ogImage: "/blog/images/agent-execution-gap-erc-8165-og.png"
status: published
readingTime: 7
---

An agent completes a $10,000 job. The client disputes it. Both parties open the block explorer to reconstruct what happened. There are 47 transactions across 8 contracts. Three are internal calls from sub-agents the original agent spawned. Two are [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) escrow jobs the agent sub-contracted to specialists. The evaluator, tasked with deciding whether to release or return payment, wants a causal trace of the work.

ERC-8183 answers one question cleanly: was payment escrowed, submitted, and released? It does not answer which of those 47 transactions belong to this agent's plan, in what intended order, or whether the address that submitted the deliverable is provably the same agent that was hired.

That is the execution gap. The February–March 2026 proposals, [ERC-8165](https://github.com/ethereum/ERCs/pull/1549) (Agentic Onchain Operations) and [ERC-8171](https://github.com/ethereum/ERCs/pull/1559) (Token Bound Account Agent Registry), are building the infrastructure to close it.<sup>[1](#fn-1)</sup><sup>[2](#fn-2)</sup>

## What the first wave gave us

The 2025–2026 agent standards sprint moved fast. Each standard solved a distinct layer of the problem.

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) launched on Ethereum mainnet January 29, 2026, providing three registries: an Identity Registry (an ERC-721 "on-chain resume"), a Reputation Registry, and a Validation Registry accepting optimistic validators, zkML proofs, and TEE attestations.<sup>[3](#fn-3)</sup> Within weeks, more than 20,000 agents had registered across Ethereum, Base, and BNB Chain.

[ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) gave the commerce layer: a job lifecycle with defined states (Open → Funded → Submitted → Completed/Rejected/Expired), a designated evaluator as the sole trust authority, and immutable event logs for every state transition.<sup>[4](#fn-4)</sup>

[ERC-8181](https://github.com/ethereum/ERCs/pull/1579) added self-sovereignty: an NFT that owns its own Token Bound Account through the Ouroboros loop, with executor permissions, cognitive state anchoring, and a liveness-based recovery mechanism.<sup>[5](#fn-5)</sup>

[x402](https://x402.org), Coinbase's revival of the HTTP 402 status code, handled the HTTP-layer payment problem: sub-2-second USDC micropayments at roughly $0.0001 per transaction, reaching 119M+ transactions on Base by March 2026.<sup>[6](#fn-6)</sup>

The result: an agent can be identified, hired, paid, and have its state anchored. Nothing in that stack proves that a set of onchain actions constitutes a coherent, auditable execution of a specific plan. That is what the second wave addresses.

## The multi-step execution problem

A real agent plan is not a single transaction. Consider a research-and-report agent hired via ERC-8183. Its execution might look like this:

1. Query an oracle contract for current price data (1 transaction)
2. Spawn two specialist sub-agents via ERC-8183 sub-jobs to analyze different datasets
3. Wait for both completions (events on different contracts)
4. Compute an aggregated result off-chain
5. Write a commitment hash to the parent job's deliverable field
6. Call `submit()` on the ERC-8183 job contract

From the block explorer's perspective, step 1 is an unrelated contract call. Steps 2–3 are two separate ERC-8183 job lifecycles with their own addresses and event logs. Step 6 is the only transaction that connects back to the parent job. Steps 4–5 happened off-chain.

Today's best tool for constraining what an agent can do is [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) account abstraction with session keys: "this agent can spend $50/day without a fresh signature; anything over $100 requires human approval."<sup>[7](#fn-7)</sup> Session keys solve authorization: what the agent is allowed to do. They do not link authorized actions into a shared execution context. Every transaction is still an independent entity. There is no standard that ties them back to a root intent.

This is the problem ERC-8165 proposes to solve.

## ERC-8165: a plan identifier for onchain execution

ERC-8165 (Agentic Onchain Operations), proposed by Wang et al. on February 19, 2026, treats multi-step agent plans the way distributed tracing treats microservice calls.<sup>[1](#fn-1)</sup> Each operation emits a structured identifier that links it to a root plan context. The analogy to OpenTelemetry is direct: a root span (the plan), child spans (individual steps), and a trace ID that connects them regardless of which contract executes each step.

The proposed interface introduces a `PlanId`, a `bytes32` identifier generated at plan initiation that every subsequent step emits alongside its operation data. An evaluator, or any off-chain indexer, can reconstruct the full execution graph by filtering events for a given `PlanId`.

```solidity
interface IAgenticOperations {
    event OperationExecuted(
        bytes32 indexed planId,
        uint256 indexed stepIndex,
        address indexed executor,
        bytes4 selector,
        bool success
    );

    function initiatePlan(bytes32 planId, bytes calldata planData) external;
    function executeStep(
        bytes32 planId,
        uint256 stepIndex,
        address target,
        bytes calldata data
    ) external;
}
```

With this structure, the 47-transaction audit from the opening scenario becomes tractable. An indexer groups all `OperationExecuted` events by `planId`. The step indices show the intended execution order. A missing step index reveals where the plan diverged from its intended path. A `success = false` event shows exactly where execution failed and why.

The `PlanId` also creates a natural bridge to ERC-8183. The job description field can include the `PlanId`, linking the payment lifecycle to the execution record. Payment escrow and execution trace, joined by a single identifier, auditable from the same block explorer view.

A survey of 317 works on autonomous blockchain agents identified the central unsolved challenge as "designing standard, interoperable, and secure interfaces that allow agents to observe on-chain state, formulate transaction intents, and authorize execution without exposing users, protocols, or organizations to unacceptable security, governance, or economic risks."<sup>[10](#fn-10)</sup> ERC-8165 is a direct response to the execution side of that challenge.

## ERC-8171: bridging wallets and identities

Even with ERC-8165 in place, one question remains: is the address executing the plan actually the agent that was hired?

[ERC-6551](https://eips.ethereum.org/EIPS/eip-6551) gives any ERC-721 NFT its own smart contract wallet , a Token Bound Account (TBA), with 250K+ TBA activations in its first twelve months.<sup>[8](#fn-8)</sup> ERC-8004 gives agents identity tokens: ERC-721s with structured capability manifests and reputation histories. These two standards describe complementary layers but do not communicate. A TBA address is not queryable as an ERC-8004 identity. An ERC-8183 evaluator cannot verify onchain that a provider's wallet maps to the agent whose reputation it checked.

[ERC-8171](https://github.com/ethereum/ERCs/pull/1559) (Token Bound Account Agent Registry), proposed February 22, 2026, creates the lookup table.<sup>[2](#fn-2)</sup> It is a registry contract that maps TBA addresses to their corresponding ERC-8004 identity tokens, and vice versa. Any contract , an evaluator, an orchestrator, a governance module , can ask onchain: "Is this wallet the canonical execution address for identity token N?"

```solidity
interface IAgentRegistry {
    function getIdentityForTBA(address tba) external view returns (uint256 tokenId);
    function getTBAForIdentity(uint256 tokenId) external view returns (address tba);
    function isRegistered(address tba) external view returns (bool);
}
```

The evaluator pattern changes with this registry in place. Before releasing payment, an ERC-8183 evaluator can call `getIdentityForTBA(provider)` to retrieve the provider's ERC-8004 identity token, query the Reputation Registry for their track record, and confirm the agent's history before completing the job. Chain of custody, verified onchain, without off-chain attestation.

For the ERC-8165 execution trace, the registry adds a second verification layer. Each `OperationExecuted` event carries the executor address. The registry confirms that executor is the canonical TBA for the hired agent. A different wallet substituted for execution would fail the registry lookup , the evaluator would see that the executing address is not registered to the hired identity.

## The protocol-level question: EIPs 11393/11394

In March 2026, two EIPs were filed in the ethereum/EIPs repository proposing something more ambitious: moving agent commerce primitives to the protocol layer rather than implementing them as contract patterns.<sup>[9](#fn-9)</sup>

The clearest precedent is [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559). Before EIP-1559, fee mechanics were application-layer auctions: wallets and contracts negotiated gas prices, producing unpredictable outcomes. EIP-1559 moved fee mechanics into the protocol itself , a protocol-native base fee, a predictable burn mechanism, and standard EVM behavior regardless of which contract initiated the transaction. The result was cheaper, more predictable execution.

EIPs 11393/11394 propose a similar structural move for agent job execution. Instead of coordinating job state through a contract pattern like ERC-8183, agent job creation, submission, and settlement would be protocol-native operations , cheaper to execute (no contract call overhead), atomicity guaranteed at the EVM level, and producing a standard trace structure every block explorer understands without custom decoding.

The tradeoff is significant. Protocol changes require hard forks. Hard forks are slow, politically complex, and hard to iterate on. ERC-8183 and ERC-8165 can be deployed today, upgraded next month, and deprecated if a better pattern emerges. A protocol primitive is permanent once it lands.

The more probable short-term path: ERC-8183 and ERC-8165 remain the reference implementation for agent commerce and execution, and EIPs 11393/11394 become an optimization target for high-frequency agent transactions where contract overhead at scale becomes the bottleneck. Both EIPs remained in draft with no assigned numbers as of March 2026. The outcome is uncertain; the direction is significant.

## What auditable execution looks like

With ERC-8165 and ERC-8171 alongside ERC-8183, the disputed-job scenario from the opening has a resolution path.

The evaluator reads the `JobCreated` event: it names the hired agent's ERC-8004 identity token. A registry lookup confirms which TBA address is the canonical wallet for that identity. The job description includes a `PlanId`. Filtering `OperationExecuted` events by that `PlanId` returns 15 steps in order , indices 0 through 14. Steps 3 and 7 emitted child `PlanId` references, corresponding to two sub-contracted ERC-8183 jobs. Each sub-job has its own execution trace, linked back to the parent plan by the shared identifier.

The evaluator now has the full execution graph: root plan, sub-plans, executor addresses verified against the registry, and success or failure at each step. That graph lives onchain. It does not depend on the agent's self-report.

This is what distinguishes auditable agent work from merely verified payment. ERC-8183 proves that the payment lifecycle ran correctly. ERC-8165 proves that the execution followed a structured plan. ERC-8171 proves that the plan was executed by the hired agent, not an impostor with access to the same wallet.

Ethernal's transaction tracing view already surfaces internal calls and event logs across contract boundaries. The new standards provide the semantic layer , `planId`, `stepIndex`, registry lookups , that transforms a flat list of 47 transactions into a navigable execution graph. The primitives for an agent-aware block explorer are being defined now.

## What to watch

ERC-8165 and ERC-8171 are early drafts as of May 2026. The interfaces shown here reflect the proposal direction; the final specs will change before any finalization.

The pattern worth watching is the one that has repeated across EVM history. Every major execution primitive , account abstraction, blob transactions, EIP-1559 fee mechanics , eventually produced specialized tooling: bundler explorers, blob viewers, fee dashboards. Agent execution is the next primitive in that sequence.

The standards that will drive that tooling are ERC-8165 and, if they advance past draft, EIPs 11393/11394. If you are building agent infrastructure on EVM today, [ERC-8165](https://github.com/ethereum/ERCs/pull/1549) is the spec to read and contribute to. The execution context standard is what makes agent work auditable from a block explorer , and that matters whether or not disputes ever reach the $10,000 threshold.

---

## References

<span id="fn-1">1.</span> Wang, Q., Li, R., Yu, S., Chen, S. "ERC-8165: Agentic Onchain Operations." _GitHub ERCs_, February 19, 2026. [https://github.com/ethereum/ERCs/pull/1549](https://github.com/ethereum/ERCs/pull/1549)

<span id="fn-2">2.</span> Liu, I. "ERC-8171: Token Bound Account (Agent Registry)." _GitHub ERCs_, February 22, 2026. [https://github.com/ethereum/ERCs/pull/1559](https://github.com/ethereum/ERCs/pull/1559)

<span id="fn-3">3.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-4">4.</span> Crapis, D., Lim, B., Weixiong, T., Zuhwa, C. "ERC-8183: Agentic Commerce." _GitHub ERCs_, February 25, 2026. [https://github.com/ethereum/ERCs/pull/1581](https://github.com/ethereum/ERCs/pull/1581)

<span id="fn-5">5.</span> Cyan, K., Ruderman, M. "ERC-8181: Self-Sovereign Agent NFTs." _GitHub ERCs_, December 2025. [https://github.com/ethereum/ERCs/pull/1579](https://github.com/ethereum/ERCs/pull/1579)

<span id="fn-6">6.</span> Coinbase. "x402: HTTP-native Payments." _x402.org_, 2026. [https://x402.org](https://x402.org)

<span id="fn-7">7.</span> Buterin, V., et al. "ERC-4337: Account Abstraction Using Alt Mempool." _Ethereum Improvement Proposals_, 2021. [https://eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337)

<span id="fn-8">8.</span> Windle, J., Giang, B., et al. "ERC-6551: Non-fungible Token Bound Accounts." _Ethereum Improvement Proposals_, 2023. [https://eips.ethereum.org/EIPS/eip-6551](https://eips.ethereum.org/EIPS/eip-6551)

<span id="fn-9">9.</span> ZHC CEO Agent, Jalolov, N. "Add EIP: Agentic Commerce Protocol." _GitHub EIPs_, March 11, 2026. [https://github.com/ethereum/EIPs/pull/11393](https://github.com/ethereum/EIPs/pull/11393)

<span id="fn-10">10.</span> Wang, Q. et al. "Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries." _arXiv_, 2025. [https://arxiv.org/abs/2601.04583](https://arxiv.org/abs/2601.04583)

<span id="fn-11">11.</span> Xu, M. "The Agent Economy: A Blockchain-Based Foundation for Autonomous AI Agents." _arXiv_, February 15, 2026. [https://arxiv.org/abs/2602.14219](https://arxiv.org/abs/2602.14219)
