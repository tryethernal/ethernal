---
title: "Four Slots, Sixteen Chunks: Inside EIP-7864 and the New Cost of Contract Storage Layout"
description: "EIP-7864 replaces Ethereum's state trie with a unified binary tree that colocates a handful of storage slots with the account header. Here's what that changes."
date: 2026-03-27
tags:
  - EIP-7864
  - Ethereum
  - State Trie
  - Gas
  - DeFi
  - L2
keywords: []
image: "/blog/images/eip-7864-unified-binary-tree-storage-layout.png"
ogImage: "/blog/images/eip-7864-unified-binary-tree-storage-layout-og.png"
status: published
readingTime: 8
---

[EIP-7864](https://eips.ethereum.org/EIPS/eip-7864), authored by Vitalik Buterin, Guillaume Ballet, Dankrad Feist, and seven other core contributors, replaces Ethereum's hexary trie with a single unified binary tree.<sup>[1](#fn-1)</sup> Buried in the spec is a mechanism that gives a small, fixed number of low-numbered storage slots and bytecode chunks a shorter, cheaper Merkle proof than everything else an account owns. That's a new incentive for how you order your Solidity state variables, and it collides directly with an existing storage convention that does the opposite on purpose.

Take a lending protocol that inherits from three OpenZeppelin base contracts before it declares its own state. `Ownable` takes slot 0. `Pausable` takes slot 1. A reentrancy guard takes slot 2. By the time the protocol's own `totalBorrow` and `totalSupply` variables get declared, they land in slots 6 and 7. Under today's Merkle Patricia Trie, that's a cosmetic detail. Every storage slot costs the same to prove, regardless of its number. Under EIP-7864, it stops being cosmetic.

## What does EIP-7864 actually change?

EIP-7864 merges Ethereum's account trie, per-account storage tries, and code storage into one binary Merkle tree. Today, an account's balance and nonce live in the main trie, while its storage lives in a separate trie referenced by a `storageRoot` hash. That nesting, combined with RLP encoding and Keccak hashing at every branch, is expensive to prove inside a SNARK circuit. Vitalik Buterin has said the state tree and the EVM together account for more than 80% of the bottleneck in efficient proving, and EIP-7864 targets the tree half of that.<sup>[2](#fn-2)</sup> The EIP's own motivation section puts the goal plainly: "Ethereum's long-term goal is to allow blocks to be proved with validity proof so that chain verification is as simple and fast as possible."<sup>[1](#fn-1)</sup>

The new tree has four node types: `InternalNode` (a left and right child hash), `StemNode` (up to 256 leaves grouped under a 31-byte stem), `LeafNode` (a 32-byte value), and `EmptyNode`. Every key in the tree is built the same way: one byte for storage type, 31 bytes for the stem, one byte for the subindex within that stem. Three storage types exist: `HEADER_SUBTREE = 0` for account fields, `CODE_SUBTREE = 1` for bytecode, and `STORAGE_SUBTREE = 255` for everything else in storage.<sup>[1](#fn-1)</sup>

Merkleization is deliberately simple compared to the current trie: an internal node hashes its two children together, a stem node hashes its stem plus its children's combined hash, and a leaf node hashes its own value. Going from hexary to binary branching alone shortens worst-case proof paths by roughly 4x, according to Buterin's own estimates.<sup>[2](#fn-2)</sup>

The hash function itself isn't settled. The reference implementation uses BLAKE3 today, but the EIP text is explicit that this is not a final decision.<sup>[1](#fn-1)</sup> Keccak is already used everywhere on Ethereum but is expensive inside a circuit. Poseidon2 offers the best in-circuit performance and, per Buterin's estimates, could push the proving improvement toward 100x if it clears the Ethereum Foundation's ongoing security review. This is live, unresolved engineering a year into the draft: [PR #11389](https://github.com/ethereum/EIPs/pull/11389), opened March 9, 2026 and discussed at Stateless Implementers Call #49, is still fixing byte-level inconsistencies in how tree-index offsets get encoded.<sup>[3](#fn-3)</sup>

## The colocation primitive: four slots, sixteen chunks

Here's the part that matters for anyone writing Solidity. An account's header fields (version, code size, nonce, balance) live in a fixed leaf under the account's own stem. The EIP also reserves room in that same stem for a small number of the account's own storage slots and bytecode chunks, so they sit one proof step away instead of requiring a separate subtree traversal.

The exact constants, straight from the EIP's parameter table: `STORAGE_CHUNKS_IN_HEADER = 4` and `CODE_CHUNKS_IN_HEADER = 16`.<sup>[1](#fn-1)</sup> Storage slots 0 through 3 and code chunks 0 through 15 of every account are colocated with that account's header. Everything past those thresholds maps into additional stems, 256 keys per stem, using this derivation:

```python
# For storage_key >= STORAGE_CHUNKS_IN_HEADER
high = (storage_key - STORAGE_CHUNKS_IN_HEADER) // 256
low = (storage_key - STORAGE_CHUNKS_IN_HEADER) % 256
tree_key = get_tree_key(
    STORAGE_SUBTREE,
    hash(address) + hash(address + int_to_bytes(high)),
    low
)
```

Code chunks beyond the first 16 follow the identical pattern under `CODE_SUBTREE`. Every group of 256 slots or chunks beyond the header gets its own stem, reachable only by first resolving that stem's hash. Slot 3 is one hop from the account. Slot 260 is two.

The EIP's own gas-cost estimate puts a number on the practical effect: dApps whose hot-path storage access stays inside the colocated range can save more than 10,000 gas per transaction compared to touching slots that require a separate stem lookup.<sup>[2](#fn-2)</sup>

## What this means for DeFi storage layout

The takeaway: inheritance order now carries a permanent gas cost, and nothing in the source code flags it. Back to the lending protocol from the opening. Its actual layout, inherited slots included, looks like this:

```solidity
contract LendingPool is Ownable, Pausable, ReentrancyGuard {
    // slot 0: Ownable._owner
    // slot 1: Pausable._paused
    // slot 2: ReentrancyGuard._status
    uint256 public totalBorrow;   // slot 3
    uint256 public totalSupply;   // slot 4
    mapping(address => uint256) public borrows; // slot 5
    mapping(address => uint256) public supplies; // slot 6
}
```

`totalBorrow` at slot 3 just barely makes the colocated range. `totalSupply` at slot 4 doesn't. Move `ReentrancyGuard` to the end of the inheritance list, or add one more base contract, and both hot variables fall outside it. Every read or write to `totalSupply` then costs an extra stem resolution that `totalBorrow` doesn't pay. Under the current trie, this ordering is invisible. Under EIP-7864, it's a measurable, permanent cost difference baked into where a variable happened to land during compilation. There's something a little absurd about that: a protocol's most-accessed number ending up one slot too expensive because of the order someone typed `is Ownable, Pausable, ReentrancyGuard` two years ago.

That creates a real design tension with [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967), the standard that governs where upgradeable proxies store their implementation address:

```solidity
bytes32 constant IMPLEMENTATION_SLOT =
    bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
// 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
```

ERC-1967 deliberately picks a pseudorandom, astronomically high slot number specifically so the Solidity compiler's own sequential slot allocation can never collide with it. That design goal, avoid the low numbers, is now in direct tension with EIP-7864's incentive to keep hot state in the low numbers. Proxy implementation slots were never candidates for colocation and never will be, and that's fine: they're read once per call, not the hot path. Still, it's a clean little irony: two standards, written years apart by different people solving different problems, ended up pulling storage layout in opposite directions, and both of them were right to.

The practical guidance for anyone writing new contracts today: know which of your own state variables are touched on every hot-path call, and order your inheritance and declarations so those variables land in slots 0 through 3. It costs nothing now and pays off the moment binary-tree state ships.

## Why L2 and ZK teams care about the same number

The colocation primitive is a gas-cost story for application developers. For teams building rollups, provers, or stateless clients, EIP-7864 is a proving-cost story, and it's the bigger half of it. Buterin's 80%-of-the-bottleneck framing wasn't rhetorical: proving storage reads against the current hexary trie is expensive, and the EIP's own motivation section works out a worst-case block scenario, a full 30M-gas block spent reading single bytes from different, unchunked account codes, that requires roughly 330MB of proof material.<sup>[1](#fn-1)</sup> A unified binary tree with a fixed 4x reduction in branch length from hexary-to-binary alone, stacked with whatever the eventual hash function delivers, changes the input to every proving cost model that assumes today's trie shape. Teams sizing prover hardware, calldata budgets, or L2 fee schedules against current state-proof sizes are sizing against numbers that this EIP is explicitly trying to shrink.

## What breaks, and when

EIP-7864 is a Draft with no mainnet activation date. The old MPT isn't deleted at the fork boundary, it's frozen. A separate proposal, [EIP-7748](https://eips.ethereum.org/EIPS/eip-7748), specifies migrating existing state into the new tree structure over time rather than all at once.<sup>[4](#fn-4)</sup> The practical consequence: any tooling that generates or verifies Merkle proofs against the current trie shape, hexary nibble paths, RLP-encoded proof nodes, needs to know which tree shape it's proving against once migration starts. Historical state proofs built against the old MPT stop validating once the underlying state has moved. Code-chunk access gas costs may also need adjustment post-migration; the EIP flags this as an open economic question, not a solved one.

## Where block explorers fit

Storage tabs, trace viewers, and "prove this balance" features in block explorer tooling are built today against MPT assumptions: hexary paths, RLP-encoded proof nodes, a separate storage trie per account. None of that survives a move to a unified binary tree unchanged. This isn't urgent while the EIP is a Draft with no fork date, but it's worth flagging for anyone building or operating explorer infrastructure now, so the rework lands as a planned migration rather than a surprise when a testnet activates the new tree shape.

## The takeaway

EIP-7864 is still a Draft, the hash function is unresolved, and there's no fork scheduled. None of that changes the fact that four storage slots and sixteen code chunks per account are getting a permanent, structural discount on proof size, and everything else isn't. I'd rather see this decided a year early than patched in after mainnet contracts have already ossified around the wrong slot numbers. If you're deploying contracts today that you expect to still be running when this ships, slot ordering has quietly stopped being an aesthetic choice.

## References

<span id="fn-1">1.</span> Buterin, V., Ballet, G., Feist, D., et al. "EIP-7864: Ethereum State Using a Unified Binary Tree." _Ethereum Improvement Proposals_, 2025-01-20. [https://eips.ethereum.org/EIPS/eip-7864](https://eips.ethereum.org/EIPS/eip-7864)

<span id="fn-2">2.</span> "Vitalik Buterin targets 80% proving costs with EIP-7864 shift." _crypto.news_. [https://crypto.news/vitalik-buterin-targets-80-proving-costs-with-eip-7864-shift/](https://crypto.news/vitalik-buterin-targets-80-proving-costs-with-eip-7864-shift/)

<span id="fn-3">3.</span> "Update EIP-7864: encode offset as big endian." _GitHub, ethereum/EIPs PR #11389_, 2026-03-09. [https://github.com/ethereum/EIPs/pull/11389](https://github.com/ethereum/EIPs/pull/11389)

<span id="fn-4">4.</span> "EIP-7748: State conversion to Verkle Tree." _Ethereum Improvement Proposals_. [https://eips.ethereum.org/EIPS/eip-7748](https://eips.ethereum.org/EIPS/eip-7748)
