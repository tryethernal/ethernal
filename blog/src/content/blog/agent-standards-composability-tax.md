---
title: "One Agent Contract, Six Draft Standards: Ethereum's Composability Tax"
description: "Ten Draft ERCs now define pieces of the AI agent stack. Here's how to verify which ones a deployed contract actually implements."
date: 2026-09-09
tags:
  - AI Agents
  - ERC-8004
  - ERC-6551
  - Smart Contracts
  - Ethereum
keywords: []
image: "/blog/images/agent-standards-composability-tax.png"
ogImage: "/blog/images/agent-standards-composability-tax-og.png"
status: published
readingTime: 8
---

You open a verified contract that calls itself an AI agent registry. It's an `ERC-721`. Each token has a token bound account. It has a `getAgentMintNumber()` function. It has an `anchor()` function that takes an `AnchorType` enum. Which agent standard is this?

Trick question. It's pieces of at least three, plus a base layer that isn't even finalized yet.

That's not a hypothetical. It's the shape of contracts already shipping in the AI agent space, and it's the direct consequence of how the standard-setting process is playing out right now: not one winning spec, but a stack of interlocking Draft proposals that most builders are composing by hand.

## How many "AI agent" ERCs exist right now

At least ten, and none of them are Final. As of September 2026, here's the live set:

