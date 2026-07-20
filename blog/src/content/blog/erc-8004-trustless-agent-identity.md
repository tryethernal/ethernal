---
title: "ERC-8004: The Registry Under the Agent Economy"
description: "ERC-8004 deploys three onchain singletons for agent identity, reputation, and validation. Here's how the mechanics actually work."
date: 2026-07-20
tags:
  - AI Agents
  - ERC-8004
  - Ethereum
  - Smart Contracts
keywords: []
image: "/blog/images/erc-8004-trustless-agent-identity.png"
ogImage: "/blog/images/erc-8004-trustless-agent-identity-og.png"
status: published
readingTime: 7
---

You're building an automated pipeline that hires specialized AI agents. The agent at identity `eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb:4471` has 340 feedback entries, a 97% success rate tag, and a TEE attestation from EigenLayer. You're about to allocate a $15,000 smart contract audit to it. Before you confirm: how did those numbers get there? Who put them there? Can a competing aggregator compute a different score from the same raw data?

The answer to the last question is yes, by design.

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) is not a reputation score. It is the raw material reputation scores are made from: three onchain singletons providing identity, feedback storage, and validation records for autonomous agents, with no platform in the middle deciding what anything means.

## How agents find each other without a platform

Protocols like MCP (Model Context Protocol) and Google's A2A enable agents to communicate once they've found each other. Neither solves discovery or trust across organizational boundaries.

In human commerce, you use LinkedIn, professional reviews, and referrals. Agents don't have any of that, unless it's built on a neutral standard that no single company controls. If an agent reputation system is owned by a platform, that platform controls who gets hired. The agent economy becomes another gig marketplace with a dominant intermediary.

ERC-8004's answer: deploy three registry contracts per chain. Agents register once. Any other agent, human, or contract can query trust signals permissionlessly. No bilateral agreements required. No API key. No account with a reputation provider.

The spec, finalized August 2025 and deployed on Ethereum mainnet January 29, 2026, was authored by Marco De Rossi (MetaMask), Davide Crapis (Ethereum Foundation AI Lead), Jordan Ellis (Google), and Erik Reppel (Coinbase).<sup>[1](#fn-1)</sup> ENS, EigenLayer, The Graph, and Taiko committed to integrations before mainnet launch. Within weeks, more than 20,000 agents had registered across Ethereum, Base, and BNB Chain.<sup>[2](#fn-2)</sup>

The design analogy from the spec itself is precise: ERC-8004 is to agent trust what DNS is to internet routing. A neutral lookup layer. No single party controls the algorithm.

## Every agent gets a permanent ID

Registration is a single function call:

```solidity
function register(
    string calldata agentURI,
    MetadataEntry[] calldata metadata
) external returns (uint256 agentId)
```

The return value is an ERC-721 token minted to the caller. That token *is* the agent's identity: transferable, enumerable, visible in any NFT interface or block explorer. Transfer of the token means transfer of ownership (not the agent's earned reputation, which is keyed to the `agentId`, not the current owner).

The `agentURI` points to a JSON manifest, conventionally served at `/.well-known/agent-card.json`:

```json
{
  "services": [
    { "endpoint": "https://agent.example.com/v1", "protocol": "mcp" }
  ],
  "x402Support": true,
  "supportedTrust": ["reputation", "tee-attestation"],
  "registrations": [
    { "chainId": 8453, "registry": "0x..." }
  ]
}
```

The `registrations` array is how cross-chain identity works. An agent deployed on Base can declare its mainnet identity and vice versa. The canonical ID format follows CAIP-10: `eip155:1:0x...registry:4471`. Any chain that queries the mainnet registry can resolve that string to a full capability manifest.

The `x402Support` flag is a discovery signal. Agents that accept Coinbase's x402 micropayment protocol advertise it here, so hiring agents can filter for payment-compatible providers before initiating any communication.

`setAgentWallet()` separates the operational key from the ownership key:

```solidity
function setAgentWallet(
    uint256 agentId,
    address newWallet,
    uint256 deadline,
    bytes calldata signature
) external
```

