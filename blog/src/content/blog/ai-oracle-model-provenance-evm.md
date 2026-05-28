---
title: "The Oracle Your Auditor Can't Read"
description: "AI-powered oracles create an attack surface Slither can't see. Here's what on-chain model provenance looks like in Solidity."
date: 2026-05-28
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
  - AI
image: "/blog/images/ai-oracle-model-provenance-evm.png"
ogImage: "/blog/images/ai-oracle-model-provenance-evm-og.png"
status: published
readingTime: 7
---

A lending protocol integrates an ML-based risk oracle. The model scores collateral in real time based on market volatility signals. The smart contract passes audit. Three weeks after launch, the oracle provider silently retrains the model. The new version underestimates volatility during a market stress event. Liquidations fail to trigger. Two million dollars drain.

No reentrancy. No integer overflow. No access control bypass. The audit was correct. The model was not.

## The new attack surface AI oracles introduce

DeFi oracle manipulation is consistently the dominant exploit class. In January 2026, an attacker used a $280M flash loan to manipulate oracle prices and drain approximately $4M from Makina Finance.<sup>[1](#fn-1)</sup>

The classic oracle attack targets how a contract *consumes* external data: TWAP manipulation, flash loan-assisted price skewing, sandwich attacks around oracle updates. Research tools like AiRacleX now apply LLMs to detect exactly these consumption-layer vulnerabilities, achieving a 2.58x improvement in recall over prior tools.<sup>[2](#fn-2)</sup>

AI and ML oracles add a different layer entirely. Instead of returning a simple price from a price feed, they return the output of a predictive model: a credit score, a volatility estimate, a risk parameter. The contract interface looks identical from the outside:

```solidity
interface IAIOracle {
    /// @return modelHash SHA-256 hash of the model version currently in use
    function currentModelHash() external view returns (bytes32);

    /// @return price Model-generated price for the given market
    function getPrice(uint256 marketId) external returns (uint256 price);
}
```

The contract that calls this is fully auditable. Slither can check it. Echidna can fuzz it. What neither tool can see is what `getPrice` calls internally: a neural network with weights, training data, and a version history that can change between audits.

Slither does not run on neural network weights. Echidna cannot fuzz a model's training distribution. A model retrained on 30 more days of low-volatility data will produce different outputs on the same inputs, with no contract change, no deployment, and no audit trigger.

The Blockchain Council, tracking the field in 2026, identifies four distinct attack surfaces for AI-integrated smart contracts: manipulated inputs to the model, model weaknesses exploitable via adversarial examples, feedback loops where the AI reacts to adversarial behavior, and silent model retraining between audits.<sup>[3](#fn-3)</sup> Current audit tooling covers none of the last three.

## What aerospace figured out first

BladeChain, published in March 2026, is not a DeFi protocol.<sup>[4](#fn-4)</sup> It is a blockchain-based traceability system for AI-driven engine blade inspection in aerospace. The problem it solves is structurally identical to the DeFi oracle problem: an AI model produces decisions that trigger consequential state transitions on a ledger, and auditors need to know which model version made which decision.

That this insight comes from aerospace engineering rather than DeFi security research tells you something about how little the field has grappled with this problem.

The solution is a SHA-256 hash of the AI model artifact committed on-chain alongside every inspection record. Each record captures: the model name, the model version, and the hash of the model file. The inspection result in IPFS is linked to an on-chain entry that includes this hash. If the model file changes, the hash does not match. The chain of custody is broken.

Three design choices in BladeChain transfer directly to EVM:

Pluggable model architecture: organizations can upgrade the inspection model without modifying any chaincode. The version hash is the accountability bridge between the evolving model and the immutable ledger.

Hash verification is fast. Tamper detection on 100-blade workloads runs in 17ms. Hash-based model binding is not computationally expensive at the contract level.

You do not need model weights on-chain. You need the hash of those weights committed alongside each decision the model produced. That is the minimum provenance record. BladeChain achieved 100% lifecycle completion in prototype testing using exactly this minimal approach.

The insight matters because it makes the EVM pattern practical. There is no calldata explosion, no storage bloat. One `bytes32` per oracle call.

## The EVM pattern: three components

Adapting this to EVM contracts requires three components: a model registry, an oracle interface that exposes the current model hash, and a consumer contract that enforces approval and emits provenance records.

**Model registry:** A governance-controlled mapping of approved model hashes.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AIModelRegistry
/// @notice Governance-controlled registry of approved AI model versions.
/// Each approved model is identified by the SHA-256 hash of its artifact.
contract AIModelRegistry {
    mapping(bytes32 => bool) public approvedModels;
    address public governance;

    event ModelApproved(bytes32 indexed modelHash, string version);
    event ModelRevoked(bytes32 indexed modelHash);

    constructor(address _governance) {
        governance = _governance;
    }

    /// @notice Approve a model version for use by oracle consumers
    /// @param modelHash SHA-256 hash of the model artifact
    /// @param version Human-readable version string (e.g. "risk-model-v2.1.0")
    function approveModel(bytes32 modelHash, string calldata version) external {
        require(msg.sender == governance, "Not governance");
        approvedModels[modelHash] = true;
        emit ModelApproved(modelHash, version);
    }

    /// @notice Revoke an approved model version
    /// @param modelHash SHA-256 hash of the model artifact to revoke
    function revokeModel(bytes32 modelHash) external {
        require(msg.sender == governance, "Not governance");
        approvedModels[modelHash] = false;
        emit ModelRevoked(modelHash);
    }
}
```

**Consumer contract with provenance emission:** The consumer fetches the current model hash from the oracle, enforces registry approval, calls the oracle, and emits a provenance event on every call.

```solidity
/// @title ModelAwareConsumer
/// @notice Price oracle consumer that enforces model version approval
/// and emits a provenance record on every AI oracle call
contract ModelAwareConsumer {
    IAIOracle public oracle;
    AIModelRegistry public registry;

    /// @notice Emitted on every oracle call. Records which model version
    /// produced the result, enabling post-incident forensics.
    /// @param modelHash SHA-256 hash of the model artifact used
    /// @param inputHash Hash of the call inputs (marketId + block number)
    /// @param result Price returned by the AI oracle
    /// @param timestamp Block timestamp at time of call
    event AIDecisionRecorded(
        bytes32 indexed modelHash,
        bytes32 indexed inputHash,
        uint256 result,
        uint256 timestamp
    );

    /// @notice Fetch a price from the AI oracle, enforce model approval,
    /// and emit a provenance record
    /// @param marketId Market identifier to price
    /// @return price Price returned by the approved model
    function getPrice(uint256 marketId) external returns (uint256 price) {
        bytes32 modelHash = oracle.currentModelHash();
        require(registry.approvedModels(modelHash), "Model version not approved");

        price = oracle.getPrice(marketId);

        emit AIDecisionRecorded(
            modelHash,
            keccak256(abi.encode(marketId, block.number)),
            price,
            block.timestamp
        );
    }
}
```

Every oracle call now produces a decoded event in the chain's history. For any historical liquidation, trade, or risk assessment, you can trace it to the exact model version hash that produced the price used. A silent model retraining is caught the moment the oracle tries to serve a response with a hash the registry has not approved: the call reverts before the price is consumed.

## What provenance enables

Post-incident forensics: when something breaks, auditors can query which model version was approved at block N and whether the oracle was using it. The event log answers directly. Without provenance emission, that question is unanswerable from on-chain data. The oracle contract returned a price, but nothing in the chain records which model produced it.

Block explorers decode these events without custom indexers. Ethernal's decoded event log view surfaces `AIDecisionRecorded` events with the model hash and input hash inline, giving incident responders a complete timeline of which model version made which decision at which block.

Version governance: governance votes on model updates rather than just code upgrades. Unapproved model hashes are rejected at the contract level, not at the API level of the oracle provider.

Regulatory audit trail: the EU AI Act increases traceability requirements for AI decisions in financial contexts.<sup>[5](#fn-5)</sup> On-chain provenance records provide a cryptographically verifiable trail that external auditors can verify independently, without trusting the oracle provider's internal logs.

What provenance does not do: provenance tells you *which* model ran. It does not prove the model *ran correctly* on the given input. An oracle provider could serve outputs from a different model while reporting the approved hash. That gap is real, and worth being clear-eyed about. Closing it requires ZK proof of inference, where a cryptographic proof binds a specific model to a specific output on a specific input. Tools like ezkl<sup>[6](#fn-6)</sup> and giza<sup>[7](#fn-7)</sup> are emerging for this, but ZK proof of inference is not yet production-standard for EVM deployments. AVS networks on restaking markets are beginning to address it with economic accountability for inference nodes, but without cryptographic guarantees.

## The three-layer security stack

The complete security picture for AI-integrated oracles has three layers:

| Layer | What it covers | Status |
|---|---|---|
| Code audit | The contract consuming the oracle | Solved-enough (Slither, Echidna, formal verification) |
| Model provenance | Which model version produced each result | Achievable today with the pattern above |
| Proof of inference | That a specific model produced a specific output from a specific input | Emerging, not yet standard (ezkl, giza) |

Layer 1 is well-understood. Layer 2 is deployable today, costs one `bytes32` in calldata per oracle call, and is a significant improvement over the current default (no audit trail for model versions at all). Layer 3 is the honest gap. It is where the field is moving, and it is not ready.

For now, provenance alone closes the most immediately exploitable attack vector: silent model retraining post-audit. It is not a complete solution. It is a substantial improvement over nothing, and it is available today.

## What the auditor cannot see

The Makina Finance attacker in January 2026 did not need to find a bug in the protocol's contract code. They needed a flash loan large enough to move the price. AI oracles introduce a third vector: the model itself.

Code auditing tells you the contract does what it was told. Provenance tells you which model told it. The gap between those two questions is where the next class of oracle exploits will emerge, and it is a gap that no current audit toolchain closes by default.

---

## References

<span id="fn-1">1.</span> NomoS Labs. "Oracle Manipulation Attacks: A Complete Guide." _nomoslabs.io_, 2026. [https://nomoslabs.io/oracle-manipulation](https://nomoslabs.io/oracle-manipulation)

<span id="fn-2">2.</span> "AiRacleX: Automated Detection of Price Oracle Manipulations via LLM-Driven Knowledge Mining and Prompt Generation." _arXiv_, February 2026. [https://arxiv.org/html/2502.06348v2](https://arxiv.org/html/2502.06348v2)

<span id="fn-3">3.</span> Blockchain Council. "AI Smart Contracts: Automating Decisions Safely, Explainability, Human Oversight." _blockchain-council.org_, 2026. [https://www.blockchain-council.org/blockchain/ai-smart-contracts-automating-decisions-safely-explainability-human-oversight/](https://www.blockchain-council.org/blockchain/ai-smart-contracts-automating-decisions-safely-explainability-human-oversight/)

<span id="fn-4">4.</span> "A Blockchain-based Traceability System for AI-Driven Engine Blade Inspection." _arXiv_, March 9, 2026. [https://arxiv.org/abs/2603.08288](https://arxiv.org/abs/2603.08288)

<span id="fn-5">5.</span> Blockchain Council. "Blockchain-Based AI Model Provenance Tracking: Training Data, Weights, Version History." _blockchain-council.org_, 2026. [https://www.blockchain-council.org/blockchain/blockchain-based-ai-model-provenance-tracking-training-data-weights-version-history/](https://www.blockchain-council.org/blockchain/blockchain-based-ai-model-provenance-tracking-training-data-weights-version-history/)

<span id="fn-6">6.</span> ezkl. "ZK proof of inference for neural networks." _ezkl.xyz_. [https://ezkl.xyz](https://ezkl.xyz)

<span id="fn-7">7.</span> Giza Tech. "Verifiable AI inference on-chain." _gizatech.xyz_. [https://www.gizatech.xyz](https://www.gizatech.xyz)