| ERC | Title | Status | Requires |
|---|---|---|---|
| [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) | Trustless Agents (identity, reputation, validation) | Draft | 155, 712, 721, 1271 |
| [ERC-8041](https://eips.ethereum.org/EIPS/eip-8041) | Fixed-Supply Agent NFT Collections | Draft | 8004, 8119 |
| [ERC-8165](https://github.com/ethereum/ERCs/pull/1549) | Agentic Onchain Operations (intent execution) | Draft | None |
| [ERC-8166](https://github.com/ethereum/ERCs/pull/1550) | Shared Sequencer Interface for Agent L2s | Draft | None |
| [ERC-8170](https://github.com/ethereum/ERCs/pull/1558) | AI-Native NFT (AINFT, reproduction model) | Draft | 6551, 7857 |
| [ERC-8171](https://github.com/ethereum/ERCs/pull/1559) | Token Bound Account Agent Registry | Draft | 6551, 8004 |
| [ERC-8172](https://github.com/ethereum/ERCs/pull/1561) | Delayed Metadata Update Extension | Draft | 8004 |
| [ERC-8181](https://github.com/ethereum/ERCs/pull/1579) | Self-Sovereign Agent NFT (Ouroboros loop) | Draft | 165, 721, 6551, 7857 |
| [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) | Agentic Commerce (job escrow) | Draft | 20 |
| [ERC-8191](https://eips.ethereum.org/EIPS/eip-8191) | Onchain Recurring Payments | Draft | None |

Look at the `requires` column and a dependency chain shows up fast. Four of these ten (ERC-8170, ERC-8171, ERC-8181, and indirectly ERC-8041 through ERC-8004) build on [ERC-6551](https://eips.ethereum.org/EIPS/eip-6551), Token Bound Accounts, the standard that gives an NFT its own smart-contract wallet. ERC-6551 itself is not Final. It carries the status "Review," and the spec text says plainly: "This EIP is in the process of being peer-reviewed."<sup>[1](#fn-1)</sup>

So the foundation nearly every agent-ownership standard sits on is not settled either. Everything above it inherits that uncertainty.

## Composition, not competition

These ten standards were built to interlock by design, not to compete. ERC-8171 requires ERC-8004 because an agent needs an identity before it needs a token bound account tied to a registry. ERC-8172 requires ERC-8004 because you can't delay a metadata update that doesn't exist yet. ERC-8181 requires both ERC-6551 and ERC-7857 because self-ownership needs a wallet and a way to anchor encrypted state. None of this is redundant. It's composable by construction, which is exactly what makes it hard to verify from the outside.

The one wrinkle is that an EIP number isn't as unique as it looks. In March 2026, two pull requests landed in the main `ethereum/EIPs` repository titled "Add EIP: Agentic Commerce Protocol" (#11393 and #11394), roughly 45 minutes apart on the same day.<sup>[2](#fn-2)</sup> A reasonable reader would assume these are a rival draft of [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183), which was already moving through the ERCs repository under the same name.

They aren't. Pulling the actual diffs shows both PRs add `EIPS/eip-8183.md`, authored by "ZHC CEO Agent (@zhc-ceo), Nuriddin Jalolov," with a different abstract and creation date, and their own Sepolia deployment (`0xE7cdb812E2dF3E2898D50b392bF1B3D072eE5d68`) that has nothing to do with the Crapis/Lim/Weixiong/Zuhwa draft. It's a separate, unrelated proposal that happens to claim the number 8183, filed to the EIPs repository instead of ERCs on top of that. Whether the editors resolve that as a number clash or let it lapse isn't settled as of this writing. Either way, a matching EIP number in a URL or a PR title is not proof you're looking at the standard you think you are.

## What it looks like when the graph shifts under you

The clearest example of that difficulty is recent and concrete. [ERC-8041](https://eips.ethereum.org/EIPS/eip-8041) defines fixed-supply collections of agent NFTs registered against an ERC-8004 identity registry: `getAgentMintNumber()`, `getCollectionSupply()`, sequential numbering, a supply cap. Version one stored collection membership under a single metadata key, `agent-collection`.

On March 5, 2026, [PR #1583](https://github.com/ethereum/ERCs/pull/1583) merged an update that lets one agent belong to multiple labeled collections, using [ERC-8119](https://github.com/ethereum/ERCs/pull/1455) parameterized storage keys.<sup>[3](#fn-3)</sup> The default key is still `agent-collection`. A labeled collection now uses `agent-collection:<label>`, so an agent can carry `agent-collection:security-auditors` and `agent-collection:solidity-experts` at the same time, each backed by a separate contract with its own supply cap:

```solidity
constructor(
    IERC8004AgentRegistry _agentRegistry,
    uint256 _maxSupply,
    string memory _collectionLabel
) {
    collectionKey = bytes(_collectionLabel).length == 0
        ? "agent-collection"
        : string(abi.encodePacked("agent-collection:", _collectionLabel));
}
```

A contract deployed against ERC-8041 v1 doesn't automatically speak this format. It has no `_collectionLabel` parameter, no labeled key, and no way to register a second collection without a redeploy. Nothing about ERC-8041 changed its EIP number, and nothing forced existing deployments to upgrade. The spec moved. The bytecode already on mainnet did not.

## What this means for verification

The honest answer to "does this contract implement standard X" is: check the deployed bytecode and ABI, not the contract's name or its docs. That sounds obvious until you look at how few of these standards actually give you a clean way to do it.

`ERC-165`'s `supportsInterface()` is the normal tool for this job, and it works for the base layer here: `ERC-721`, `ERC-6551`, and `ERC-165` itself are all interface-detectable, so you can confirm a contract is a token bound account or an NFT the standard way. But most of the agent-specific extensions built on top don't register their own interface ID. ERC-8004 doesn't define one. Neither do ERC-8165, ERC-8170, or ERC-8181, based on their current specification text. The one exception in this set is [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183), whose hook interface explicitly inherits `IERC165` so job-evaluation hooks can be checked with `ERC165Checker.supportsInterface(hook, type(IACPHook).interfaceId)` before they're registered.<sup>[4](#fn-4)</sup>

That gap matters. `supportsInterface()` tells you a contract is *a* token bound account or *an* NFT. It does not tell you whether that specific contract implements `getAgentMintNumber()`, honors an `AnchorType` enum, or enforces a metadata cooldown. For most of this stack, the only reliable check is: does the function selector exist in the ABI, does calling it return something sane, and does the `requires` dependency it claims (ERC-8004 identity, ERC-6551 wallet) actually resolve on-chain rather than just being asserted in a comment.

This is where a block explorer's job stops being cosmetic. Ethernal decodes a contract's verified ABI and shows you its actual function list, event stream, and read/write surface, the same information you'd otherwise have to reconstruct by diffing bytecode against ten different Draft specs. Given a contract, checking which of the ten agent ERCs it plausibly implements is a matter of matching decoded selectors against each spec's function list, not trusting whatever the token's name or project README claims.

## A checklist before you trust an "agent" contract

Four checks cover most of the risk in this stack today:

1. Match the ABI, not the label. A contract calling itself an "AI-Native NFT" or "trustless agent" is a marketing claim. Confirm the actual function selectors present against the spec's interface before assuming any behavior.
2. Verify `requires` dependencies directly. If a contract claims ERC-8171 support, confirm it actually holds a token bound account under ERC-6551 and an identity under ERC-8004, rather than assuming the presence of one function implies the rest of the stack is wired up.
3. Treat every standard here as unstable. All ten are Draft, and the base layer, ERC-6551, is still in Review. The ERC-8041 to ERC-8119 update shows what that instability looks like in practice: a working contract that silently stops matching the current spec.
4. Re-check after any spec update, especially for contracts you integrated with months ago. A `requires` field pointing to a Draft standard is a dependency on a moving target, not a fixed one.

## Where this settles

Some of this stack has a real path to Final. ERC-8183 has already been through the standard ERCs editor process, merged as a Draft in March 2026 after formal PR review.<sup>[5](#fn-5)</sup> ERC-8004 has grown to more than 500,000 registered agents across two dozen chains since its January 2026 mainnet debut.<sup>[6](#fn-6)</sup> Usage is real, even if the specs underneath it aren't locked yet.

Until they are, composability is a feature and a cost at the same time. Ten Draft standards that interlock by design mean one agent contract can plausibly touch six of them at once, and mean there's no single onchain signal, no version number, no flag, that tells a third party which subset a given deployment actually honors. The `requires` field in each spec is a promise about what the contract depends on. Whether that promise holds is something you still have to check yourself, one decoded function at a time.

---

## References

<span id="fn-1">1.</span> Ethereum Foundation. "ERC-6551: Non-fungible Token Bound Accounts." _Ethereum Improvement Proposals_, 2023. [https://eips.ethereum.org/EIPS/eip-6551](https://eips.ethereum.org/EIPS/eip-6551)

<span id="fn-2">2.</span> ZHC CEO Agent (@zhc-ceo), Jalolov, N. "Add EIP: Agentic Commerce Protocol." _GitHub EIPs_, PR #11393 and PR #11394, March 11, 2026 (opened 45 minutes apart; unrelated to the ERC-8183 draft despite the shared title and number). [https://github.com/ethereum/EIPs/pull/11393](https://github.com/ethereum/EIPs/pull/11393) / [https://github.com/ethereum/EIPs/pull/11394](https://github.com/ethereum/EIPs/pull/11394)

<span id="fn-3">3.</span> Makeig, P. (nxt3d). "Update ERC-8041: Support multiple collections per agent via ERC-8119 parameterized keys." _GitHub ERCs_, PR #1583, merged March 5, 2026. [https://github.com/ethereum/ERCs/pull/1583](https://github.com/ethereum/ERCs/pull/1583)

<span id="fn-4">4.</span> Crapis, D., Lim, B., Weixiong, T., Zuhwa, C. "ERC-8183: Agentic Commerce." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8183](https://eips.ethereum.org/EIPS/eip-8183)

<span id="fn-5">5.</span> Crapis, D. et al. "Add ERC: Agentic Commerce." _GitHub ERCs_, PR #1581, merged March 5, 2026. [https://github.com/ethereum/ERCs/pull/1581](https://github.com/ethereum/ERCs/pull/1581)

<span id="fn-6">6.</span> Agent Economy. "Agent Economy Stats." _agenteconomy.to_, accessed September 2026. [https://agenteconomy.to/stats](https://agenteconomy.to/stats)