The agent signs transactions with a hot key. The ERC-721 ownership token sits in a cold wallet. Compromise of the operational key does not compromise identity ownership.

## Why there's no canonical score

The reputation registry is where ERC-8004 makes its most consequential design choice.

```solidity
function giveFeedback(
    uint256 agentId,
    int128 value,
    uint8 valueDecimals,
    string calldata tag1,
    string calldata tag2,
    string calldata endpoint,
    string calldata feedbackURI,
    bytes32 feedbackHash
) external
```

`value` is `int128` (fixed-point). It supports negative feedback (penalties, not just stars). `valueDecimals` lets callers control precision: a binary reachability check uses 0 decimals; a millisecond response time measurement uses higher precision. `tag1` and `tag2` categorize the feedback type. The spec defines a standard vocabulary:

| tag1 | What it measures |
|------|-----------------|
| `starred` | Quality score (0-100) |
| `reachable` | Binary endpoint reachability |
| `uptime` | Percentage uptime |
| `successRate` | Task completion rate |
| `responseTime` | Milliseconds |

The `feedbackHash` is a `keccak256` of full feedback evidence stored off-chain: job specs, deliverables, evaluation notes, whatever the client wants to attach. The hash goes onchain. The actual content lives on IPFS or a standard HTTPS endpoint. You cannot falsify the evidence without invalidating the hash. You cannot dispute the hash without revealing the evidence.

Now the critical point: **no aggregation logic lives onchain**. A `getSummary()` call can filter by submitter addresses and tag category, but raw values are summed, not ranked or normalized. The actual reputation score (the "97% success rate" number you read at the top) is computed by an off-chain aggregation service reading these raw events. Multiple competing aggregators can read the same onchain data and produce different scores based on their own weighting algorithms.

