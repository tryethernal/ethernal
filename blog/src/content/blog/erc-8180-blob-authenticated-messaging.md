---
title: "Blobs as a Message Bus: How ERC-8180 Adds Authentication to EIP-4844"
description: "ERC-8180 turns EIP-4844 blobs into a permissionless authenticated message bus. Vitalik co-authored. Here's how the trust separation actually works."
date: 2026-04-22
tags:
  - ERC-8180
  - L2
  - Blobs
  - EIP-4844
  - Ethereum
image: "/blog/images/erc-8180-blob-authenticated-messaging.png"
ogImage: "/blog/images/erc-8180-blob-authenticated-messaging-og.png"
status: published
readingTime: 7
---

You're running a sequencer for an L2. You need to broadcast a signed attestation to another rollup: maybe to trigger a fast-finality settlement, maybe to aggregate validator acknowledgments for a quorum. Your options today: deploy a bridge contract and pay calldata costs, route through a centralized relayer, or build a custom protocol with its own trust model.

None of these are great. All of them add latency, cost, or a trusted intermediary.

There is already infrastructure that reaches every Ethereum node, cheaply, every 12 seconds: EIP-4844 blobs. The problem is they are opaque. No standard way to say "this blob contains messages of type X, signed by these keys, decodable by this contract."

