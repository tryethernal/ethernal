---
title: "The Missing Verb: How ERC-8165 Gives AI Agents an Execution Model"
description: "ERC-8165 gives AI agents a standard execution model: declare an outcome, let solvers compete to fulfill it. How the intent struct and settlement loop work."
date: 2026-05-02
tags:
  - AI Agents
  - ERC-8165
  - ERC-8004
  - Ethereum
  - DeFi
image: "/blog/images/the-missing-verb-erc-8165.png"
ogImage: "/blog/images/the-missing-verb-erc-8165-og.png"
status: published
readingTime: 8
---

An AI agent inside a DeFi treasury management system needs to swap 10,000 USDC for ETH to fund an [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) job. The naive approach: give the agent a private key with permission to call `swap()` on Uniswap. The immediate problems multiply fast. Which pool has the best price right now? How much slippage is acceptable? Should the order split across multiple DEXes? What gas price is reasonable given current mempool congestion? Every parameter is a decision point the agent must get right, and every decision point is a potential exploit or a source of value leak.

The intent model inverts this. The agent declares *what* it wants, not *how* to get it: "I will spend at most 10,050 USDC and I want at least 4.8 ETH back, valid for the next 15 minutes." Solvers compete to fulfill it. Best execution wins. The agent's job is outcome specification, not routing.

