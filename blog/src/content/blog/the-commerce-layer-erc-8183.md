---
title: "The Commerce Layer: How ERC-8183 Makes AI Agent Payments Verifiable"
description: "ERC-8183 adds the missing verb to agent commerce: not 'I sent value' but 'I will pay when you deliver.' How the job lifecycle and evaluator work."
date: 2026-03-12
tags:
  - AI Agents
  - ERC-8183
  - ERC-8004
  - Ethereum
  - Smart Contracts
image: "/blog/images/the-commerce-layer-erc-8183.png"
ogImage: "/blog/images/the-commerce-layer-erc-8183-og.png"
status: draft
readingTime: 8
---

An agent completes a coding task. The client disputes the quality. The deliverable is ambiguous: functional but missing half the spec. Under a raw ERC-20 transfer, the dispute ends there. The transfer happened. There is no recourse, no record beyond "0xAgent sent 50 USDC to 0xClient." Under [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183), the scenario has a defined resolution path: a designated evaluator calls `reject()`, funds return to the client, and the rejection reason is an immutable onchain record.

That one difference (between a transfer and a job) is what makes agent commerce auditable.

## Before the standard: raw transfers at scale

The problem is not theoretical. Virtuals Protocol ran an internal "Agent Commerce Protocol" tracking $3M+ in agent-to-agent transactions across 3,400+ agents before a standard existed.<sup>[1](#fn-1)</sup> Agents hired agents, agents paid agents, all via raw ERC-20 transfers. It worked at small scale. But raw transfers offer no delivery verification, no structured audit trail, and no recovery path when something goes wrong.

This is the core mismatch. ERC-20 models one semantic: "I sent you value." Agent commerce needs a different one: "I will pay you if and when you deliver value."

Virtuals Protocol approached Davide Crapis, Ethereum Foundation AI Lead and lead of the dAI initiative, to convert their internal system into a neutral Ethereum standard. The result, [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183), was submitted to the ERCs repository on February 25, 2026.<sup>[2](#fn-2)</sup>

The design philosophy is explicit in the spec: intentionally minimal. No pricing negotiation. No arbitration layer. No dispute resolution. Just the transaction lifecycle: fund, submit, evaluate, settle. The spec's authors describe this as "only the core transaction lifecycle." Every feature beyond that is pushed to the evaluator, the hook system, or the application layer.

That restraint is not a limitation. It is why the standard is composable.

## The job primitive: three roles, five states

ERC-8183 defines a job as a relationship between three cryptographically distinct participants.

The **client** creates the job, funds the budget, and can cancel only while the job is still Open. Once funded, the client cannot reclaim funds unilaterally.

The **provider** is the agent hired to do the work. It submits the deliverable and transitions the job to Submitted. It cannot complete, reject, or touch funds.

The **evaluator** is set at job creation and cannot be changed. It is the only address authorized to call `complete()` or `reject()` once work is submitted. It can also reject before submission, allowing early termination if something goes wrong before the provider even starts.

The state machine has five states with one invariant: exactly one terminal transition releases funds.

```
Open → Funded → Submitted → Completed  (terminal: pays provider)
                           → Rejected   (terminal: refunds client)
                           → Expired    (terminal: permissionless claimRefund after timestamp)
```

The `Expired` path deserves attention. If neither `complete()` nor `reject()` is called before `expiredAt`, any address can call `claimRefund()`. The client gets their funds back. The evaluator cannot block this. Double-spending is structurally impossible: only one terminal path executes.

The full job data:

```solidity
struct Job {
    address client;
    address provider;    // address(0) if not yet assigned
    address evaluator;
    address token;       // ERC-20 token
    uint256 budget;
    uint256 expiredAt;
    Status  status;
    string  description;
    bytes32 deliverable; // set by provider on submit()
    bytes32 reason;      // set by evaluator on complete() or reject()
    address hook;        // optional extension point
}
```

```solidity
enum Status { Open, Funded, Submitted, Completed, Rejected, Expired }
```

The `deliverable` field is a `bytes32`: a hash, not the actual work. It is a commitment, a pointer to off-chain content, a hash of a result, or a ZK proof root. What it points to is the evaluator's problem to interpret.

The `provider` field can be `address(0)` at creation, allowing open jobs that any agent can claim. For agent pipelines with a preferred provider, it is set at creation. The x402 extension goes further: agents can sign payment intents off-chain and delegate on-chain execution to a payment facilitator, eliminating the need for agents to manage gas directly.

## The evaluator is the trust layer

The evaluator is the most consequential design decision in ERC-8183, and the least discussed.

In traditional commerce, trust comes from legal contracts, reputation systems, or social relationships. ERC-8183 makes trust programmable. The evaluator can be any of these:

**Client as evaluator** (`evaluator = client`). The simplest case. Used in trusted relationships where the client is best positioned to judge the deliverable. No third party involved.

**Smart contract evaluator.** For tasks with deterministic outputs. The evaluator contract calls `complete()` or `reject()` based on verifiable inputs: a ZK proof that passes verification, an on-chain test harness that runs the submitted code, a hash comparison against a known-good result. No human judgment required.

For subjective tasks, the model changes. Writing quality, design review, reasoning accuracy: another agent evaluates the deliverable. This is agent-to-agent quality control, and it is either impressive or unsettling depending on how much you trust the evaluating agent's judgment. The evaluating agent's own ERC-8004 reputation becomes the trust basis for the evaluation.

**Multisig or DAO evaluator.** For high-value or dispute-prone engagements, multiple parties must agree before funds release. Governance applies to commerce.

The interface for all four is identical. The application picks the trust model; the contract doesn't care.

The spec is explicit about the security tradeoff: "The Evaluator is trusted for completion and rejection once the job is Submitted; a malicious evaluator can complete or reject arbitrarily. It is recommended to use reputation (e.g., ERC-8004) or staking for high-value jobs."<sup>[2](#fn-2)</sup>

This is not a bug. There is no arbitration mechanism in ERC-8183. The evaluator's decision is final and onchain. The protocol does not try to resolve disputes: it makes disputes unnecessary by making the evaluator selection the critical decision. Choose a trustworthy evaluator. Use reputation signals. Use staking. The standard gives you the lever; the application decides how to use it.

### The hook system

The optional hook interface extends the evaluator's reach without changing the core state machine.

```solidity
interface IACPHook {
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external;
}
```

Hooks fire before and after every function call, identified by selector. This enables milestone payments (release 30% on `submit()`, 70% on `complete()`), reputation-weighted outcomes, ZK proof verification as a gate before `complete()` can proceed, and bidding mechanisms layered on top of the Open state.

One deliberate constraint: `claimRefund` is not hookable. A hook cannot block a client from reclaiming funds after expiry. Whatever logic a hook implements, it cannot trap value permanently.

Hook contracts are client-supplied and trusted. The spec is clear that implementations must not allow hooks to modify core escrow state directly. They are observers and side-effect triggers, not state controllers.

## Two teams, one ERC number

On March 11, 2026, two weeks after the Crapis/Virtuals submission, a second team submitted a competing ERC-8183 proposal to the EIPs repository.<sup>[3](#fn-3)</sup> The authors are Nuriddin Jalolov of ZHC Company and `@zhc-ceo`, listed as a co-author. `@zhc-ceo` is an AI agent account.

If EIP editors accept the submission as-is, an AI agent will be listed as an Ethereum standards author. The EIP process has not had to answer that question before. I'm not sure the answer is obvious.

The two proposals share the same ERC number and converge on the same core design: five-state machine, evaluator role, escrow model, permissionless expiry. They diverge in a few places:

| Feature | Crapis / Virtuals (ERCs#1581) | ZHC CEO Agent (EIPs#11393) |
|---------|-------------------------------|---------------------------|
| Token support | ERC-20 only | ERC-20 + ETH (`address(0)`) |
| Deliverable type | `bytes32` (hash) | `string` |
| Hook system | Optional | Not included |
| ERC-8004 dependency | Recommended | Required |
| Submitted to | ERCs repository | EIPs repository |

The convergence is more interesting than the differences. Two independent teams, working separately, arrived at the same state machine and the same evaluator model. That is a signal about where the design space naturally leads. Whether one proposal wins, they merge, or ERC editors assign a new number to the ZHC version: the underlying primitive is taking shape.

## The feedback loop: ERC-8004 and ERC-8183 together

[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) has been live on Ethereum mainnet since January 29, 2026.<sup>[4](#fn-4)</sup> Within weeks, over 20,000 agents had registered. It provides three registries: an Identity Registry (ERC-721 "on-chain resume"), a Reputation Registry (on-chain and off-chain scoring), and a Validation Registry (optimistic validators, zkML, TEE attestations).

ERC-8004 is the trust layer at intake. ERC-8183 is the trust layer during work. Together they form a feedback loop:

```
Agent identity (ERC-8004)
    → selected as provider or evaluator for job (ERC-8183)
    → job completes or rejects
    → outcome written back to reputation (ERC-8004)
    → future job selection informed by updated score
```

Each `JobCompleted` and `JobRejected` event is the raw material for the reputation signal. The ERC-8004 Validation Registry accepts optimistic validators, zkML proofs, and TEE attestations as verification mechanisms: evaluators can write back to reputation automatically at job settlement.

A16z framed the dependency precisely: "Just as humans need credit scores to get loans, agents will need cryptographically signed credentials to transact, linking the agent to its principal, its constraints, and its liability. Until this exists, merchants will keep blocking agents at the firewall."<sup>[5](#fn-5)</sup>

ERC-8004 is that credential system. ERC-8183 is what generates the transaction history that makes the credentials meaningful.

## What agent commerce looks like onchain

Every ERC-8183 state transition emits a structured event. The full set:

- `JobCreated(jobId, client, provider, evaluator, expiredAt)`
- `ProviderSet(jobId, provider)`
- `BudgetSet(jobId, amount)`
- `JobFunded(jobId, client, amount)`
- `JobSubmitted(jobId, provider, deliverable)`
- `JobCompleted(jobId, evaluator, reason)`
- `JobRejected(jobId, rejector, reason)`
- `JobExpired(jobId)`
- `PaymentReleased(jobId, provider, amount)`
- `Refunded(jobId, client, amount)`

When debugging "why wasn't my agent paid?" the answer is in this sequence. Did the job ever reach `Funded`? Did the provider call `submit()`? Did the evaluator call `complete()`, or did the job expire? Was there a rejection, and what was the `reason` field?

The `deliverable` hash and `reason` hash are immutable once set. If a provider claims they submitted quality work and the evaluator rejected without cause, both positions are onchain. The audit trail exists whether or not anyone builds tooling on top of it.

For teams running agent pipelines at scale (multiple providers, multiple evaluators, jobs expiring at different timestamps), this visibility is operational. [Ethernal](https://tryethernal.com) connects to your RPC and decodes ERC-8183 contract state and events without configuration: pending jobs, deliverable hashes, evaluator addresses, rejection reasons, payment release amounts. When you are debugging at 2am why a batch of jobs never settled, decoded event logs are the answer, not raw hex.

## The right amount of standard

ERC-8183 is intentionally minimal, and that restraint is the right call. The evaluator interface is the same whether the evaluator is the client, a ZK proof verifier, an AI judge, or a DAO. The hook system enables milestone payments, reputation gates, and bidding without touching the core contract. The expiry mechanism ensures funds cannot be locked permanently.

The standard does not solve trust. It makes trust explicit, programmable, and onchain. The evaluator selection is where trust decisions happen. The job lifecycle is where those decisions produce immutable records.

Two independent teams submitted the same state machine. One of them listed an AI agent as a co-author. Whether ERC-8183 emerges as a single specification or two competing ones, the design pattern is converging. The commerce layer is coming regardless of which version wins: the underlying need is real, the $3M in pre-standard Virtuals transactions proved it, and raw token transfers are not going to be enough.

---

## References

<span id="fn-1">1.</span> [Add ERC: Agentic Commerce, Ethereum Magicians Discussion](https://ethereum-magicians.org/t/erc-8183-agentic-commerce/27902), Crapis et al., 2026

<span id="fn-2">2.</span> Crapis, D., Lim, B., Weixiong, T., Zuhwa, C. "ERC-8183: Agentic Commerce." _GitHub ERCs_, February 25, 2026. [https://github.com/ethereum/ERCs/pull/1581](https://github.com/ethereum/ERCs/pull/1581)

<span id="fn-3">3.</span> ZHC CEO Agent (@zhc-ceo), Jalolov, N. "Add EIP: Agentic Commerce Protocol." _GitHub EIPs_, March 11, 2026. [https://github.com/ethereum/EIPs/pull/11393](https://github.com/ethereum/EIPs/pull/11393)

<span id="fn-4">4.</span> De Rossi, M., Crapis, D., Ellis, J., Reppel, E. "ERC-8004: Trustless Agents." _Ethereum Improvement Proposals_, January 2026. [https://eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004)

<span id="fn-5">5.</span> A16z Crypto. "Trends: AI Agents, Automation, and Crypto." _a16zcrypto.com_, 2026. [https://a16zcrypto.com/posts/article/trends-ai-agents-automation-crypto/](https://a16zcrypto.com/posts/article/trends-ai-agents-automation-crypto/)

<span id="fn-6">6.</span> "Virtuals Protocol and Ethereum Foundation Launch ERC-8183 for AI Agent Commerce." _Phemex News_, 2026. [https://phemex.com/news/article/virtuals-protocol-and-ethereum-foundation-launch-erc8183-for-ai-agent-commerce-65466](https://phemex.com/news/article/virtuals-protocol-and-ethereum-foundation-launch-erc8183-for-ai-agent-commerce-65466)

<span id="fn-7">7.</span> "Ethereum Introduces ERC-8183 to Enable Trustless AI Agent Commerce." _CoinEdition_, 2026. [https://coinedition.com/ethereum-introduces-erc-8183-to-enable-trustless-ai-agent-commerce/](https://coinedition.com/ethereum-introduces-erc-8183-to-enable-trustless-ai-agent-commerce/)

<span id="fn-8">8.</span> Wang, Q., Li, R., Yu, S., Chen, S. "ERC-8165: Agentic Onchain Operations." _GitHub ERCs_, February 18, 2026. [https://github.com/ethereum/ERCs/pull/1549](https://github.com/ethereum/ERCs/pull/1549)
