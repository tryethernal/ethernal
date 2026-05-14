---
title: "How an AI Auditor Learned to Find Bugs by Reading 270 Hack Reports"
description: "A March 2026 agentic auditing system built a knowledge graph from 270 Code4rena reports and found every high-severity bug in 12 production contracts."
date: 2026-05-14
tags:
  - Security
  - Auditing
  - Smart Contracts
  - AI
image: "/blog/images/ai-auditor-knowdit-code4rena.png"
ogImage: "/blog/images/ai-auditor-knowdit-code4rena-og.png"
status: published
readingTime: 7
---

A DeFi protocol finishes an audit. Slither runs clean. Two human auditors spend two weeks reviewing and find three medium issues, all fixed. The protocol ships.

Six months later, a flash loan drains $4M through a logical invariant the audit never surfaced. The code was correct. The spec was wrong.

The auditors were not negligent. They were working with tools not built for this class of problem. [We covered what that class looks like in detail earlier.](/blog/the-bug-auditors-tools-miss) The short version: static analysis finds syntactic bugs. Logical bugs, where the code does exactly what it was told to do but the protocol's economic logic is flawed, require something closer to domain reasoning.

A March 2026 paper describes a system that takes a different approach.<sup>[1](#fn-1)</sup> Instead of teaching an AI what vulnerable code looks like, the researchers taught it what experienced auditors think about when they read DeFi contracts. They did this by reading 270 audit reports.

## Why pattern-matching hits a ceiling

Static analysis tools work by recognizing patterns. Slither has over 92 detectors.<sup>[2](#fn-2)</sup> Each encodes a known-bad structure: external call before state update, unchecked return value, integer operation without bounds check. Symbolic execution, as implemented in Mythril, explores all possible execution paths and tests for constraint violations. Fuzzing with Foundry or Echidna finds inputs that break invariants you specify.

All three approaches share the same limitation: they require you to pre-specify what you are looking for. Known patterns. Formal properties. Stated invariants.

DeFi-specific logical bugs do not have signatures. Flash loan callback sequences that leave oracle prices stale, rebase mechanisms that interact unexpectedly with staked balances, liquidity pool accounting that breaks under specific withdrawal ordering: these are context-reasoning problems, not pattern-matching problems.

Traditional audit costs reflect this gap. A standard DeFi audit runs $10,000 to $50,000. For critical bridge infrastructure, formal verification costs exceed $200,000, partly because Certora-style provers require human domain experts to formalize the invariants being checked.<sup>[3](#fn-3)</sup> Human attention is the scarce resource.

## What 270 audit reports contain

Knowdit, developed by researchers at Nanyang Technological University, begins with a different premise.<sup>[1](#fn-1)</sup> The knowledge needed to audit DeFi contracts already exists. It is in the public record.

Code4rena has run 270 competitive audit contests, each producing a public report that documents every vulnerability found, classified by severity, with the auditor's reasoning about what went wrong and why.<sup>[4](#fn-4)</sup> That corpus, 3,904 documented vulnerabilities across 270 projects, is a labeled dataset of how expert auditors reason about DeFi-specific risk.

Knowdit converts it into a structured knowledge graph with three layers.

The first layer holds 475 DeFi semantic concepts: domain constructs like "slippage tolerance," "flash loan callback sequence," "liquidity pool rebalancing," and "token balance assumption post-callback." The second layer holds 579 vulnerability patterns, each linked to those concepts. The third layer is 2,096 edges connecting concepts to patterns -- encoding, for instance, that "flash loan callback sequence" is associated with "check-effects-interactions violation in callback," "oracle price manipulation within callback," and "balance assumption breakage post-callback."

The distinction from learned pattern-matching is precise. The model does not know that a certain syntactic structure is bad. It knows that a certain DeFi context creates conditions under which specific vulnerability classes become possible. That contextual reasoning is what audit reports contain that code alone does not.

One consequence of this design: the knowledge base compounds automatically. Each new Code4rena contest adds labeled vulnerability data. Knowdit was built from 3,904 documented bugs. The next version will train on more.

## How it audits a new contract

When Knowdit analyzes an unseen contract, it runs a multi-agent loop built on top of that knowledge graph.<sup>[1](#fn-1)</sup>

The pipeline has six phases:

1. Parse the contract structure and query the knowledge graph for relevant DeFi concepts
2. Fetch associated vulnerability patterns for those concepts
3. Write a natural-language specification of the invariants the contract should maintain
4. Generate Foundry fuzz tests targeting those invariants
5. Run Foundry against the synthesized test harnesses
6. Analyze results, update shared working memory, refine or discard findings across iterations

The implementation is approximately 10,000 lines of Rust. GPT-5.1 handles reasoning and reflection. GPT-5-mini synthesizes harness code and repairs, a cost optimization that separates expensive reasoning from routine code generation. Agents share working memory, so findings from one iteration inform the next.

Step 4 is where the system earns its keep: automatic harness synthesis. Writing good Foundry invariant tests requires deep domain knowledge. Knowdit retrieves that knowledge from its knowledge graph rather than requiring a human to encode it from scratch.

Consider the kind of harness this makes possible. A manually written fuzz harness for a lending protocol might test that no user can withdraw more than they deposited. Knowdit, after retrieving patterns for "liquidity pool rebalancing" and "flash loan callback sequence," generates harnesses that test whether a flash loan can be used to manipulate the pool state during a rebalancing window -- a test most human engineers would not think to write unless they had already seen that pattern exploited in a prior audit.

## Benchmark results

The authors evaluated Knowdit on 12 recent Code4rena projects with 75 ground-truth vulnerabilities.<sup>[1](#fn-1)</sup>

| Metric | Result |
|---|---|
| High-severity recall | 14/14 (100%) |
| Medium-severity recall | 77% |
| False positives | 2 |

The 100% recall on high-severity findings is the headline number. I find it genuinely striking. Static tools rarely approach this on logical vulnerability classes, and when they do it is usually by generating so many false positives that the signal drowns.

The false positive count matters as much as recall. Two total false positives across 12 projects means the findings list is almost entirely actionable. A tool with high false-positive rates generates triage overhead that offsets its recall advantage.

Beyond the benchmark, the team applied Knowdit to 6 production contracts currently in development. It found 12 High-severity and 10 Medium-severity previously unknown vulnerabilities. Developers acknowledged and fixed all 22 before deployment.

## What this does not solve

Knowdit is not a complete replacement for human auditors.

The knowledge graph only covers patterns present in its training corpus. Novel protocols with no historical analog, new mechanism designs, first-of-kind cross-chain interactions -- these will be underrepresented. A vulnerability class that has never appeared in a Code4rena report will not appear in the knowledge graph. Truly novel attacks remain beyond current AI detection. That is not a criticism of Knowdit specifically; it is a hard limit on what any retrospective knowledge base can do.

The system requires GPT-5.1: API costs, latency, and a dependency on an external service. It is not a local, self-contained tool.

SmartLLM, a parallel research effort using a fine-tuned Llama 3.1 model combined with RAG over ERC standards, achieves 100% recall but only 70% accuracy at 62.5% precision.<sup>[5](#fn-5)</sup> That accuracy gap means roughly one in three reported vulnerabilities is a false positive. Developers still need to triage. AI auditing at this stage reduces human effort; it does not eliminate it.

Human auditors remain essential for novel protocol designs, cross-chain governance interactions, and mechanism design review. Formal verification for critical infrastructure, bridges, custody contracts, anything with concentrated TVL, is still the highest-assurance option. It costs over $200,000 precisely because it requires human experts to formalize the properties being verified.<sup>[3](#fn-3)</sup>

OpenAI's EVMBench benchmark, designed to evaluate AI agents on smart contract security tasks, signals that the field is moving from "is AI auditing viable?" to "which approach wins on which task class."<sup>[6](#fn-6)</sup> That framing is more useful than treating any single tool as a complete solution.

Honest summary: for known vulnerability classes in DeFi contracts, Knowdit-class tools now match or exceed human auditors on recall. For novel protocols and unknown attack surfaces, humans are not replaceable.

## What happens after deployment

Pre-deployment tooling evaluates code before users touch it. Deployed contracts interact with real state, real liquidity, and real adversaries. The attack surface changes continuously.

Block explorer transaction tracing is the post-deployment layer. When a contract that passed AI screening and human audit goes live, on-chain patterns can still indicate active exploitation:

- Repeated calls to the same function from fresh addresses with minimal gas
- Transaction sequences that match known exploit structures: flash loan, swap, callback, swap back, within a single block
- Abnormal gas consumption on calls that should be computationally cheap
- Balance deltas that violate the invariants the pre-deployment verifier confirmed

Ethernal's transaction tracing surfaces these patterns at the call level: decoded call trees, internal state transitions, event logs for each step. The combination of AI pre-deployment screening and block explorer post-deployment monitoring is the beginning of a continuous security pipeline. Not the end of audits; a different contract lifecycle.

## The 271st lesson

The audit industry's bottleneck has always been human attention. More contracts deploy than auditors can review. The backlog compounds with every bull cycle.

Knowdit does not replace auditors. It changes where human attention belongs. The pattern-matching and harness-writing work that consumed three days of a human auditor's time can run automatically against 270 contests worth of accumulated knowledge. Human auditors can focus on novel mechanism design, protocol-specific logic, and cross-system interactions that have no historical precedent.

The 270 audit reports Knowdit was trained on represent 270 expensive lessons. The question is whether your protocol will be lesson number 271.

---

## References

<span id="fn-1">1.</span> Kong, Z., Xia, W., Wang, C., Lu, Y., Li, P., Li, S., Cao, Z., Liu, Y. "Knowdit: A Knowledge-Driven Agentic Framework for Smart Contract Vulnerability Detection." _arXiv_, March 2026. [https://arxiv.org/abs/2603.26270](https://arxiv.org/abs/2603.26270)

<span id="fn-2">2.</span> Trail of Bits. "Slither, the Solidity source analyzer." _GitHub_, 2026. [https://github.com/crytic/slither](https://github.com/crytic/slither)

<span id="fn-3">3.</span> Hacken. "Formal Verification in Smart Contract Auditing." _hacken.io_, 2026. [https://hacken.io/discover/formal-verification/](https://hacken.io/discover/formal-verification/)

<span id="fn-4">4.</span> Code4rena. "Competitive Audit Platform." _code4rena.com_, 2026. [https://code4rena.com/](https://code4rena.com/)

<span id="fn-5">5.</span> "SmartLLM: Smart Contract Auditing using Custom Generative AI." _arXiv_, February 2025. [https://arxiv.org/abs/2502.13167](https://arxiv.org/abs/2502.13167)

<span id="fn-6">6.</span> "Re-Evaluating EVMBench: Are AI Agents Ready for Smart Contract Security?" _arXiv_, March 2026. [https://arxiv.org/abs/2603.10795](https://arxiv.org/abs/2603.10795)
