---
title: "The Mempool Rule That Blocked Privacy Pools: How EIP-8272 Works Around It"
description: "EIP-8272 lets frame transactions declare Merkle root dependencies at the protocol level, solving the storage read prohibition that blocked native privacy..."
date: 2026-07-24
tags:
  - Privacy
  - EIP
  - Protocol
  - Ethereum
  - Account Abstraction
keywords: []
image: "/blog/images/eip-8272-privacy-pools-mempool-recent-roots.png"
ogImage: "/blog/images/eip-8272-privacy-pools-mempool-recent-roots-og.png"
status: published
readingTime: 7
---

You're building a privacy pool on Ethereum. A user wants to withdraw: they construct a ZK proof that they own a commitment in the Merkle tree and that commitment has never been spent. The proof checks against a specific Merkle root, the root that was valid when the proof was generated.

You try to submit this as a frame transaction. Frame validation cannot read the privacy pool's storage. That's an arbitrary external state read, and EIP-8141 prohibits it during the validation prefix. The ZK proof is mathematically valid. The Merkle root exists in your contract. The withdrawal cannot enter the mempool.

This is not a bug in your privacy protocol. The mempool safety rule is working exactly as designed. EIP-8272, proposed by Thomas Thiery, Vitalik Buterin, and Toni Wahrstatter in May 2026, is the protocol-level fix for this precise collision.<sup>[1](#fn-1)</sup>

## Why EIP-8141 prohibits external storage reads during validation

[Frame transactions](/blog/eip-8141-frame-transactions-eoa-abstraction) process in two phases: a validation prefix where the payer is identified and payment capability confirmed, then execution. EIP-8141's rule is that validation can only read the sender's own storage, not arbitrary external accounts.<sup>[2](#fn-2)</sup>

The reason is mempool stability. If validation reads another account's storage, any state change to that account can immediately invalidate pending transactions that depend on it. One malicious update to a heavily-referenced contract could evict thousands of pending transactions from every node's mempool simultaneously. The design goal is that a transaction's validity depends only on the sender's own state, making invalid transactions cheap to detect and evict independently.

The 100,000 gas `MAX_VERIFY_GAS` cap serves the same goal. Validation must be bounded and cheap so nodes can admit and evict transactions without performing unbounded EVM simulation. Banned opcodes during validation (`TIMESTAMP`, `GASPRICE`, and state-modifying ops outside deployment) all exist to keep validation deterministic given only the sender's initial state.

A privacy pool withdrawal fails this constraint directly. The ZK proof verifies membership in a Merkle tree. That tree's root lives in the pool contract's storage. Reading it during validation is exactly the kind of arbitrary external state read the rule prohibits. The constraint exists for good reasons. The privacy pool is just caught by it.

## What a privacy application actually needs

The standard mental model for privacy pool withdrawals says the proof must check against "the current Merkle root." That framing makes the mempool problem look unsolvable.

The actual requirement is weaker. A commitment Merkle tree only grows, it never removes leaves. A proof of membership at any historical root is still valid, because the commitment that was present then is still present now. The proof doesn't need the live root. It needs any valid historical root that was active when the proof was generated.

This is worth sitting with for a moment. The privacy guarantee doesn't require the freshest root. It requires a root where your commitment existed. Any sufficiently recent historical root works fine.

EIP-8272 builds on this. If the protocol can provide verified access to a bounded set of recent historical roots, without reading live application storage, the ZK proof can reference one of those committed historical roots instead of the current one. The proof remains valid. The mempool constraint is satisfied.

The window EIP-8272 provides is 8,192 slots, roughly 27 hours at 12 seconds per slot. For a user generating a withdrawal proof and submitting it within a day, any root from the past 8,191 slots works. That's a wide enough window for practical use.

## How EIP-8272 solves it

EIP-8272 introduces a system contract called `RECENT_ROOT_ADDRESS`, deployed at fork activation. Applications write roots to it every slot they want to publish:

```
RECENT_ROOT_ADDRESS.call(abi.encode(salt, root))
```

The contract stores an entry at a key derived from the application's `source_id` and the current slot number, using a circular buffer of length 8,192:

```
source_id    = keccak256(source_address || salt)

storage_key  = keccak256(RECENT_ROOT_STORAGE_DOMAIN || source_id || uint64_be(slot mod 8192))

entry_hash   = keccak256(RECENT_ROOT_ENTRY_DOMAIN || source_id || uint64_be(slot) || root)
```

The `source_id` construction uses a 20-byte source address concatenated with a 32-byte salt, producing a 52-byte preimage. This lets one application publish roots from different pool versions or different tree types using different salts, all from the same address.

The spend transaction carries these references in its signed envelope:

```
recent_root_references: [
  (source_id_1, slot_1, root_1),
  (source_id_2, slot_2, root_2),
  ...
]
```

Up to 16 references per transaction. Each is a signed commitment to a specific application's root at a specific historical slot.

When a node validates the transaction, it performs one deterministic storage lookup per reference in `RECENT_ROOT_ADDRESS`: check that the stored `entry_hash` matches `keccak256(domain || source_id || slot || root)`. If it matches, the reference is valid. No reading the application's own contract. No traversing the Merkle tree. One fixed-location lookup per reference, against state that cannot be changed by the application between mempool admission and execution.

The validity window is enforced as: `1 <= current_slot - slot <= 8191`. The reference must be from the past (the current slot might not be written yet) and within the circular buffer's range.

Two new opcodes let the validation code itself inspect these references during a VERIFY frame:

- `TXPARAM(0x0F)` returns the count of references in the transaction
- `RECENTROOTREFLOAD(index, field)` retrieves `source_id`, `slot`, or `root` by reference index

Inside a VERIFY frame, the privacy pool's verifier contract can use these opcodes to confirm: the ZK proof was generated against root `R` at slot `S`, and the transaction has declared that reference. The chain of trust runs from the signed transaction envelope through the system contract's pre-committed entries, without any live storage reads.

## What this unlocks

EIP-8272 makes privacy withdrawals viable as first-class frame transactions, without relayers.

Nero_eth's April 2026 post on ethresear.ch identified three gates every privacy withdrawal must pass: admission to the public mempool, enforcement by the FOCIL inclusion list committee, and validation by the nodes that relay the transaction.<sup>[3](#fn-3)</sup> Under EIP-8141 alone, privacy withdrawals failed the first gate because Groth16 pairing checks require more than `MAX_VERIFY_GAS`, and they required reading external storage.

EIP-8272 removes the storage read constraint from that first gate. Validation reads only pre-committed entries from `RECENT_ROOT_ADDRESS`, which is deterministic and cheap. The heavy ZK verification happens in execution, not validation, where there are no storage access restrictions.

The [FOCIL](/blog/eip-7805-focil-ethereum-censorship-resistance) gate also clears. Since mempool nodes can fully validate the frame transaction, FOCIL inclusion list committee members can enforce inclusion of privacy withdrawal transactions. Censorship resistance extends to privacy transactions.

The no-relayer property matters for privacy. A traditional privacy pool withdrawal required a relayer to pay gas on the user's behalf, because the withdrawing address had no funds. With frame transactions, a separate fee-paying frame can sponsor the transaction through the normal SENDER frame model. The withdrawal self-funds without a trusted third party in the fee path.

[EIP-8182's shielded pool](/blog/lucid-eip-8182-ethereum-privacy-layers) is the specific construction that EIP-8272 most directly enables. The shielded pool needs to verify that a spend transaction references a recent valid commitment root. EIP-8272 is the protocol mechanism that makes that verification possible without breaking mempool safety.

The 16-reference limit per transaction also opens a useful pattern: a single transaction can simultaneously verify against multiple applications' states. A wallet authorization root, a privacy pool root, and an oracle attestation root can all be declared in the same signed envelope, verified in one pass through `RECENT_ROOT_ADDRESS`.

## What it looks like on-chain

Frame transactions with `recent_root_references` expose a new dimension in block explorers.

The `source_id` values in each reference identify which application's root history the transaction depends on. The `slot` value tells you when that root was published to `RECENT_ROOT_ADDRESS`. An observer can see "this withdrawal declares a dependency on source `0x7f3a...` at slot 7,250,100" without knowing what commitment was spent.

This is an interesting structural tension in the design. References must be public for mempool validation to work, so privacy comes from the ZK proof content being hidden, not from hiding that a proof was submitted. The declared dependencies are observable at the protocol layer. The contents of the proof are not. If you were hoping the withdrawal would be invisible, it isn't. What's hidden is what was withdrawn and by whom.

For node operators and protocol researchers, `recent_root_references` in a frame transaction receipt is forensic information about application-level state dependencies, visible before any call decoding. Ethernal's transaction detail view will render these references alongside the rest of the frame structure, including which source published each root and how far in the past each referenced slot was at inclusion time.

## The precision of the exception

EIP-8272 doesn't weaken EIP-8141's storage read prohibition. It carves out a narrow pre-committed exception: applications write to a system contract at fixed, derivable storage locations. Clients read from those same fixed locations. The transaction signs over exactly which slot and source it expects to find. Any attempt to swap in a different root requires a different signature, which means a different transaction.

The prohibition still holds for everything else. Validation still cannot read live application state. Arbitrary external storage access is still banned. Only pre-committed roots, at known locations, declared in the signed envelope, are accessible.

Privacy pool withdrawals, wallet authorization state checks, and oracle attestation dependencies can all participate in frame transaction validation, bounded to one lookup per reference, without opening the mempool to arbitrary state dependencies.

That bound is deliberate: 8,192 slots of root history, up to 16 references per transaction, one storage lookup per reference. Narrow enough to preserve the mempool safety guarantees frame transactions were designed around. Wide enough to cover the use cases privacy protocols actually need.

---

## Frequently asked questions

### What is a recent root reference in EIP-8272?

A recent root reference is a tuple of `(source_id, slot, root)` declared in a frame transaction's signed envelope. It commits the transaction to a specific application's Merkle root at a specific historical slot. During mempool validation, clients verify the reference by checking a single storage entry in the `RECENT_ROOT_ADDRESS` system contract. The reference lets privacy pool transactions prove their ZK proof was generated against a valid recent root, without reading the pool's live storage during validation.

### How does EIP-8272 differ from reading storage during validation?

EIP-8141 prohibits reading external account storage during frame transaction validation because arbitrary state reads make transaction validity depend on third-party state changes. Any state update could invalidate large numbers of pending transactions simultaneously. EIP-8272 avoids this by having applications pre-commit their roots to a system contract with a fixed storage key structure. Clients read only from that system contract, at a key determined by the declared `(source_id, slot)` pair. The lookup is deterministic given the declared reference; no live application state is involved.

### What is the 8,192-slot window in EIP-8272?

The 8,192-slot window is the rolling circular buffer for recent roots, covering roughly 27 hours at 12 seconds per slot. Applications write a root per slot to `RECENT_ROOT_ADDRESS`. After 8,192 slots, older entries are overwritten by newer ones. A transaction's root reference is valid if the referenced slot falls between 1 and 8,191 slots in the past. This window gives users enough time to generate a ZK proof and submit it within a day, while keeping the storage footprint per source bounded to exactly 8,192 entries.

---

## References

<span id="fn-1">1.</span> Thiery, T., Buterin, V., Wahrstatter, T. "EIP-8272: Recent Roots for Frame Transactions." _Ethereum Improvement Proposals_, May 15, 2026. [https://eips.ethereum.org/EIPS/eip-8272](https://eips.ethereum.org/EIPS/eip-8272)

<span id="fn-2">2.</span> Buterin, V., et al. "EIP-8141: Frame Transactions." _Ethereum Improvement Proposals_, 2026. [https://eips.ethereum.org/EIPS/eip-8141](https://eips.ethereum.org/EIPS/eip-8141)

<span id="fn-3">3.</span> Nero_eth. "Frame Transactions and the Three Gates to Privacy." _ethresear.ch_, April 16, 2026. [https://ethresear.ch/t/frame-transactions-and-the-three-gates-to-privacy/24666](https://ethresear.ch/t/frame-transactions-and-the-three-gates-to-privacy/24666)

<span id="fn-4">4.</span> soispoke, D'Amato, F., Ma, J. "EIP-7805: Fork-Choice Enforced Inclusion Lists (FOCIL)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a recent root reference in EIP-8272?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A recent root reference is a tuple of (source_id, slot, root) declared in a frame transaction's signed envelope. It commits the transaction to a specific application's Merkle root at a specific historical slot. During mempool validation, clients verify the reference by checking a single storage entry in the RECENT_ROOT_ADDRESS system contract. The reference lets privacy pool transactions prove their ZK proof was generated against a valid recent root, without reading the pool's live storage during validation."
      }
    },
    {
      "@type": "Question",
      "name": "How does EIP-8272 differ from reading storage during validation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-8141 prohibits reading external account storage during frame transaction validation because arbitrary state reads make transaction validity depend on third-party state changes. Any state update could invalidate large numbers of pending transactions simultaneously. EIP-8272 avoids this by having applications pre-commit their roots to a system contract with a fixed storage key structure. Clients read only from that system contract, at a key determined by the declared (source_id, slot) pair. The lookup is deterministic given the declared reference; no live application state is involved."
      }
    },
    {
      "@type": "Question",
      "name": "What is the 8,192-slot window in EIP-8272?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The 8,192-slot window is the rolling circular buffer for recent roots, covering roughly 27 hours at 12 seconds per slot. Applications write a root per slot to RECENT_ROOT_ADDRESS. After 8,192 slots, older entries are overwritten by newer ones. A transaction's root reference is valid if the referenced slot falls between 1 and 8,191 slots in the past. This window gives users enough time to generate a ZK proof and submit it within a day, while keeping the storage footprint per source bounded to exactly 8,192 entries."
      }
    }
  ]
}
</script>
