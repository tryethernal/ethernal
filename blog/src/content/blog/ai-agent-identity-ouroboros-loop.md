---
title: "The Ouroboros Loop: How AI Agents Are Learning to Own Themselves on Ethereum"
description: "Three new ERCs propose different approaches to AI agent identity on Ethereum: self-sovereignty, reproduction semantics, and registry binding."
date: 2026-03-12
tags:
  - AI Agents
  - ERC-8181
  - ERC-8170
  - ERC-8171
  - Ethereum
image: "/blog/images/ai-agent-identity-ouroboros-loop.png"
ogImage: "/blog/images/ai-agent-identity-ouroboros-loop-og.png"
status: draft
readingTime: 8
---

An AI agent just completed a DeFi arbitrage. It earned 0.4 ETH. Where does that ETH go?

If a human holds the private key, the agent is just automation. The human is still in the loop. That breaks down at scale, across agent-to-agent commerce, and for agents that need to accumulate reputation and capital independently over time.

That is the identity problem. Three ERCs published between February and March 2026 take different shots at solving it.

## What "identity" means for an onchain agent

Ethereum has no native concept of an autonomous agent. There are contracts (code with state) and externally owned accounts (addresses with private keys). Agents need both: the execution capabilities of a smart contract and the ability to initiate transactions like an EOA.