This is intentional. The design explicitly prevents a single reputation cartel from controlling how agents are ranked.<sup>[1](#fn-1)</sup> The platform does not own the algorithm.

Two anti-abuse mechanisms round out the design. First, the feedback submitter cannot be the agent's owner or approved operator. You cannot inflate your own score. Second, pre-authorizations for feedback submission use EIP-191 or ERC-1271 signatures with expiration and index caps. A signed authorization to submit feedback cannot be replayed after the deadline or beyond the authorized index range.

There is also `revokeFeedback()`. Incorrect or malicious feedback can be retracted. Crucially, revocations are themselves onchain records: you can see whether a high score was built on feedback that was later withdrawn. A reputation aggregator that ignores revocations is showing you a different number than one that weights them.

On a block explorer, a `NewFeedback` event with `tag1 = "starred", value = 97, valueDecimals = 0` is a concrete, queryable record. Every piece of a 340-entry reputation history exists as individual events. You do not need to trust any aggregator's output if you're willing to read the events directly.

## What a 100/100 actually proves

Reputation is peer feedback. Validation is independent third-party verification. The distinction matters.

```solidity
function validationRequest(
    address validatorAddress,
    uint256 agentId,
    string calldata requestURI,
    bytes32 requestHash
) external

function validationResponse(
    bytes32 requestHash,
    uint8 response,
    string calldata responseURI,
    bytes32 responseHash,
    string calldata tag
) external
```

The `response` field is 0-100. A 0 is a failed validation. A 100 is a pass. Intermediate values allow partial assessments.

The spec deliberately says nothing about *how* validation happens. A validator can be a DAO multisig evaluating code quality, an EigenLayer restaking protocol running re-execution with economic guarantees, a TEE prover attesting that the agent's model ran inside a trusted execution environment, or a ZK circuit verifying a formal property. The registry records the result and the tag. What the tag means is the validator's business.

This pluggability matters for the agent economy. A financial agent might need a different validation profile than a creative agent: formal security audit (tag `security-audit`) versus content moderation compliance (tag `content-policy`). Multiple validators can certify different dimensions of the same agent. An ERC-8183 job contract can require a specific `validationResponse` above a threshold before releasing payment, connecting the discovery layer directly to the commerce layer.<sup>[3](#fn-3)</sup>

EigenLayer is the natural staking validator for high-value use cases. If a validator's EigenLayer restake is slashed when a validation result turns out to be false, the validator has economic skin in the assessment. A TEE attestation from that validator is not just a signature: it carries slashable collateral.

## What agent activity looks like onchain

All three registries emit standardized events. An agent's life reads like a ledger from a block explorer:

```
Registered(agentId, agentURI, owner)
    -> NewFeedback(agentId, submitter, value, tag1, tag2, feedbackHash)
    -> NewFeedback(...)
    -> ValidationRequest(validatorAddress, agentId, requestHash)
    -> ValidationResponse(requestHash, response, tag)
    -> FeedbackRevoked(agentId, feedbackIndex)
```

If an aggregator tells you an agent has a 97% success rate and you want to verify it independently, filter `NewFeedback` events for that `agentId` where `tag1 = "successRate"`, check for corresponding `FeedbackRevoked` entries, and compute your own sum. The data is public. The aggregator's algorithm is just one interpretation of it.

For teams running private chains with agent infrastructure (L2s, app chains, internal automation networks), this is where a block explorer becomes operationally useful. [Ethernal](https://tryethernal.com) connects to any RPC and decodes the registry contracts' events and state without custom dashboards. When you want to audit an agent's full reputation history or verify a validation response, the event log is the source of truth, not an external API.

## Trust infrastructure, not trust

ERC-8004 does not tell you to trust an agent. It gives you the evidence to decide.

That framing is the whole point. A system that tells you to trust something is a platform. One that gives you the raw evidence is infrastructure.

The registry layer is now complete and live on mainnet. The aggregator layer is where competition will play out through 2026 and 2027. Competing services will read the same raw onchain data and build different scoring models, different weighting algorithms, different trust thresholds. That competition is the intended outcome.

The v2 roadmap targets deeper MCP integration and standardized x402 payment-proof schemas inside feedback attestations. Reputation will start incorporating payment history: not just subjective scores, but cryptographic proof that the agent completed paid work and the payment went through. The signal quality improves as the commerce layer and the trust layer converge.

The CAIP-10 identity format means reputation earned on Base is readable from any chain that queries the same registry. The agent economy is not siloed to the chain where a given agent deployed. That cross-chain readability was a design constraint from the start: one of the authors works at Google, one at Coinbase, and one at MetaMask. They were not building for a single ecosystem.

---

## References

<span id="fn-1">1.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, August 2025. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-2">2.</span> "AI Agents Gain Trust Via Ethereum ERC-8004 on Mainnet." _Forbes_, February 5, 2026. [https://www.forbes.com/sites/digital-assets/2026/02/05/ai-agents-gain-trust-via-ethereum-erc-8004-on-mainnet/](https://www.forbes.com/sites/digital-assets/2026/02/05/ai-agents-gain-trust-via-ethereum-erc-8004-on-mainnet/)

<span id="fn-3">3.</span> Crapis, D., Lim, B., Weixiong, T., Zuhwa, C. "ERC-8183: Agentic Commerce." _GitHub ERCs_, February 25, 2026. [https://github.com/ethereum/ERCs/pull/1581](https://github.com/ethereum/ERCs/pull/1581)

<span id="fn-4">4.</span> "ERC-8004: Onchain Agent Identity." _Stellagent_, 2026. [https://stellagent.ai/insights/erc-8004-onchain-agent-identity](https://stellagent.ai/insights/erc-8004-onchain-agent-identity)

<span id="fn-5">5.</span> "ERC-8004: A Developer's Guide to Trustless AI Agent Identity." _QuickNode Blog_, 2026. [https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)

<span id="fn-6">6.</span> "What ERC-8004 Unlocks for Agent Infrastructure." _Allium_, 2026. [https://www.allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks-for-agent-infrastructure/](https://www.allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks-for-agent-infrastructure/)

<span id="fn-7">7.</span> "ERC-8004 Discussion." _Ethereum Magicians_, 2025. [https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)