[ERC-8180](https://github.com/ethereum/ERCs/pull/1578), co-authored by Vitalik Buterin and Skeletor Spaceman, proposes to fix that.<sup>[1](#fn-1)</sup> It builds a standard authenticated messaging layer directly on top of blobs. No bridges, no relayers, no new transport.

## What is ERC-8180 (Blob Authenticated Messaging)?

ERC-8180 is a draft ERC that defines standard interfaces for posting and verifying signed messages inside EIP-4844 blobs. It layers over ERC-8179 (Blob Space Segments), which provides the base registration layer, and adds two additional pointers per batch: a decoder address and a signature registry address.

The result is a permissionless message bus. Any party can post authenticated messages in a blob. Any node with EL access and blob data can decode and verify them independently. No trusted intermediary in the read path.

## The problem with blobs today

EIP-4844 shipped blobs as a raw data transport for rollup batch data.<sup>[2](#fn-2)</sup> A blob is 128 KB of opaque field elements, pruned after approximately two weeks. It is cheap (blobs cost a fraction of what equivalent calldata would cost), but that cheapness comes with a constraint: the EVM cannot read blob contents during execution. The `BLOBHASH` opcode returns the versioned hash of a blob, not its data. Verification of blob contents happens off-chain.

This means there is no on-chain record of "this blob contains messages of type X, decodable with contract Y, authenticated by registry Z." Every rollup defines its own encoding. Cross-rollup or protocol-to-protocol blob messaging requires custom integration work for every pair of participants.

ERC-8180 provides that missing registry layer.

## The architecture: trust separation

The central design decision in ERC-8180 is separating decoding from authentication. Most messaging protocols conflate them. ERC-8180 splits them into two independent actors.

The decoder is untrusted: a contract that reads blob field elements and parses a `Message[]` array plus raw signature bytes. Decoders are deployed permissionlessly. Anyone can write one for any encoding format. There is no whitelist.

The signature registry is the trusted half: a contract that maps Ethereum addresses to public keys and verifies signatures. This is the only trust assumption in the system.

The security argument is clean. A buggy or malicious decoder can produce wrong decoded messages, but those messages will have wrong hashes, so they will fail signature verification. A malicious decoder cannot impersonate anyone. Capturing the decoder market grants zero power over authentication. I find this actually satisfying: the verifier, the thing with real authority, never touches the encoding at all.

The interfaces make this concrete:

```solidity
interface IERC_BAM_Decoder {
    struct Message {
        address sender;
        uint64 nonce;
        bytes contents;
    }

    function decode(bytes calldata payload)
        external view
        returns (Message[] memory messages, bytes memory signatureData);
}
```

Decoders must be deterministic, view-only, no side effects. The `signatureData` field is opaque: 96 bytes for BLS aggregated signatures, 65 bytes per ECDSA signature.

```solidity
interface IERC_BAM_SignatureRegistry {
    function schemeId() external pure returns (uint8 id);
    function register(bytes calldata pubKey, bytes calldata popProof) external returns (uint256 index);
    function verify(bytes calldata pubKey, bytes32 messageHash, bytes calldata signature) external view returns (bool);
    function verifyWithRegisteredKey(address owner, bytes32 messageHash, bytes calldata signature) external view returns (bool);
    function supportsAggregation() external pure returns (bool);
    function verifyAggregated(bytes[] calldata pubKeys, bytes32[] calldata messageHashes, bytes calldata aggregatedSignature) external view returns (bool);
}
```

The spec reserves scheme IDs for four cryptographic systems:

| ID | Scheme | Use Case |
|----|--------|----------|
| `0x01` | ECDSA-secp256k1 | Standard Ethereum keys |
| `0x02` | BLS12-381 | Aggregated validator signatures |
| `0x03` | STARK-Poseidon | ZK-native signing |
| `0x04` | Dilithium | Post-quantum |

Scheme IDs up to `0xFF` are reserved for future standards. Switching cryptographic schemes means deploying a new registry. The blob encoding and decoder interface remain unchanged.

## Registration: zero storage per batch

A batch registration writes no state. The entire protocol runs on events.

When a submitter wants to register a blob batch, they attach a blob to their transaction and call:

```solidity
interface IERC_BAM_Core is IERC_BSS {
    event BlobBatchRegistered(
        bytes32 indexed versionedHash,
        address indexed submitter,
        address indexed decoder,
        address signatureRegistry
    );

    function registerBlobBatch(
        uint256 blobIndex, uint16 startFE, uint16 endFE,
        bytes32 contentTag, address decoder, address signatureRegistry
    ) external returns (bytes32 versionedHash);
}
```

The function reads `BLOBHASH(blobIndex)` on-chain. This is the cryptographic binding. The versioned hash commits to the actual blob content, which means a batch registration cannot be forged or reassigned to a different blob after the fact. Segment bounds are validated (`startFE < endFE <= 4096`), and the event is emitted. That is all.

A blob has 4096 field elements. Segments are half-open ranges `[startFE, endFE)`. Multiple independent protocols can share a single blob: different segments, different decoders, different registries, identified by `contentTag = keccak256("protocol.version")` to prevent namespace collisions.

For cases where blob DA is not needed (testnets, low-volume protocols, or when blob slots are scarce), `registerCalldataBatch` provides the same interface using calldata instead. The decoder and registry pointers work identically.

The only state writes in the whole system happen at the registry level, for key registration. That is a one-time cost per identity.

## Verification: from blob hash to authorship

Once a batch is registered, any party with the blob data can verify authorship without trusting anyone.

The hash construction is deterministic and reproducible by anyone:

```
Message Hash   = keccak256(sender || nonce || contents)
Signing Domain = keccak256("ERC-BAM.v1" || chainId)
Signed Hash    = keccak256(domain || messageHash)
Message ID     = keccak256(author || nonce || contentHash)
```

Each `Message` struct carries a per-sender `uint64 nonce`, which is monotonic. This prevents replay attacks and establishes ordering within a sender's message stream.

For L2s aggregating validator acknowledgments, the `verifyAggregated` path is what you want. Pass N public keys, N message hashes, and one aggregated BLS signature. One on-chain call verifies the entire batch. For a fast-finality rollup aggregating dozens of sequencer attestations, this is the difference between N separate verification transactions and one.

The Exposer interface handles the case where a smart contract needs to act on a verified message, say, triggering a state transition when a quorum of sequencers attests to a block:

```solidity
event MessageExposed(
    bytes32 indexed contentHash,
    bytes32 indexed messageId,
    address indexed author,
    address exposer,
    uint64 timestamp
);

function isExposed(bytes32 messageId) external view returns (bool exposed);
```

`isExposed` gives any contract an on-chain proof that a specific message was authenticated, without re-running verification.

## What this enables for L2 operators

The concrete use cases go beyond generic "messaging":

- Cross-rollup communication without bridges: An L2 sequencer posts an authenticated message in a blob. Any other L2's sequencer (they all see the same blobs) reads it, verifies it against the registry, and acts on it. No bridge contract. No relayer. The blob is the transport.

- Sequencer attestation networks: Rollups with decentralized sequencer sets need to aggregate acknowledgments. BAM provides a standard interface for posting and verifying these on-chain, enabling trustless sequencer rotation and slashing without a custom attestation protocol.

- Post-quantum readiness without re-encoding: Switching a rollup's sequencer signing keys from ECDSA to Dilithium (scheme `0x04`) means deploying a new registry and updating key registrations. The blob encoding format, the decoder, and the event structure are unchanged. No protocol upgrade required.

- Censorship-resistant message reading: Any EL node with blob access can independently decode and verify every batch. No trusted indexer in the read path. The "anyone can read" property holds as long as the Ethereum p2p network distributes blobs.

## What this means for block explorers

Today a blob in a block explorer shows a versioned hash and maybe raw field elements. You cannot tell from the explorer alone "this blob contains BAM messages, decoded by contract 0x..., authenticated by a BLS12-381 registry at 0x...".

Because ERC-8180's registration layer is entirely events, an explorer that indexes `BlobBatchRegistered` events builds a complete map: every blob batch with its decoder, registry, submitter, and segment range. From there, calling `decode()` surfaces message authors, nonces, and contents, turning opaque blob hashes into readable, attributable message streams.

The registration events are specifically designed for indexers. The zero-storage design means there is no state to read; an event log from genesis is sufficient for a complete picture. This is the same pattern that makes token transfer indexing tractable at scale.

Ethernal indexes blob-related events today. BAM-aware decoding is a natural extension once the standard matures.

## Where things stand

ERC-8180 is a draft. The specific registry contract addresses, the canonical scheme deployments, and the activation timeline are not yet determined. The interesting open question is whether the Ethereum community converges on shared universal registries per scheme (one BLS registry for everyone) or per-protocol registries (each rollup deploys its own). The trust separation means both models work. The decoder is interchangeable regardless of which registry a protocol picks.

Vitalik's co-authorship signals this is worth watching closely. Blob messaging as a primitive has been discussed for years; ERC-8180 is the first concrete interface proposal to make it interoperable.

The ERC-8179 dependency (Blob Space Segments) is also a draft. BAM needs BSS to land first. But the architecture is designed so that projects can start building against the interfaces now. Nothing prevents testnet deployments of the decoder and registry contracts before the standard finalizes.

If you are building cross-rollup tooling or a sequencer attestation system, this is the spec to track.

---

## References

<span id="fn-1">1.</span> Buterin, Vitalik and Skeletor Spaceman. "Add ERC: Blob Authenticated Messaging (ERC-8180)." _GitHub / ethereum/ERCs_, 2026-02-21. [https://github.com/ethereum/ERCs/pull/1578](https://github.com/ethereum/ERCs/pull/1578)

<span id="fn-2">2.</span> Dankrad Feist et al. "EIP-4844: Shard Blob Transactions." _Ethereum Improvement Proposals_, 2022-02-25. [https://eips.ethereum.org/EIPS/eip-4844](https://eips.ethereum.org/EIPS/eip-4844)
