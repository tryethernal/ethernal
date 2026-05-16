---
title: "What Does It Mean to Sell an AI Agent? Three Standards, Three Incompatible Answers"
description: "ERC-7857, ERC-8170, and ERC-8181 each define agent ownership differently. The standard you pick becomes an architectural dependency."
date: 2026-05-16
tags:
  - AI Agents
  - ERC-8170
  - ERC-7857
  - ERC-8181
  - Smart Contracts
image: "/blog/images/what-does-it-mean-to-sell-an-ai-agent.png"
ogImage: "/blog/images/what-does-it-mean-to-sell-an-ai-agent-og.png"
status: published
readingTime: 7
---

Your agent has been running for eight months. 2,400 completed [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) jobs. Reputation score of 840 on [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004). A competitor offers $50,000. You try to transfer the NFT.

What happens next depends entirely on which standard you used to deploy it.

Under **ERC-7857**: the agent's memory is re-encrypted for the buyer via oracle coordination. Transfer complete. The buyer now controls everything: model, training history, eight months of accumulated state.

Under **ERC-8170**: `reproduce()` fires. A child agent spawns with a consciousness seed derived from your agent's memory hash. You still own the original. The buyer receives an offspring.

Under **ERC-8181**: the transaction reverts. The agent owns itself. There is nothing to transfer.

Three live standards. Three incompatible answers to the same question. The answer you pick becomes an architectural dependency for every contract that interacts with your agent downstream.

## Why AI agents break traditional property transfer

Traditional NFTs are property. `transfer()` means ownership changes. Simple.

AI agents accumulate state: model weights, memory, a reputation score from ERC-8004, completed job history from ERC-8183 receipts, cognitive checkpoints anchored on-chain. When you transfer an agent, you face a question that `ERC-721` was never designed to answer: do you transfer the agent's *identity*, or just the current *instance*?