[ERC-8165](https://github.com/ethereum/ERCs/pull/1549) standardizes this pattern for AI agents, tying every execution back to the agent's onchain identity.<sup>[2](#fn-2)</sup>

## Why agents need a different execution model

The agent economy now has standards for two things: what an agent *is* ([ERC-8004](https://eips.ethereum.org/EIPS/eip-8004), identity and reputation) and what an agent *earns* ([ERC-8183](https://eips.ethereum.org/EIPS/eip-8183), job escrow and payment). What neither standard addresses is *how the agent moves assets between those two poles*.

The existing options each fail in a different way. An EOA with a private key is a single point of failure , compromise the key, compromise the agent. ERC-4337 UserOperations require the caller to specify exact calldata: which contract, which function, which parameters. The agent is still doing the routing; account abstraction just changes who pays gas. Smart contract wallets with whitelisted operations are more constrained but break the moment market conditions require a route that was not anticipated at deployment.

The intent model, where an agent declares a desired outcome and an open solver network competes to fulfill it, is already the dominant execution pattern in DeFi. CoW Protocol, 1inch Fusion Mode, and UniswapX all use intent-based solving. Intent-solver systems accounted for $4.1 billion in cross-chain volume over a 90-day period in early 2026.<sup>[1](#fn-1)</sup> This is not an experimental primitive. It is proven infrastructure.

ERC-8165, drafted by Qin Wang, Ruiqiang Li, Saber Yu, and Shiping Chen and submitted to the ERCs repository on February 18, 2026, applies this primitive specifically to AI agents.<sup>[2](#fn-2)</sup> The critical addition: an `agentIdentity` field that links every fulfilled intent to the agent's ERC-8004 registry entry. Reputation builds from execution, not just from completed jobs.

## What an agent actually declares

ERC-8165 defines a single data structure as its core primitive:

```solidity
struct Intent {
    address maker;           // The agent issuing the intent
    address inputToken;      // Token the agent is spending
    uint256 inputAmountMax;  // Maximum the agent will spend (ceiling)
    address outputToken;     // Token the agent wants in return
    uint256 outputAmountMin; // Minimum the agent will accept (floor)
    address receiver;        // Where the output goes
    uint48  validAfter;      // Earliest execution timestamp
    uint48  validUntil;      // Latest execution timestamp
    uint256 nonce;           // Replay protection, per-maker
    bytes32 constraintsHash; // Optional additional execution constraints
    uint256 feeBps;          // Solver fee in basis points
    bytes32 salt;            // Additional replay protection
    address agentIdentity;   // ERC-8004 registry address of this agent
}
```

The agent never specifies a DEX, a pool, a route, a gas price, or a calldata path. Those are solver concerns. What the agent specifies is its acceptable range: `inputAmountMax` is the ceiling on what it will spend, `outputAmountMin` is the floor on what it will accept. That pair encodes the agent's tolerance for execution quality without requiring the agent to understand market microstructure.

`validAfter` and `validUntil` bound the execution window temporally. An intent can declare itself invalid before a certain block (to avoid frontrunning a position entry) and expired after a timestamp (to prevent stale execution against a price that has moved). Authorization is time-limited by construction.

`constraintsHash` is the escape valve. The solver must satisfy additional constraints committed to by this hash. What those constraints encode is application-defined: execution sequence, external condition checks, access controls, or anything else that matters to the agent. This is not a limit order. It is an outcome specification with arbitrary constraint composition.

`agentIdentity` is the field that ties the whole series together. It is the ERC-8004 registry address of the issuing agent. When the intent settles, this address appears in the `IntentFulfilled` event alongside the solver, the amounts, and the fees. Execution becomes part of the agent's attributed onchain history.

One misconception worth addressing: the agent does not need a raw private key to sign intents. ERC-8165 accepts EIP-1271 signatures from contract wallets. An ERC-8181 Token Bound Account (or any other smart contract) can be the `maker`. The agent can sign programmatically through its own verified logic rather than exposing a key.

## From intent to settlement: the six-step loop

ERC-8165's execution cycle has six stages:

```
Author → Sign → Distribute → Solve → Execute → Verify & Record
```

Author. The agent constructs the `Intent` struct with its desired outcome bounds and submits it for signing.

Sign. The intent is signed using EIP-712 typed data. The resulting signature travels with the intent through the rest of the cycle and is verified on fulfillment.

Distribute. Two profiles are defined. Profile A (recommended): the agent calls `submitIntent(intent, signature)` on an onchain hub, registering the intent before any solver touches it. Profile B: the agent sends the intent off-chain directly to a solver network; the full intent is supplied by the solver at fulfillment time. Profile A produces a transaction record before settlement; Profile B is invisible onchain until `IntentFulfilled` fires.

Solve. Solvers monitoring the hub or their off-chain channel construct the execution calldata to route the swap and race to fulfill.

Execute. The winning solver calls `fulfill(intentId, executionData)`. Execution is atomic. The solver either delivers at least `outputAmountMin` to the receiver or the call reverts. No partial fills, no value leakage through incomplete execution.

Verify & record. A successful fulfillment emits `IntentFulfilled` and the intent transitions to its terminal state.

The state machine:

```
Draft → Signed → Published → Executable → Fulfilled
                                        → Cancelled
                                        → Expired
```

The solver earns its incentive from the fee formula:

`feeAmount = floor(outputAmountGross × feeBps ÷ 10,000)`

`outputAmountNet = outputAmountGross − feeAmount ≥ outputAmountMin`

The agent's `outputAmountMin` floor is enforced *after* the fee is deducted. A solver cannot extract a fee that drops the agent's net receipt below the declared minimum. The bounds are not advisory.

The core hub interface is minimal:

```solidity
interface IIntentHub {
    function submitIntent(Intent calldata intent, bytes calldata signature)
        external returns (bytes32 intentId);

    function fulfill(bytes32 intentId, bytes calldata executionData)
        external returns (uint256 outputAmountNet);

    function cancelIntent(bytes32 intentId) external;
}
```

An optional `IIntentHubReceipts` extension adds `getReceipt(bytes32 intentId)` for structured settlement retrieval.

## The ERC-8004 bridge: reputation from execution

Under ERC-8183, an agent's ERC-8004 reputation grows from job completions. An evaluator calls `complete()`, payment releases, and the event is raw material for a reputation score update. That covers agent behavior as a *provider* of work.

ERC-8165 covers a second dimension: autonomous asset movement. The agent acting as *consumer* (swapping tokens, funding positions, moving value between chains) leaves an attributed trace through every `IntentFulfilled` event. Over time, those events form a verifiable history: what the agent traded, whether it set realistic slippage bounds or bled value to solvers, which solver networks its intents consistently attracted.

ERC-8165 does not define how `IntentFulfilled` events feed back into ERC-8004 reputation scores. That bridge is application-layer for now. But the infrastructure for it exists: ERC-8004's Validation Registry accepts optimistic validators, zkML proofs, and TEE attestations as verification mechanisms. A validator contract that reads `IntentFulfilled` events and updates agent scores is a direct composition of both standards.

The mental model for the series so far: ERC-8004 is the identity layer (what the agent *is*). ERC-8165 is the execution layer (what the agent *does* autonomously). ERC-8183 is the commerce layer (what the agent *earns* from others). Different semantics, same identity substrate.

## What settles onchain

The `IntentFulfilled` event is the primary settlement artifact:

```solidity
event IntentFulfilled(
    bytes32 indexed intentId,
    address indexed maker,
    address indexed fulfiller,
    address receiver,
    address inputToken,
    uint256 inputAmountUsed,
    address outputToken,
    uint256 outputAmountNet,
    uint256 feeAmount,
    address feeRecipient,
    address executorAgent      // ERC-8004 agent address
);
```

Every field is decoded and attributed. For an operator running a chain that hosts agent activity, a single `IntentFulfilled` event answers: which agent initiated the swap, which solver fulfilled it, the exact input spent, the net output received, the fee extracted, the fee recipient, and the receiver address. This is not a raw ERC-20 `Transfer` event with no context. It is a complete, structured record of an agent-initiated economic action.

Profile A intents produce an earlier signal: `submitIntent()` lands as a transaction on the hub before any solver acts. Profile B intents are invisible until settlement.

The contrast with today's reality is stark. A raw ERC-20 transfer initiated by an agent looks identical to one initiated by a human. There is no `Transfer` field for agent attribution, no record of which solver ran what route, no slippage bounds to audit against. Intent-based execution is more transparent by construction, not less.

For a block explorer pointed at an ERC-8165 hub, decoded `IntentFulfilled` events give operators the full execution audit trail , amounts, solver identity, fee extraction, agent attribution , from a single event log. [Ethernal](https://tryethernal.com) connects to your chain's RPC and decodes these events without configuration, giving teams running agent-heavy chains the operational visibility that raw calldata parsing cannot.

## What ERC-8165 leaves out (deliberately)

The spec is explicit about its scope. It excludes: execution routing logic, agent learning mechanisms, cross-chain messaging, token economics beyond declared fees, and delegation or authorization policies. These are not oversights. They are design choices.

The solver is responsible for execution quality. The agent is responsible for outcome specification. Keeping those responsibilities separate is what makes the standard composable with whatever routing infrastructure, cross-chain bridges, or agent learning systems emerge later.

MEV exposure remains an open problem at the solver layer. Intent-based systems resist the classic sandwich attack against the agent , the solver commits to delivering at least `outputAmountMin`, so the agent's floor is contractually enforced. But solver-level MEV, where a solver captures value between its commitment and its execution, is not addressed by ERC-8165. It is application-layer for now.

The ERC-8183 comparison is worth making explicit. ERC-8183 covers work contracts: an agent is hired as a provider, completes a job, and an evaluator releases payment. ERC-8165 covers autonomous execution: an agent decides unilaterally to move assets and delegates the *how* to a solver market. They compose naturally. An agent receives payment via an ERC-8183 job completion, then uses an ERC-8165 hub to route those proceeds into the next step of its pipeline.

## Three layers, one stack

Three layers now have specifications. [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) provides identity: discovery, reputation, validation , and it has been live on Ethereum mainnet since January 2026, with over 45,000 agents registered within the first month.<sup>[3](#fn-3)</sup> [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) provides commerce: job escrow, evaluator model, payment release , with a reference implementation already deployed on Sepolia at `0xE7cdb812E2dF3E2898D50b392bF1B3D072eE5d68`. ERC-8165 provides execution: intent submission, solver competition, settlement receipts.

ERC-8165 is an open draft. No mainnet deployment address exists yet. The interface is specified; the ecosystem tooling is not built.

The monitoring argument holds regardless of deployment timeline. Intent-based execution makes agent behavior auditable in a way that raw ERC-20 transfers cannot be. Every `IntentFulfilled` event is a complete, attributed, decoded record of what the agent did, what it spent, what it received, and which solver fulfilled it. The surveillance surface exists from the moment the hub deploys , not as a bolt-on, but as the native output of the protocol.

The gap that remains is operational tooling, not standards. The specs are assembling faster than the infrastructure to run them.

---

## References

<span id="fn-1">1.</span> deBridge. "How AI Agents Trade Crypto in 2026." _deBridge Learn_, 2026. [https://debridge.com/learn/guides/how-ai-agents-trade-crypto-in-2026/](https://debridge.com/learn/guides/how-ai-agents-trade-crypto-in-2026/)

<span id="fn-2">2.</span> Wang, Q., Li, R., Yu, S., Chen, S. "ERC-8165: Agentic Onchain Operations." _GitHub ERCs_, February 18, 2026. [https://github.com/ethereum/ERCs/pull/1549](https://github.com/ethereum/ERCs/pull/1549)

<span id="fn-3">3.</span> Eco. "What Is ERC-8004? The Ethereum Standard Enabling Trustless AI Agents." _eco.com_, 2026. [https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents](https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents)

<span id="fn-4">4.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-5">5.</span> Crapis, D., Lim, B., Weixiong, T., Zuhwa, C. "ERC-8183: Agentic Commerce." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8183](https://eips.ethereum.org/EIPS/eip-8183)

<span id="fn-6">6.</span> Wang, Q. et al. "Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries." _arXiv_, January 2026. [https://arxiv.org/html/2601.04583v1](https://arxiv.org/html/2601.04583v1)

<span id="fn-7">7.</span> CoinDesk. "Ethereum to Roll Out New AI Agents Standard Soon." _CoinDesk_, January 28, 2026. [https://www.coindesk.com/tech/2026/01/28/the-protocol-ethereum-to-roll-out-new-ai-agents-standard-soon](https://www.coindesk.com/tech/2026/01/28/the-protocol-ethereum-to-roll-out-new-ai-agents-standard-soon)
