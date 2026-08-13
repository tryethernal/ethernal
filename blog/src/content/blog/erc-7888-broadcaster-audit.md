---
title: "Trustless, Except for Three Bugs: OpenZeppelin's Audit of ERC-7888's Cross-Chain Broadcaster"
description: "OpenZeppelin audited ERC-7888's storage-proof Broadcaster across six L2s and found three high-severity bugs, including one that resolved to the wrong contract."
date: 2026-08-13
tags:
  - ERC-7888
  - Cross-Chain
  - Audit
  - L2
  - Ethereum
keywords: []
image: "/blog/images/erc-7888-broadcaster-audit.png"
ogImage: "/blog/images/erc-7888-broadcaster-audit-og.png"
status: published
readingTime: 7
---

A solver fills a cross-chain intent: a user wants USDC on Base, holds ETH on Arbitrum. The solver executes the fill on Base, then needs to prove that fill happened, on Arbitrum, without a bridge or an oracle sitting in the middle. That proof mechanism is what [ERC-7888](https://eips.ethereum.org/EIPS/eip-7888)'s Broadcaster exists to provide.<sup>[1](#fn-1)</sup>

In March 2026, OpenZeppelin published an audit of the reference implementation of that exact mechanism, covering six Layer 2 chains.<sup>[2](#fn-2)</sup> It found three high-severity bugs. One of them made verification resolve to the wrong contract address entirely.

## What is ERC-7888?

ERC-7888 is a draft Ethereum standard, authored by Henry Arneson and Chris Buckland, that lets a message posted on one chain be verified as authentic on any other chain sharing a common ancestor, using storage proofs instead of a bridge.<sup>[1](#fn-1)</sup> It defines three roles:

- Broadcaster is a singleton contract per chain that stores 32-byte messages from publishers. It emits `MessageBroadcast(bytes32 indexed message, address indexed publisher)` and derives each message's storage slot from `(message, publisher)`, which prevents duplicates without any nonce bookkeeping.
- StateProver is a one-directional verifier between a home chain and a target chain. It confirms a state commitment (a block hash, state root, or batch hash), then verifies a specific storage slot inside that confirmed state. Provers are referenced by code hash rather than address, so a cached local copy can be reused safely.
- Receiver is a singleton per chain that walks a route (an ordered list of StateProver hops) until it reaches the remote Broadcaster's storage slot, then returns `(broadcasterId, timestamp)` once the proof resolves.

```solidity
interface IBroadcaster {
    event MessageBroadcast(bytes32 indexed message, address indexed publisher);
    function broadcastMessage(bytes32 message) external;
}

interface IStateProver {
    function verifyTargetStateCommitment(bytes32 homeStateCommitment, bytes calldata input)
        external view returns (bytes32 targetStateCommitment);
    function verifyStorageSlot(bytes32 targetStateCommitment, bytes calldata input)
        external view returns (address account, uint256 slot, bytes32 value);
    function version() external pure returns (uint256);
}
```

The spec picks storage proofs over canonical bridge messaging for a specific reason: gas is only spent on the sending and receiving chains, not on every chain in between, and adjacent storage slots that share a state root get implicit batching. The tradeoff, per the spec's own cost estimates, is that a storage proof can run up to roughly 2x the cost of a canonical bridge message at the upper bound, though caching StateProver copies brings real-world cost below that ceiling.<sup>[1](#fn-1)</sup> Named use cases are intent-fill settlement, multichain governance (decide once, propagate the result), and multichain oracles (post data once, read it everywhere).

## How does ERC-7888 verify a cross-chain message?

Verification walks a fixed route of provers until it resolves to a storage value at the destination Broadcaster. A `Receiver.verifyBroadcastMessage` call takes a `RemoteReadArgs` struct: an array of `StateProverPointer` addresses (the route), the proof inputs for each hop, and a final storage proof. It steps through the route, verifying one state commitment per hop, until it lands on the remote chain's `MessageBroadcast` storage slot. If the value matches, it returns `(broadcasterId, timestamp)`.

The route doesn't point directly at `StateProver` contracts. It points at `StateProverPointer` contracts, an indirection layer that holds a prover's current implementation address and code hash, upgradeable by the pointer's owner. That indirection exists so a prover can be swapped, say, after Optimism upgrades its `AnchorStateRegistry` contract, without every existing route breaking. It's also, as the audit shows, exactly where things went wrong.

## What did OpenZeppelin's ERC-7888 audit find?

OpenZeppelin's audit, conducted February 2–11, 2026 and published March 16, 2026, reviewed the Open Intents Framework's Broadcaster implementation: prover pairs (`ChildToParentProver` and `ParentToChildProver`) for Arbitrum, Optimism, Scroll, Linea, Taiko, and ZKsync, plus a diff review of `Receiver.sol`, `StateProverPointer.sol`, and `ZkSyncBroadcaster.sol`.<sup>[2](#fn-2)</sup> Out of 19 total findings, three were high severity, and all three were logic bugs that would make verification resolve incorrectly while still technically "succeeding":

| Severity | Chain / Contract | Bug |
|---|---|---|
| High | Optimism `ParentToChildProver` | Hardcodes the AnchorStateRegistry game slot to 3 (correct for contract v2.2.2), but current deployments use v3.5.0, where the slot is 2. Breaks multi-hop verification. |
| High | Linea `ChildToParentProver` | Verifies proofs using Merkle Patricia Trie / Keccak256, but Linea's actual state commitment uses a Sparse Merkle Tree with MiMC hashing. Proofs for Linea's buffer storage cannot verify at all. |
| High | ZKsync `ParentToChildProver` | Returns the publisher's address instead of the broadcaster's address, contradicting what the `Receiver` contract expects to receive. The accompanying test asserted the same wrong behavior. |
| Medium | Optimism `ChildToParentProver` | Docs claim a proof stays valid for approximately 5 minutes; the underlying `L1Block` contract actually updates every 12 seconds, which narrows the real submission window and makes proofs harder to land during congestion. |

None of these are style nits or gas-optimization notes. A hardcoded slot number, a mismatched proof scheme, and a swapped return address are the exact categories of bug that a "trustless" storage-proof system depends on getting right, since nothing else in the design checks that the slot, the scheme, or the address are correct. All three high findings and the medium finding are marked resolved, with fixes merged at commit `06a75c8`.<sup>[2](#fn-2)</sup>

This is the audit doing its job, not the standard failing. ERC-7888 is architected so that provers are separate, upgradeable, code-hash-verified components specifically so a wrong implementation can be swapped out without redesigning the protocol. The bugs were chain-specific integration errors in the reference implementation, not flaws in the Broadcaster/StateProver/Receiver model itself. But it's still a concrete demonstration that "storage proofs remove the bridge trust assumption" doesn't mean "there is nothing left to get wrong."

## The fix that closes the blind spot

One of the audit's low-severity findings was a missing event: `StateProverPointer.setImplementationAddress()` didn't emit anything when a prover implementation changed, which the report flagged as something that "delays cross-chain incident response."<sup>[2](#fn-2)</sup> Twelve days into the audit window, [PR #1553](https://github.com/ethereum/ERCs/pull/1553) landed against the ERC-7888 spec itself, adding exactly that event to `IStateProverPointer`:

```solidity
interface IStateProverPointer {
    event ImplementationAddressSet(
        uint256 indexed newVersion,
        address indexed newImplementationAddress,
        bytes32 indexed newCodeHash,
        address oldImplementationAddress
    );
    function implementationCodeHash() external view returns (bytes32);
    function implementationAddress() external view returns (address);
}
```

The PR's own description states the purpose plainly: to "facilitate relayers/operators/indexers to detect prover updates."<sup>[3](#fn-3)</sup> The original proposal only indexed `newVersion`; reviewer godzillaba asked for `newImplementationAddress` and `newCodeHash` to be indexed too, so tooling could filter directly on which implementation or code hash changed, rather than decoding every event body to find out. Author luiz-lvj agreed and merged it the same day, February 20, 2026.<sup>[3](#fn-3)</sup>

This is precisely the layer the high-severity bugs exploited: `StateProverPointer` is the indirection that makes a prover upgradeable, which means it's also the point where a bad slot, a wrong proof scheme, or a swapped address gets introduced. Without an indexed event, detecting "did this route's prover implementation just change" required scanning full event logs rather than filtering for one topic. Tooling that indexes chain state, block explorers among them, is the direct consumer of this event. Ethernal doesn't index ERC-7888 events today, but `ImplementationAddressSet` is a straightforward addition once the standard sees production routes worth watching, since it needs no state beyond the log itself.

## What this means if you're building on ERC-7888

Three things worth doing before routing production intent volume through a storage-proof interop layer:

1. **Verify each chain-specific prover independently.** The standard being sound doesn't mean every implementation is. Three of six audited chain pairs had a high-severity bug. Audit coverage on the framework doesn't automatically extend to a new prover pair you add later.
2. **Treat `StateProverPointer` upgrade events as monitoring, not a spec footnote.** `ImplementationAddressSet` is the only signal that a route's trust assumptions just changed underneath it. If you operate a relayer or solver, filter on it.
3. **Re-check proof validity windows against the real settlement layer, not the docs.** The Optimism medium finding exists because a documented 5-minute window was actually 12 seconds in practice. Confirm timing empirically per chain rather than trusting the prover's comments.

## The takeaway

The standard held up: provers are isolated, code-hash-verified, and upgradeable, so a wrong implementation is a patch, not a redesign. The audit caught three real, exploitable bugs before mainnet-scale intent volume hit them, which is the whole point of paying for one before launch rather than after an incident. The new event closes the remaining gap by making that one fragile layer observable to whatever is watching it. Storage-proof interop doesn't remove the need for verification. It just moves where verification has to happen, from a bridge operator to a prover implementation and the indexers watching it.

## FAQ

### What is a StateProverPointer in ERC-7888?

A `StateProverPointer` is an indirection contract that holds the current implementation address and code hash for a `StateProver`. Routes reference the pointer rather than the prover directly, so a prover can be upgraded, say, after a chain changes its state commitment format, without invalidating every route that uses it.

### Does ERC-7888 require a canonical bridge?

No. ERC-7888 verifies messages using storage proofs against state commitments (block hashes, state roots, or batch hashes), not by routing through a canonical bridge contract. The tradeoff is proof cost, which the spec estimates can run up to roughly 2x a canonical bridge message at the upper bound, offset by caching StateProver copies.

### What chains does the Open Intents Framework's Broadcaster support?

OpenZeppelin's March 2026 audit covered chain-specific prover pairs for Arbitrum, Optimism, Scroll, Linea, Taiko, and ZKsync. The Open Intents Framework itself, launched by the Ethereum Foundation in February 2025 alongside Hyperlane and Bootnode, has backing from more than 30 teams including Arbitrum, Optimism, Polygon, ZKsync, and Starknet.<sup>[4](#fn-4)</sup>

## References

<span id="fn-1">1.</span> Arneson, Henry and Chris Buckland. "ERC-7888: Crosschain Broadcaster." _Ethereum Improvement Proposals_, 2025-02-18. [https://eips.ethereum.org/EIPS/eip-7888](https://eips.ethereum.org/EIPS/eip-7888)

<span id="fn-2">2.</span> OpenZeppelin. "Open Intents Framework: Broadcaster Provers Audit." _OpenZeppelin_, 2026-03-16. [https://www.openzeppelin.com/news/broadcaster-provers-audit](https://www.openzeppelin.com/news/broadcaster-provers-audit)

<span id="fn-3">3.</span> luiz-lvj. "Update ERC-7888: Add event on IStateProverPointer." _GitHub / ethereum/ERCs_, PR #1553, merged 2026-02-20. [https://github.com/ethereum/ERCs/pull/1553](https://github.com/ethereum/ERCs/pull/1553)

<span id="fn-4">4.</span> "Ethereum Foundation collaborates on new framework to standardize buzzy 'intents' transactions." _The Block_, 2025-02. [https://www.theblock.co/post/342194/ethereum-foundation-collaborates-on-new-framework-to-standardize-buzzy-intents-transactions](https://www.theblock.co/post/342194/ethereum-foundation-collaborates-on-new-framework-to-standardize-buzzy-intents-transactions)