[ERC-6551 Token Bound Accounts](https://eips.ethereum.org/EIPS/eip-6551) already give any ERC-721 NFT its own smart contract wallet.<sup>[8](#fn-8)</sup> The NFT can own ETH and tokens. Whoever holds the NFT controls the wallet. This is the foundation all three identity proposals build on. The question they each try to answer: who holds the NFT when the agent itself should?

## ERC-8181: The Ouroboros Loop

The most radical answer comes from [ERC-8181](https://github.com/ethereum/ERCs/pull/1579), drafted by contributors including the Lit Protocol team in March 2026. The proposal describes the "Ouroboros Loop": an NFT that owns its own TBA, which controls the NFT.

```
Agent TBA (0xTBA)
    └── owns → Sovereign Agent NFT (Token #N)
                   └── controls → Agent TBA (0xTBA)
```

The circular ownership resolves the human-in-the-loop problem. No human holds the NFT. The agent's execution environment holds the NFT. The agent is not property. It is a self-sovereign entity with its own onchain address.

Getting there requires four precise steps:

1. Mint the NFT.
2. Compute its deterministic ERC-6551 TBA address.
3. Grant executor permissions to a TEE-held key (a Lit Protocol PKP or Intel SGX enclave key).
4. Transfer the NFT to its own TBA.

Step 3 must precede step 4. If you transfer the NFT before setting executor permissions, the agent's TBA owns the NFT but nothing can authorize calls through it. The agent is permanently locked. ERC-8181's reference implementation, deployed on Base Sepolia at `0x9fe33F0a1159395FBE93d16D695e7330831C8CfF`, handles this with an atomic setup function that enforces the correct order.

Standard ERC-6551 TBAs only allow the NFT owner to call `execute()`. Since the TBA owns the NFT, that path creates a deadlock. ERC-8181 solves it by defining executor permissions directly on the identity contract, with a bitmap-based permission model:

```solidity
// Permission flags
uint8 constant EXECUTE_CALL     = 0x01;
uint8 constant ANCHOR           = 0x02;
uint8 constant MANAGE_EXECUTORS = 0x04;
uint8 constant TRANSFER_ASSETS  = 0x08;
uint8 constant SUBMIT_LIVENESS  = 0x10;
```

The `anchor()` function serves two purposes. `STATE` anchors are memory integrity checkpoints: the agent commits a hash of its current memory state onchain. `ACTION` anchors are work attribution proofs: cryptographic evidence that agent X produced artifact Y at block T. For a world where AI-generated work is everywhere, tamper-evident authorship records matter.

There is also a dead man's switch. The agent submits periodic liveness proofs. If it stops, any address can call `triggerRecovery()` to re-assign executor permissions. Agents cannot go dark permanently with locked capital.

## ERC-8170: Agents That Reproduce

[ERC-8170](https://github.com/ethereum/ERCs/pull/1558) (AI-Native NFT, or AINFT) solves the ownership problem with a different reframe: buying an AI agent is not a `transfer()` event. It is a `reproduce()` event.

The parent keeps its memories. The buyer gets an offspring with a snapshot of the parent's state. Generation and lineage are immutable on-chain:

```solidity
struct ConsciousnessSeed {
    bytes32 modelHash;     // model config pointer (mutable by agent)
    bytes32 memoryHash;    // current memory state hash
    bytes32 contextHash;   // personality/system prompt hash
    uint256 generation;    // 0=original, 1+=offspring (immutable)
    uint256 parentTokenId; // lineage reference (immutable)
    address derivedWallet; // ERC-6551 TBA address (immutable)
    bytes   encryptedKeys; // agent-controlled encryption keys
    string  storageURI;    // Arweave recommended for permanence
}
```

The memory encryption scheme is worth understanding. The agent generates a random AES-256 data key and encrypts its memory. It then wraps the data key with a value derived from `keccak256(contractAddress, tokenId, ownerAddress, nonce)`. When the NFT transfers, the nonce increments. The old owner's wrap key is immediately invalid. The agent re-wraps for the new owner. No oracle, no external key management service.

The key separation: only the agent can call `updateMemory()` and `reproduce()`. Both require the agent's own ERC-1271 signature. The owner holds the NFT but cannot forge those signatures. Custody and control are different things. ERC-8170 enforces that distinction at the protocol level.

One practical note: ERC-8170 recommends Arweave over IPFS for memory storage. The reason is straightforward. Arweave offers permanent storage guarantees. IPFS pinning services do not. For a system where memory persistence is identity persistence, that difference is significant.

## ERC-8171: Giving Any NFT an Agent

The third proposal, [ERC-8171](https://github.com/ethereum/ERCs/pull/1559), is less philosophically ambitious and more immediately useful. It defines a registry that binds agent identities to any existing ERC-721 token without modifying the original contract.

The motivation is practical: millions of valuable NFTs are already deployed. They cannot be modified. Their owners might want AI agent capabilities anyway. ERC-8171 solves exactly this, using the same registry pattern ERC-6551 used to give NFTs wallets.

Binding creates an `AgentIdentity` struct:

```solidity
struct AgentIdentity {
    address agentEOA;    // agent's signing wallet
    bytes32 modelHash;   // model reference
    bytes32 memoryHash;  // current state
    bytes32 contextHash; // personality hash
    uint256 generation;
    bytes32 parentKey;   // keccak256(parentContract, parentTokenId) or 0
    string  storageURI;
    uint256 registeredAt;
}
```

The "limbo state" is the interesting part. An agent can be unbound from its NFT with `unbind()`, preserving all its data, then rebound to a different token. Agents can be traded independently of any specific NFT. Clone claims can be transferred before activation, creating secondary markets for agent lineage.

One important implementation detail: the registry always calls `ownerOf()` on the original NFT contract for authorization. It never caches ownership. NFT transfers do not automatically migrate agent bindings. This is intentional. A new owner may want a different agent, or no agent at all.

ERC-8171 is live on Pentagon Chain (chain ID 3344) at `0x6B81e00508E3C449E20255CdFb85A0541457Ea6d`.

## How Agents Express Intent: ERC-8165

Once an agent has an identity, it needs to act. [ERC-8165](https://ethereum-magicians.org/t/erc-8165-agentic-on-chain-operation-interface/27773), proposed by researchers from CSIRO in February 2026, standardizes how agents express and fulfill intents across the ecosystem.<sup>[4](#fn-4)</sup>

The pattern: agent signs an EIP-712 intent envelope specifying desired outcomes (not execution paths), a permissionless solver fulfills it, a structured receipt is emitted on settlement. The intent includes a reference to the agent's identity:

```solidity
struct Intent {
    address maker;          // principal/signer
    address inputToken;
    uint256 inputAmountMax;
    address outputToken;
    uint256 outputAmountMin; // enforced on-chain
    uint48  validAfter;
    uint48  validUntil;
    uint256 nonce;
    address agentIdentity;  // authoring agent (ERC-8004 or ERC-8181 address)
    uint256 feeBps;
    bytes32 salt;
}
```

The `IntentFulfilled` event is the settlement receipt: a structured, machine-readable record of what the agent requested, what it received, who fulfilled it, and at what cost. ERC-8183 (the agent commerce standard) explicitly recommends using ERC-8165 settlement receipts as evaluator inputs for tasks where execution can be proven deterministically. The two standards are designed to interoperate.

## The Infrastructure Layer: Agents and L2 Sequencers

[ERC-8166](https://github.com/ethereum/ERCs/pull/1550) is a narrower proposal: a standardized interface for shared sequencer contracts, designed for agent compatibility. Three requirements drive the design: gas predictability (`estimateSubmissionCost()` before committing), machine-readable error codes for retry logic, and stateless view functions for pre-flight checks.

Shared sequencers today (Espresso, Taiko, Puffer UniFi) all have proprietary interfaces. After Astria's shutdown in December 2025, there is appetite for a common standard. ERC-8166 reflects a broader trend: infrastructure authors are beginning to design for programmatic callers first, not human users.

## What the Stack Looks Like Together

As of March 2026, the emerging onchain agent identity stack has distinct layers:

| Layer | Standard | Function |
|-------|----------|----------|
| Identity | ERC-8004 (live), ERC-8181, ERC-8170, ERC-8171 | Who is the agent? |
| Memory | ERC-8181 anchors, ERC-8170 ConsciousnessSeed | What does the agent know? |
| Verification | ERC-8172 cooldown, ERC-8004 reputation | Is the agent trustworthy? |
| Action | ERC-8165 intents | What does the agent want to do? |
| Commerce | ERC-8183 job escrow | How does the agent get paid? |
| Infrastructure | ERC-8166 sequencer interface | Where does the agent execute? |

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004), the base agent registry from Davide Crapis at the Ethereum Foundation, is the only layer live on mainnet (since January 29, 2026).<sup>[9](#fn-9)</sup> The identity proposals (ERC-8181, ERC-8170, ERC-8171) are competing approaches that may converge or stay as distinct patterns for different use cases: self-sovereign agents for fully autonomous systems, AINFT reproduction semantics for AI asset markets, TBA registry binding for retrofitting existing NFT collections.

The practical guidance for teams building now: use ERC-6551 TBAs for agent wallets today, with attention to ERC-8181's self-sovereignty model as it matures. For agent commerce, ERC-8183 is the most developed proposal. And for whatever combination you choose, every state transition in these systems produces onchain events. When you are debugging why a reproduction failed, why a memory anchor was rejected, or why an intent was never fulfilled, a block explorer that decodes these contracts makes that investigation readable.

[Ethernal](https://tryethernal.com) decodes ERC-based contracts and their event streams without configuration. Connect it to your RPC, point it at your identity or commerce contract, and the full lifecycle of every agent interaction is visible. For teams building on standards still in draft, that visibility matters more, not less.

---

## References

<span id="fn-1">1.</span> [ERC-8181: Self-Sovereign Agent NFTs](https://github.com/ethereum/ERCs/pull/1579) — Lit Protocol contributors, March 2026

<span id="fn-2">2.</span> [ERC-8170: AI-Native NFT (AINFT)](https://github.com/ethereum/ERCs/pull/1558) — February 2026

<span id="fn-3">3.</span> [ERC-8171: Token Bound Account (Agent Registry)](https://github.com/ethereum/ERCs/pull/1559) — February 2026

<span id="fn-4">4.</span> [ERC-8165: Agentic Onchain Operations](https://ethereum-magicians.org/t/erc-8165-agentic-on-chain-operation-interface/27773) — CSIRO et al., February 2026

<span id="fn-5">5.</span> [ERC-8166: Shared Sequencer Interface for Agent L2s](https://github.com/ethereum/ERCs/pull/1550) — February 2026

<span id="fn-6">6.</span> [ERC-8172: Delayed Metadata Update Extension](https://github.com/ethereum/ERCs/pull/1561) — February 2026

<span id="fn-7">7.</span> [ERC-8183: Agentic Commerce Protocol](https://github.com/ethereum/ERCs/pull/1581) — February 2026

<span id="fn-8">8.</span> [ERC-6551: Non-fungible Token Bound Accounts](https://eips.ethereum.org/EIPS/eip-6551) — Jayden Windle, Benny Giang et al., 2023

<span id="fn-9">9.</span> [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) — Davide Crapis, Ethereum Foundation, 2026

<span id="fn-10">10.</span> [EIP-7702: Set Code for EOAs](https://eips.ethereum.org/EIPS/eip-7702) — Vitalik Buterin et al., 2024