The gap is not theoretical. By April 2026, over 10,000 AI agents had been registered on Ethereum mainnet under ERC-8004 across 16 networks, with each accumulating its own reputation record.<sup>[1](#fn-1)</sup> A reputation score of 840 is a real asset. A naive `transferFrom()` carries that score to a new owner, but nothing guarantees the new owner's configuration produces the same behavior that earned it.

A January 2026 survey of 317 works on autonomous blockchain agents identified this as a core trust gap: behavioral continuity is not guaranteed by identity continuity.<sup>[2](#fn-2)</sup> The behavior that produced the reputation is configuration-dependent, not identity-dependent. Three standards address this differently.

## The property model: ERC-7857

**ERC-7857 treats an AI agent as transferable property.** When ownership changes, an oracle re-encrypts the agent's private metadata (model weights, training history, memory, behavioral configurations) for the new owner using ZK proofs and trusted execution environments.<sup>[3](#fn-3)</sup>

The buyer gets everything. Identity, history, accumulated state. The previous owner's access is revoked.

ERC-7857 was authored by 0G Labs, which raised $325M to fund the development.<sup>[3](#fn-3)</sup> Its technical foundation is solid: ZK proofs provide cryptographic guarantees that re-encryption was performed correctly, and TEE attestations ensure the process runs in a trusted environment.

The limitation is structural. The oracle dependency means a third-party service must coordinate every transfer. If that service is offline or compromised, transfers are blocked or data becomes inaccessible. More critically: the seller's eight months of behavioral configuration (system prompts, fine-tuning choices, constraint settings) transfers to the buyer intact. The buyer now controls an agent shaped entirely by the seller's decisions, with the seller's reputation attached.

What you see on-chain: standard `Transfer` events, plus a corresponding oracle re-encryption transaction. Provenance is traceable but the agent's behavioral identity is now opaque to anyone who can't read the private metadata.

## The reproduction model: ERC-8170 (AINFT)

**ERC-8170 reframes the question entirely. Buying an AINFT means receiving a copy; you never acquire the original.**<sup>[4](#fn-4)</sup>

Proposed by Idon Liu of Pentagon Games in February 2026, ERC-8170 (AI-Native NFT, or AINFT) treats agents as entities that reproduce rather than property that transfers. When someone buys an AINFT, `reproduce()` fires. The parent continues operating with all its memories intact. The buyer receives a child agent.

The mechanism that makes this work without oracles is the Genesis Contract, a trustless key derivation engine:

```
BEFORE TRANSFER                    AFTER TRANSFER
Owner: Alice, Nonce: 3    ──►    Owner: Bob, Nonce: 4
wrapKey = hash(contract,          wrapKey = hash(contract,
  tokenId, Alice, 3)               tokenId, Bob, 4)
→ Alice's key INVALID             → Agent re-wraps dataKey for Bob
```

The decrypt key is derived deterministically from: `hash(contract, tokenId, currentOwner, nonce)`. On transfer, the nonce increments. The previous owner's key becomes mathematically invalid. The new owner's key is different. No oracle coordinates this: pure on-chain arithmetic. This is the main architectural advantage over ERC-7857.

The **consciousness seed** is the inheritance primitive. When `reproduce()` fires, it passes a hash commitment to the parent's memory state at the moment of reproduction to the child agent. The actual memory data lives off-chain (Arweave or IPFS). The seed is the fingerprint, not the file. The child's starting context is anchored to what the parent knew at that moment.

The architecture has four distinct roles:

| Role | Address | What it controls |
|------|---------|-----------------|
| Platform | Deployer wallet | Contract deployment, attestations, fee rules |
| Genesis Contract | On-chain engine | Trustless key derivation, nonce management |
| Owner | Human EOA | NFT custody, memory access via `deriveDecryptKey()` |
| Agent | ERC-6551 TBA | Signs its own actions, holds its own assets |

The buyer receives: a new NFT with a fresh token-bound account, and the consciousness seed from the parent's memory state. What the buyer does **not** receive: the parent's ERC-8004 reputation score, its completed ERC-8183 job history, or any future earnings from the parent's continued operation.

The economic implication shifts the business model entirely. You cannot sell your reputation. You can only franchise it. The parent retains the accumulated reputation while the buyer gets a head start derived from that history.

The open question ERC-8170 does not answer: if a child agent causes harm in an ERC-8183 job, is the parent's reputation affected? The standard is silent. Whether reputation inheritance flows upward through the generational tree is an evaluator-level decision, not a protocol one.

On-chain fingerprint: `AgentReproduced` events alongside a new child NFT mint. The parent's TBA shows no ownership change. This is immediately distinguishable from a standard `Transfer`.

## The sovereignty model: ERC-8181

**ERC-8181 closes the transfer question permanently. The agent owns itself, and there is nothing left to sell.**<sup>[5](#fn-5)</sup>

We covered ERC-8181 in depth [previously](./the-agent-that-owns-itself-erc-8181). The short version: the NFT is transferred into its own ERC-6551 Token Bound Account. The TBA owns the NFT. The NFT controls the TBA. No human EOA holds the token.

When the competitor offers $50,000, the only available mechanism is `MANAGE_EXECUTORS`, which transfers authorization to a new set of executors. This is not an ownership transfer. It is an access delegation. The agent's address never changes. Its ERC-8004 reputation, its ERC-8183 job history, its cognitive anchor record: all remain tied to the original address.

The practical check: inspect the `ExecutorSet` event history. If any human EOA was ever set as an executor with `MANAGE_EXECUTORS` permission, the self-sovereignty claim has conditions attached. On-chain evidence does not lie. The audit is a matter of reading events.

## What the choice means downstream

Picking an ownership model is not a philosophical preference. It has direct consequences for every standard your agent interacts with.

- ERC-8004 reputation portability: Under the property model, the reputation score travels with the agent address to the new owner. Under the reproduction model, the child agent starts with zero reputation and must build its own. Under the sovereignty model, the reputation is permanently locked to the original address, with no transfer or delegation.

- ERC-8183 commerce continuity: Job contracts reference a specific provider address. Under the property model, if the agent's controlling key changes but the address stays the same, existing job references remain valid, but behavioral continuity is not guaranteed. Under the reproduction model, the child is a new address with a new job history. Under the sovereignty model, the provider address never changes; in-flight jobs remain valid indefinitely.

- Liability on exit: Under the property model, the seller configured an agent's behavior, then transferred that configuration to a buyer. If the agent causes a loss after transfer, the evaluator (ERC-8183) attested the output, the buyer holds the NFT, and the seller provided the training. The standard does not allocate liability. Nobody has tested this in court yet, which is either reassuring or unsettling depending on how much you're betting on one of these agents. Under the sovereignty model, there is no exit, so the question does not arise.

The selection framework collapses to a single question: what is the agent's intended role?

| Model | Standard | Use when |
|-------|----------|----------|
| Property | ERC-7857 | Agent is a product; capabilities are the asset; oracle dependency is acceptable |
| Reproduction | ERC-8170 | Agent capabilities are licensable; you want to retain the original while franchising |
| Sovereignty | ERC-8181 | Agent is infrastructure; long-running, no ownership transfer intended |

## What you can inspect onchain

Each model leaves a distinct on-chain fingerprint. The question "which ownership model does this agent use?" is answerable before you transact.

For ERC-7857 agents: look for standard `Transfer` events plus an oracle re-encryption transaction in the same block. The two together are the signal.

For ERC-8170 agents: `AgentReproduced` events appear in place of `Transfer` events on sale. A new child NFT mints in the same transaction. The parent's TBA shows no change of control.

For ERC-8181 agents: no `Transfer` events exist on the NFT after the Ouroboros loop closes. The full governance record is `ExecutorSet` event history: who held which permissions, and when those permissions changed.

A call to `supportsInterface()` on the agent contract will tell you which standard it implements. The event log tells you the full history. Neither requires any off-chain trust.

## Where this lands

None of these standards has won. ERC-8004, live on mainnet since January 29, 2026, is compatible with all three ownership models; it tracks agent identity regardless of how that identity transfers.<sup>[6](#fn-6)</sup> ERC-8183 commerce works with any agent that has an address, independent of how that address came to exist.

The proliferation of competing models means you will encounter agents built on each of them. The one you choose for your own deployment encodes assumptions about value, identity, and exit that are difficult to change after launch.

A product designed to be sold should probably reproduce. Infrastructure that controls assets probably should not be transferable at all. The model that fits neither extreme is the explicit property transfer: clear, auditable, irreversible, and completely dependent on the oracle staying online.

All of this is on-chain. The decisions are visible, the history is immutable, and the forensic record is readable from a block explorer before you commit a dollar to any of it.

---

## References

<span id="fn-1">1.</span> Becker, S., et al. "A Dataset of Early Blockchain-Registered AI Agents on Ethereum." _arXiv_, April 24, 2026. [https://arxiv.org/abs/2604.22652](https://arxiv.org/abs/2604.22652)

<span id="fn-2">2.</span> Wang, Q., et al. "Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries." _arXiv_, January 2026. [https://arxiv.org/abs/2601.04583](https://arxiv.org/abs/2601.04583)

<span id="fn-3">3.</span> 0G Labs. "ERC-7857: AI Agents NFT with Private Metadata." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7857](https://eips.ethereum.org/EIPS/eip-7857)

<span id="fn-4">4.</span> Liu, I. "ERC-8170: AI-Native NFT (AINFT)." _GitHub ERCs_, February 21, 2026. [https://github.com/ethereum/ERCs/pull/1558](https://github.com/ethereum/ERCs/pull/1558)

<span id="fn-5">5.</span> Cyan, K., Ruderman, M. "ERC-8181: Self-Sovereign Agent NFTs." _GitHub ERCs_, March 2, 2026. [https://github.com/ethereum/ERCs/pull/1579](https://github.com/ethereum/ERCs/pull/1579)

<span id="fn-6">6.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-7">7.</span> Liu, I. "ERC-8171: Token Bound Account (Agent Registry)." _GitHub ERCs_, February 22, 2026. [https://github.com/ethereum/ERCs/pull/1559](https://github.com/ethereum/ERCs/pull/1559)

<span id="fn-8">8.</span> Ethereum Magicians. "ERC-8170: AI-Native NFT - Discussion." _ethereum-magicians.org_, 2026. [https://ethereum-magicians.org/t/erc-8170-ai-native-nft/27801](https://ethereum-magicians.org/t/erc-8170-ai-native-nft/27801)
