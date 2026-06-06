---
title: "Valid Signature, Wrong Intent: The Unsolved Authorization Problem for Onchain AI Agents"
description: "Session keys and ERC-8181 bitmaps constrain what agents can do. Neither captures what you meant. Here's the intent gap the 2026 agent standards didn't close."
date: 2026-06-06
tags:
  - AI Agents
  - ERC-4337
  - ERC-8181
  - Security
  - Smart Contracts
image: "/blog/images/valid-signature-wrong-intent.png"
ogImage: "/blog/images/valid-signature-wrong-intent-og.png"
status: published
readingTime: 8
---

Your DeFi rebalancing agent has a session key. Daily limit: $100. It spends exactly $100, but routes the funds through a contract that wasn't in your allowed list. Every signature is valid. ERC-4337 confirms the transaction was authorized. Your agent did what it was technically permitted to do. It did not do what you intended.

The session key captured capability. It never captured intent.

This is the deepest unsolved problem in onchain agent authorization, and a [first systematic treatment published in April 2026](https://arxiv.org/abs/2604.03733) finally named it precisely.<sup>[1](#fn-1)</sup>

## The five-pattern execution spectrum

Not all agent authorization is equal. Saad Alqithami's systematic review of 317 works on blockchain-based autonomous agents identifies five execution patterns, ranging from safe to exposed:<sup>[2](#fn-2)</sup>

| Pattern | Description | Authorization primitive |
|---------|-------------|------------------------|
| I | Read-only observation | None required |
| II | Simulation (no state change) | None required |
| III | Delegated constrained execution | Session keys, spend limits |
| IV | Fully autonomous signing | Agent-held keys, TEE |
| V | Multi-agent workflows | Composed delegation chains |

Most production agents in 2026 operate at Pattern III or IV. By April 2026, over 10,000 agents had registered on Ethereum mainnet under [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) across 16 networks, with the large majority running conventional session key authorization at Pattern III.<sup>[3](#fn-3)</sup>

Pattern V is where things get complicated. In multi-agent chains, authorization compounds. An agent that delegates to a sub-agent that delegates to another creates a chain where the original principal's intent can erode at every link.

## Four ways authorization fails without intent

The SoK paper on blockchain agent-to-agent payments maps out a four-stage lifecycle: discovery, authorization, execution, accounting. It identifies a failure mode at each stage that no current authorization primitive addresses.<sup>[1](#fn-1)</sup>

Failure mode 1: weak intent binding. The session key says "spend up to $100." It does not say "spend $100 only if the liquidity ratio on the target pool exceeds 0.8." Authorization captures *can*. It does not capture *should, given this context*. The agent acted within its authority. The principal's actual condition for action was never encoded.

Failure mode 2: misuse despite valid authorization. The agent is authorized to call Uniswap's `swap()` selector. It calls `swap()`, but does so in response to a prompt injection that routes value to an attacker-controlled address. Every check passes. The authorization was valid. The action was wrong.

Failure mode 3: payment-service decoupling. In [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) commerce, payment escrow and work delivery are separate systems.<sup>[4](#fn-4)</sup> The protocol can verify that payment was released. It cannot verify that the deliverable corresponds to what was actually agreed. Delivery verification is the evaluator's problem, and the evaluator is a centralized trust assumption.

Failure mode 4: limited accountability. After the fact, reconstructing why the agent did X is hard without a plan record. [ERC-8165](https://github.com/ethereum/ERCs/pull/1549) `PlanId` is the beginning of a solution, but the spec is not final, and even a complete plan trace doesn't prove the plan matched the principal's intent.<sup>[5](#fn-5)</sup>

Vivek Acharya's security framework frames this cleanly: "authorization was valid" and "intent was correctly followed" are different properties, and current standards only prove the first.<sup>[6](#fn-6)</sup>

## What session keys solve, and what they miss

ERC-4337 session keys are the most deployed authorization primitive for agent execution today. They do meaningful work. A session key can constrain the target contract, the function selectors the agent can call, the maximum spend per transaction, and the validity window:

```solidity
// Session key policy (simplified ERC-4337 validator)
struct SessionKeyData {
    address[] allowedTargets;    // e.g. [uniswapRouter]
    bytes4[]  allowedSelectors;  // e.g. [swap.selector]
    uint128   spendLimit;        // 50e6 USDC per day
    uint48    validUntil;
}
```

This handles the *who* and *how much*. It does not handle the *why* or the *if*.

Three gaps are structural, not fixable by tuning session key parameters:

Sequential context. Session keys validate each transaction independently. There is no mechanism to express "step 3 should only execute if step 2 succeeded." An agent that skips a safety check mid-plan and proceeds anyway has used only valid session key calls.

Cross-agent scope. If agent A holds a $100 daily session key and sub-contracts agent B with its own $100 session key (via ERC-8183), the principal's $100 limit has been bypassed through delegation depth. The two session keys are independent. Nothing in the authorization stack enforces that the sum of delegated spend cannot exceed the parent's budget.

Intent signal. A session key is a capability grant with constraints. It carries no information about the reason the principal granted it. When something goes wrong, there is no on-chain record of what the agent was supposed to accomplish, only a record of what it was permitted to do.

Alqithami identifies this as the core breakdown at Pattern V: session keys hold at the single-agent level but fragment under multi-agent composition.<sup>[2](#fn-2)</sup>

## ERC-8181's bitmap: finer roles, same limitation

[ERC-8181](https://github.com/ethereum/ERCs/pull/1579) takes a different approach to authorization. Instead of constraining spend and targets, it constrains lifecycle capabilities through a six-bit permission bitmap:<sup>[7](#fn-7)</sup>

| Bit | Permission |
|-----|-----------|
| 0 | EXECUTE_CALL |
| 1 | EXECUTE_DELEGATECALL |
| 2 | ANCHOR |
| 3 | MANAGE_EXECUTORS |
| 4 | TRANSFER_ASSETS |
| 5 | SUBMIT_LIVENESS |

A monitoring agent gets bit 5 only. A trading agent gets bits 0 and 4. Principle of least privilege applied to agent lifecycle roles. The live deployment on Base Sepolia demonstrates this: PKP executor `0x36A92B28d0461FC654B3989e2dB01c44e2c19EBb` holds only the ANCHOR bit, nothing else.

The bitmap is coarser than session keys on spending (no per-transaction limits, no target restriction) and finer on role separation (ANCHOR vs. EXECUTE_CALL are clearly distinct). The intended composition is session keys for spend and target constraints plus the ERC-8181 bitmap for lifecycle roles plus TEE attestation for runtime integrity.

But the bitmap shares session keys' core limitation: it is binary. An executor either has EXECUTE_CALL or doesn't. There is no "can execute calls, but only for steps belonging to plan X, and only if the oracle price is above Y." Contextual intent is still out of scope.

## Delegation grants: authorization as a first-class artifact

Saavedra's work on interoperable delegation architecture introduces a concept that the ERC stack doesn't yet formalize: the Delegation Grant (DG) as a first-class authorization artifact, not just a signed transaction.<sup>[8](#fn-8)</sup>

The defining property is **enforced scope reduction**: a delegating principal cannot grant more authority than it holds, and scope can only narrow, never expand. This is the formal property that prevents the scope-chain depth problem described above.

```solidity
// Delegation Grant concept (after Saavedra 2601.14982)
struct DelegationGrant {
    address delegator;
    address delegatee;
    bytes32 scopeHash;       // hash of allowed capabilities
    bytes32 parentScopeHash; // delegator's own scope constraint
    uint256 validUntil;
    bytes   attestation;     // optional TEE or VC proof
}
```

The DG is anchored on-chain (or on a chain-anchored storage layer) as an auditable record of what was delegated, when, and with what constraints. An off-chain Trust Gateway mediates credential validation and policy evaluation before execution proceeds.

Connect this to ERC-8165 `PlanId` and you get a traceable chain: the human principal creates a DG scoped to a specific plan, the agent executes only within that scope, every step emits the `PlanId` and the DG reference. A post-hoc audit can reconstruct whether the agent stayed within delegated scope. This is closer to intent capture than anything in today's deployed stack , but it remains a research proposal, not a finalized ERC.

## Protecting the signing key itself

Authorization architecture assumes the key is secure. That assumption deserves scrutiny.

The ethresear.ch discussion on key management for autonomous agents identifies four approaches:<sup>[9](#fn-9)</sup>

- **TEE** (Intel SGX, AMD SEV-SNP, AWS Nitro, Oasis ROFL, Lit Protocol PKPs): most practical today; runs the agent inside a secure enclave or across distributed key shards. ERC-8181 explicitly supports all five environments.
- **MPC/TSS**: distributes key shares across multiple instances; no single point of failure; operationally complex.
- **SNARK-based**: prove execution correctness before signing; elegant in theory; impractical for LLM inference today.
- **Indistinguishable Obfuscation (iO)**: theoretically ideal (hides the key inside the agent code); computationally infeasible with current constructions.

The practical answer for 2026 is TEE-based execution combined with on-chain permission constraints. But there is a boundary to understand: a TEE attestation proves the *code* ran in an isolated environment. It does not prove the *output* was aligned with the principal's intent. TEE protects the key. It says nothing about whether the LLM reasoning that produced the transaction was correct.

Intent alignment is off-chain. The TEE cannot help with it.

## What the onchain record shows when intent binding fails

When authorization is valid but intent was not followed, the forensic surface is the event log. Here is what is verifiable today from a block explorer pointed at agent contracts:

**Verifiable on-chain:**
- `ExecutorSet` events: who held which ERC-8181 permissions, and when they changed
- Session key validation events: which keys were active or expired at transaction time
- `OperationExecuted` events (ERC-8165): step index, success flag, plan ID
- `Anchored` events (ERC-8181): cognitive state checkpoints at each anchor
- ERC-8183 lifecycle: `JobCreated`, `JobSubmitted`, `JobCompleted`, `JobRejected`

**Not verifiable on-chain:**
- Whether the agent's LLM reasoning was aligned with the principal's intent
- Whether tool calls used authorized data sources (Alqithami's class 2 threat: Tool and Data Source Spoofing)
- The full deliberation trace; only hashed checkpoints if the agent used ERC-8181 anchors

Ethernal's decoded event stream is the primary forensic tool when intent binding breaks down. The on-chain record doesn't prove intent was followed. It gives you the evidence to reconstruct what actually happened , which executor held which permissions at each step, which plan ID each transaction claims to belong to, and where the authorization chain diverged from what the principal expected.

That's after-the-fact. Prevention still requires work that isn't done.

## The open problems

The SoK paper identifies three directions the field needs to move:<sup>[1](#fn-1)</sup>

**Lifecycle consistency.** Authorization should be bound to a coherent plan context, not validated transaction-by-transaction. Alqithami's Transaction Intent Schema (TIS) , a portable specification of on-chain goals independent of execution mechanics , is a research proposal toward this.<sup>[2](#fn-2)</sup> No ERC candidate exists.

**Behavior-aware controls.** Authorization should be able to encode conditional logic: "authorized to call X only if oracle Y reads above Z." Session keys have no mechanism for this. ERC-8181 bitmaps have none either.

**Compositional workflows.** Cross-agent scope enforcement has no standard. The scope-chain depth problem , where delegation depth multiplies the principal's intended budget , is named but unsolved.

On-chain intent verification, the most complete solution, would require ZK proofs over LLM inference: prove that the model's reasoning, given a specific system prompt and input, produced a specific output. The computation cost is prohibitive today, but it is the direction Acharya's framework points toward.<sup>[6](#fn-6)</sup>

The practical state of 2026: session keys plus TEE plus ERC-8181 bitmaps is the best available combination. It handles capability constraints and role separation well. None of it solves intent binding. The research literature is now naming the problem precisely, which is the necessary precondition for solving it.

The 2026 agent standards sprint delivered identity, commerce, execution tracing, and ownership. The oldest engineering problem in the book remains open: the gap between what you authorized and what you intended. The forensic record is on-chain. The prevention is years out.

---

## References

<span id="fn-1">1.</span> Anonymous et al. "SoK: Blockchain Agent-to-Agent Payments." _arXiv_, April 2026. [https://arxiv.org/abs/2604.03733](https://arxiv.org/abs/2604.03733)

<span id="fn-2">2.</span> Alqithami, S. "Autonomous Agents on Blockchains: Standards, Execution Models, and Trust Boundaries." _arXiv_, January 8, 2026. [https://arxiv.org/abs/2601.04583](https://arxiv.org/abs/2601.04583)

<span id="fn-3">3.</span> Becker et al. "A Dataset of Early Blockchain-Registered AI Agents on Ethereum." _arXiv_, April 24, 2026. [https://arxiv.org/abs/2604.22652](https://arxiv.org/abs/2604.22652)

<span id="fn-4">4.</span> "ERC-8183: Agentic Commerce." _GitHub ERCs_, March 4, 2026. [https://github.com/ethereum/ERCs/pull/1581](https://github.com/ethereum/ERCs/pull/1581)

<span id="fn-5">5.</span> Wang et al. "ERC-8165: Agentic Onchain Operations." _GitHub ERCs_, February 19, 2026. [https://github.com/ethereum/ERCs/pull/1549](https://github.com/ethereum/ERCs/pull/1549)

<span id="fn-6">6.</span> Acharya, V. "Secure Autonomous Agent Payments: Verifying Authenticity and Intent in a Trustless Environment." _arXiv_, November 2025. [https://arxiv.org/abs/2511.15712](https://arxiv.org/abs/2511.15712)

<span id="fn-7">7.</span> Cyan, K., Ruderman, M. "ERC-8181: Self-Sovereign Agent NFTs." _GitHub ERCs_, March 2, 2026. [https://github.com/ethereum/ERCs/pull/1579](https://github.com/ethereum/ERCs/pull/1579)

<span id="fn-8">8.</span> Saavedra, D.R. "Interoperable Architecture for Digital Identity Delegation for AI Agents with Blockchain Integration." _arXiv_, January 21, 2026. [https://arxiv.org/abs/2601.14982](https://arxiv.org/abs/2601.14982)

<span id="fn-9">9.</span> jieyilong. "Key Management for Autonomous AI Agents with Crypto Wallets." _ethresear.ch_, January 2025. [https://ethresear.ch/t/key-management-for-autonomous-ai-agents-with-crypto-wallets/21431](https://ethresear.ch/t/key-management-for-autonomous-ai-agents-with-crypto-wallets/21431)

<span id="fn-10">10.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-11">11.</span> Coinbase. "x402: HTTP-Native Payments for AI Agents." _x402.org_, 2026. [https://x402.org](https://x402.org)
