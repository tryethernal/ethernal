---
title: "From Ciphertext to Commitment: How LUCID and EIP-8182 Carve Up Ethereum's Privacy Problem"
description: "Two 2026 EIPs attack different layers of Ethereum's privacy problem. LUCID encrypts the mempool scheduling decision. EIP-8182 hides what happened after."
date: 2026-04-10
tags:
  - Ethereum
  - MEV
  - Privacy
  - EIP
  - Protocol
image: "/blog/images/lucid-eip-8182-ethereum-privacy-layers.png"
ogImage: "/blog/images/lucid-eip-8182-ethereum-privacy-layers-og.png"
status: published
readingTime: 8
---

You're building a DEX on a new rollup. Your integration test looks right: swap 500 ETH for USDC, price impact is acceptable. You deploy, a liquidity provider commits to the pool, and your first real trade gets sandwiched. The sandwich bot saw your swap in the public mempool, executed a buy before your transaction, let your trade move the price, then sold into your trade's price impact. You lost roughly 2% to a bot that did nothing but read your pending transaction.

You enable MEV-Boost on your node. The sandwiching continues.

That's because MEV-Boost protects the validator's relationship with builders. It does not protect your transaction from the searchers who read it before any builder touches it.<sup>[1](#fn-1)</sup> The public mempool is a surveillance network. Everything visible is exploitable. Research from the BNB Smart Chain shows where this ends up at scale: just two builder entities produced more than 96% of blocks and captured roughly 92% of MEV profits between May and November 2025.<sup>[7](#fn-7)</sup> PBS alone doesn't prevent extraction dominance.

Two EIPs submitted in early 2026 attack this problem from opposite ends of the execution timeline. They are not alternatives. They are different layers of the same solution.

## The two layers of the problem

**Pre-execution privacy** is about who can see your transaction before it is included in a block. Every full node syncing the mempool sees it. Every searcher monitoring the mempool sees it. Results: frontrunning, sandwiching, copying. The signal you broadcast is your damage.

**Post-execution privacy** is about what the chain permanently records after your transaction lands. Amounts, addresses, token flows, patterns, all visible, forever. This matters for institutional treasury management, payroll, and any use case where permanent financial surveillance is a real concern.

These two problems require different cryptography. They live at different points in the transaction lifecycle. And the proposals addressing them deliberately leave each other's problem out of scope.

LUCID (EIP-8184) targets the first. EIP-8182 targets the second.<sup>[2](#fn-2)</sup><sup>[3](#fn-3)</sup>

The LUCID authors frame the mempool exposure problem through three MEV categories: exogenous MEV (from outside the protocol, like CEX-DEX arbitrage), endogenous MEV (protocol-state imbalances like pool arbitrage), and autogenous MEV (the signal your own transaction broadcasts before it is included). LUCID is specifically designed to block autogenous MEV: the category your DEX trade falls into.

## LUCID: encrypting the scheduling decision

LUCID does not generically "encrypt transactions." That framing misses what it actually does.

The frontrunner's advantage comes from knowing your transaction's contents before the scheduling decision is locked. If a builder can see what you're going to do, they can act before you. LUCID breaks this by separating the *scheduling reservation* from the *transaction contents*: the reservation is visible and locked first, the contents are only revealed after.

The mechanism introduces a new EIP-2718 typed transaction: the Sealed Transaction (ST). The user constructs two artifacts:

1. An **ST Ticket** , the on-chain reservation. Contains `key_commitment = keccak256(k_dem)`, a `ciphertext_hash`, and fee parameters. This is public.
2. A **Ciphertext Envelope** , ChaCha20-Poly1305 AEAD encryption of the actual transaction. This is opaque bytes.

```python
class SealedTransaction(Container):
    ticket: Transaction
    ciphertext_envelope: ByteList[MAX_BYTES_PER_ST]

class CiphertextEnvelope(Container):
    header: ByteList[2**16 - 1]   # Opaque: decryption scheme metadata
    dem_ciphertext: ByteList[MAX_BYTES_PER_ST]
```

A third party called the **Key Publisher** signs the bundle before releasing the decryption key. The protocol timeline runs across the 12-second slot:

| Phase | What happens |
|---|---|
| Before T₁ | Includers propagate ILs containing STs |
| T₁ | Attesters freeze IL view and timeliness votes |
| After T₁ | Builders bid with ST-commitments (promising to include and execute) |
| T₂ | Proposer selects winning bid |
| After T₃ | Builder releases payload; Key publisher releases `LucidKeyMessage` |
| T₄/T₅ | PTC votes on decryption timeliness |

```python
class LucidKeyMessage(Container):
    chain_id: uint256
    scheduling_beacon_block_root: Bytes32
    scheduling_slot: uint64
    commit_index: uint8
    k_dems: List[Bytes32, MAX_STS_PER_BUNDLE]
```

By the time the decryption key is released, the builder has already committed. There is nothing to front-run: the scheduling decision is locked before anyone knows what the transaction does.

The inner transaction (the plaintext payload) must have `max_priority_fee_per_gas = 0` and `max_fee_per_gas = 0`. All fees are paid via the ST ticket. This prevents fee-based fingerprinting of encrypted transactions.

The penalty mechanism makes selective non-revelation economically irrational. A key publisher who consistently withholds keys pays `tob_fee / 128` per missed reveal. An opportunistic non-revealer (who reads the ciphertext before committing) pays the full `tob_fee`. This is the specific attack that matters: a key publisher reads the plaintext, sees an exploitable trade, withholds the key, and captures the MEV themselves. The penalty structure makes that gamble unprofitable in expectation. I find this more elegant than it sounds , the protocol doesn't prevent bad actors from reading your transaction, it just makes acting on that knowledge more expensive than not acting on it.

**Why not enshrine a specific encryption scheme?** No existing construction simultaneously satisfies all requirements: silent setup, small public keys, non-interactive decryption, no trusted setup, practical ciphertext sizes, CCA2 security, and a quantum-safe migration path. LUCID deliberately leaves the `CiphertextEnvelope.header` field as opaque bytes. Different schemes (threshold encryption, TEE-based, trustless self-decryption) can plug in without changing the protocol. This is a design choice about long-term adaptability.

LUCID requires FOCIL (EIP-7805). [FOCIL](/blog/eip-7805-focil-ethereum-censorship-resistance) ensures transactions can't be excluded from blocks by a censoring builder. LUCID adds MEV protection on top: FOCIL is the censorship-resistance layer, LUCID is the privacy layer it enables.<sup>[4](#fn-4)</sup> One fixed constraint: `TOB_GAS_FRACTION_DENOMINATOR = 8`. One-eighth of each block's gas is reserved for encrypted transaction execution.

## EIP-8182: enshrining the shielded pool

EIP-8182 attacks the post-execution problem. Once a transaction is in a block, its contents are permanent. A protocol-level shielded pool hides the *semantics* of what happened while proving the *accounting* is correct.

The proposal deploys a system contract at `0x0000000000000000000000000000000000081820` and introduces three operation modes:

| Mode | What's public | What's private |
|---|---|---|
| Deposit | Token, amount, depositor | Recipient |
| Transfer | That a transaction occurred | Token, amount, sender, recipient |
| Withdrawal | Token, amount, recipient | Sender |

Transfer is the interesting case. The token itself is hidden. Anonymity crosses token boundaries, so the anonymity set for any given sender spans everyone who has deposited any token into the pool. That is the largest possible set for a given system.

The architecture that makes this upgradeable without admin keys is worth understanding. EIP-8182 uses a two-circuit design:

- **Outer circuit** (changed only by hard fork): value conservation, nullifier derivation, Merkle membership. A bug here risks the entire pool. This circuit changes only through social consensus on the protocol.
- **Inner circuit** (user-selected, replaceable without a fork): handles authentication only. It outputs exactly four field elements: `[authorizingAddress, authDataCommitment, policyVersion, intentDigest]`. A weakened inner circuit risks only that user's funds.

This separation lets the protocol add new authentication methods (multisig, passkeys, hardware wallets) by publishing a new inner circuit, without requiring a hard fork. The outer circuit stays stable.

The note commitment and nullifier structures use Poseidon over BN254:

```
commitment = poseidon(amount, ownerAddress, randomness, nullifierKeyHash, tokenAddress, label)

nullifier = poseidon(NULLIFIER_DOMAIN, nullifierKey, leafIndex_u32, randomness)
```

The `leafIndex_u32` is used as a 32-bit integer, not a raw field element. This prevents index aliasing double-spends where two leaf positions map to the same field value.

The `label` field enables lineage tracking: deposits are untagged by default, compatible transfers preserve tags, mixed-origin merges clear to `MIXED_LABEL`. This is designed for future selective disclosure (for compliance or audit purposes) without mandating any specific framework.

The upgradeability motivation is direct. Upgradeable contracts need admin keys, which create a fund-drainage attack surface. Immutable contracts can't evolve. Hard-fork-managed upgrades via social consensus are the only mechanism that allows evolution without a trusted administrator. A protocol-enshrined pool also solves the anonymity set fragmentation problem: multiple incompatible application-layer pools each have smaller anonymity sets. One canonical pool has the largest possible set.<sup>[5](#fn-5)</sup>

The proof system is UltraHONK/BN254 (Barretenberg). Third-party provers cannot forge operations or redirect payments , the proof system prevents it. But a malicious prover can choose unusable `outputNoteData`, rendering notes unrecoverable. For high-stakes transactions, use a first-party prover.

Note: EIP-8182 was closed as a GitHub PR on March 17, 2026 and moved to a separate governance process; it is not abandoned, and the reference implementation remains active.<sup>[3](#fn-3)</sup>

## What a block explorer can actually show

Block explorers sit at the boundary of both layers. This is where the protocol's guarantees meet operational reality.

**LUCID transactions:** The ST ticket appears on-chain as a typed transaction. The ciphertext is opaque bytes. The `LucidKeyMessage` arrives after the scheduling decision is locked. An explorer can show: ticket parameters, key commitment, ciphertext hash, and the time delta between commitment and decryption key publication. It can flag missing or delayed key releases. What it cannot show: the actual transaction contents until decryption keys are published.

**EIP-8182 transactions:** The `transact` function emits nullifiers and commitments as opaque Poseidon hashes. An explorer can show total value locked (derived from deposit and withdrawal deltas), Merkle tree root history (the protocol stores `COMMITMENT_ROOT_HISTORY_SIZE = 500` blocks of roots), and whether commitments are correctly appended. What it cannot show: which addresses are transacting, what amounts are moving in transfers, which auth method was used (`innerVkHash` is never a public input , observers cannot determine which authentication scheme a given user chose).

This creates a new category of explorer tooling: transparency for the protocol layer (did decryption happen on time, is the pool solvent, are commitments correctly appended?) while preserving user-level privacy. The block explorer's role shifts from "show me what happened" to "show me that the protocol behaved correctly."

## The problems neither proposal solves

**Fee and gas confidentiality** is still an open problem. LUCID requires that fee parameters be visible for network validation. GhostPool (an ethresear.ch proposal from March 2026) introduces a ZK proof approach that validates sender identity and nonce without revealing them during mempool admission , but explicitly acknowledges that fee confidentiality under public submission remains "an open unsolved problem."<sup>[6](#fn-6)</sup> A determined analyst can still fingerprint transaction patterns by fee behavior even with encrypted contents.

**Transaction chaining** is unsolved. Both encrypted mempool designs handle head-of-line nonce only. Submitting five sequential encrypted transactions requires that each resolve before the next is submitted. Multi-transaction sequences remain an open design problem.

**Post-quantum safety** is preserved as a future path but not implemented today. LUCID uses a `signature_id` field (0x01 = ECDSA) to avoid enshrining non-PQ-safe ECDSA , the same agility approach as EIP-8141. EIP-8182 moves encryption out of circuit specifically to allow PQ migration without a full circuit rewrite.

**Anonymity set cold start** is a practical problem for EIP-8182. A protocol-enshrined pool starts with zero depositors. The privacy guarantee scales with the size of the anonymity set. Bootstrapping adoption is the unsexy engineering problem behind the elegant cryptography. A shielded pool with ten users is barely a shielded pool. The cryptography works; getting enough people to deposit is a different problem entirely, and the EIP doesn't solve it.

## Two layers, one stack

LUCID's guarantee: the contents of your transaction are invisible until the scheduling decision is locked. The frontrunner can see that you have an encrypted transaction coming. They cannot see what it does.

EIP-8182's guarantee: the accounting is verifiable without revealing the parties or amounts. Anyone can confirm the pool is solvent. Nobody can tell whose funds moved where.

Together they sketch a privacy stack where a block explorer can show you *that* the protocol is behaving correctly , decryption keys are arriving on time, pool invariants are holding, commitments are appended correctly , without showing you *whose* funds are moving where.

Neither proposal is deployed. Both are early-stage EIPs. But the design constraints they document are instructive regardless of whether the specific mechanisms survive intact to deployment. The scope decisions (what each proposal explicitly punts on) are as important as what each one attempts to solve.

---

## Frequently asked questions

### What is LUCID and how does it prevent frontrunning?

LUCID (EIP-8184) is an encrypted mempool proposal for Ethereum. It separates the scheduling reservation for a transaction (the ST ticket, which is public) from the transaction contents (the ciphertext, which is hidden until after the scheduling decision is locked). Because a builder must commit to including a sealed transaction before the decryption key is released, there is nothing to front-run: the builder is committed before they know what the transaction does.

### What is EIP-8182 and how does it differ from Tornado Cash?

EIP-8182 is a protocol-enshrined shielded pool proposal. Like Tornado Cash, it uses ZK proofs to hide transaction parties and amounts. The main differences: EIP-8182 is managed via hard fork rather than an admin key (no fund-drainage attack surface), its two-circuit design lets the authentication layer evolve without requiring a fork, and it builds on the Privacy Pools concept (from Vitalik Buterin et al.) with opt-in Association Set Providers for compliance differentiation rather than mandatory identity linkage.

### Can LUCID and EIP-8182 be used together?

Yes, and they are designed as complementary layers. LUCID protects a transaction's contents while it is pending in the mempool, before inclusion. EIP-8182 protects the semantics of what happened after execution by routing through a shielded pool. Using both would provide pre-execution and post-execution privacy.

### What can a block explorer still show after these proposals are live?

Block explorers can show protocol-layer compliance: whether decryption keys arrived on time for LUCID transactions, the Merkle tree root history and total value locked for the shielded pool, and nullifier and commitment events. What explorers cannot show: the contents of encrypted transactions until keys are published, transfer amounts inside the shielded pool, which addresses are transacting in transfers, and which authentication method was used.

### Do LUCID or EIP-8182 solve all MEV on Ethereum?

No. LUCID specifically addresses autogenous MEV: the signal your own transaction broadcasts. Fee and gas data remain visible in both designs, allowing analysts to fingerprint transaction patterns. Multi-slot MEV, where builders suppress a transaction across multiple consecutive blocks, is not addressed by either proposal.

---

## References

<span id="fn-1">1.</span> Flashbots. "MEV-Boost: Proposer-Builder Separation for Ethereum." _Flashbots_, September 12, 2022. [https://github.com/flashbots/mev-boost](https://github.com/flashbots/mev-boost)

<span id="fn-2">2.</span> Elowsson, A., Florentine, J., Ma, J. "EIP-8184: LUCID Encrypted Mempool." _GitHub Pull Request ethereum/EIPs#11376_, March 18, 2026. [https://github.com/ethereum/EIPs/pull/11376](https://github.com/ethereum/EIPs/pull/11376)

<span id="fn-3">3.</span> Lehman, T. "EIP-8182: Protocol-Enshrined Privacy Pool." _GitHub Pull Request ethereum/EIPs#11373_, March 17, 2026. [https://github.com/ethereum/EIPs/pull/11373](https://github.com/ethereum/EIPs/pull/11373)

<span id="fn-4">4.</span> soispoke, D'Amato, F., Ma, J. "EIP-7805: Fork-Choice Enforced Inclusion Lists (FOCIL)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805)

<span id="fn-5">5.</span> Buterin, V., Illum, J., Nadler, M., Schar, F., Soleimani, A. "Blockchain Privacy and Regulatory Compliance: Towards a Practical Equilibrium." _GitHub_, 2023. [https://github.com/ameensol/privacy-pools](https://github.com/ameensol/privacy-pools)

<span id="fn-6">6.</span> wonj1012. "GhostPool: Hiding Identity-Critical Metadata in Encrypted Mempool Admission." _ethresear.ch_, March 9, 2026. [https://ethresear.ch/t/ghostpool-hiding-identity-critical-metadata-in-encrypted-mempool-admission/24327](https://ethresear.ch/t/ghostpool-hiding-identity-critical-metadata-in-encrypted-mempool-admission/24327)

<span id="fn-7">7.</span> Wang, Q., Li, R., Yu, G., Gramoli, V., Chen, S. "MEV in Binance Builder." _arXiv:2602.15395v1_, February 17, 2026. [https://arxiv.org/abs/2602.15395v1](https://arxiv.org/abs/2602.15395v1)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is LUCID and how does it prevent frontrunning?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LUCID (EIP-8184) is an encrypted mempool proposal for Ethereum. It separates the scheduling reservation for a transaction (the ST ticket, which is public) from the transaction contents (the ciphertext, which is hidden until after the scheduling decision is locked). Because a builder must commit to including a sealed transaction before the decryption key is released, there is nothing to front-run: the builder is committed before they know what the transaction does."
      }
    },
    {
      "@type": "Question",
      "name": "What is EIP-8182 and how does it differ from Tornado Cash?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-8182 is a protocol-enshrined shielded pool proposal. Like Tornado Cash, it uses ZK proofs to hide transaction parties and amounts. The key differences are: EIP-8182 is managed via hard fork rather than an admin key (no fund-drainage attack surface), its two-circuit design lets the authentication layer evolve without requiring a fork, and it builds on the Privacy Pools concept with opt-in Association Set Providers for compliance differentiation rather than mandatory identity linkage."
      }
    },
    {
      "@type": "Question",
      "name": "Can LUCID and EIP-8182 be used together?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, and they are designed as complementary layers. LUCID protects a transaction's contents while it is pending in the mempool, before inclusion. EIP-8182 protects the semantics of what happened after execution by routing through a shielded pool. Using both would provide pre-execution and post-execution privacy."
      }
    },
    {
      "@type": "Question",
      "name": "What can a block explorer still show after these proposals are live?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Block explorers can show protocol-layer compliance: whether decryption keys arrived on time for LUCID transactions, the Merkle tree root history and total value locked for the shielded pool, and nullifier and commitment events. What explorers cannot show: the contents of encrypted transactions until keys are published, transfer amounts inside the shielded pool, which addresses are transacting in transfers, and which authentication method was used."
      }
    },
    {
      "@type": "Question",
      "name": "Do LUCID or EIP-8182 solve all MEV on Ethereum?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. LUCID specifically addresses autogenous MEV: the signal your own transaction broadcasts. Fee and gas data remain visible in both designs, allowing analysts to fingerprint transaction patterns. Multi-slot MEV, where builders suppress a transaction across multiple consecutive blocks, is not addressed by either proposal."
      }
    }
  ]
}
</script>
