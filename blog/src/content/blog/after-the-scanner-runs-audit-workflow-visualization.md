---
title: "After the Scanner Runs: The Audit Workflow Step That Lets Logical Vulnerabilities Through"
description: "Full call graphs overwhelm DeFi auditors. Pattern-scoped visualization targets exactly the structural context you need. Here's how to build the workflow."
date: 2026-07-26
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
keywords: []
image: "/blog/images/after-the-scanner-runs-audit-workflow-visualization.png"
ogImage: "/blog/images/after-the-scanner-runs-audit-workflow-visualization-og.png"
status: published
readingTime: 6
---

Pattern-scoped visualization (a subgraph built around the flagged function's context rather than the full contract) is the workflow step that resolves ambiguous scanner warnings. Here is how to build it.

Two senior auditors review the same Slither output for a 2,000-line DeFi protocol. One flags a finding about an oracle read inside a callback as critical. The other marks it a false positive: "the outer function has a `nonReentrant` modifier, so it is protected."

Both are correct about what they read. Neither made an error. But one happened to trace the call path that made the attack window visible. The other only saw the modifier attribute on the outer function declaration.

This is not a competence gap. It is an information presentation gap. Both auditors had identical access to the source code. One saw the structural relationship. The other did not.

The SmartGraphical paper (Fattahdizaji, Pishdar, Shukur, March 2026) formalizes this gap and proposes a specific fix: visual abstraction scoped to the flagged pattern's context, not to the entire contract.<sup>[1](#fn-1)</sup> The distinction between those two things is what this post is about.

## Why the same warning produces different verdicts

Structural findings carry no verdict in isolation; the answer lives in the call path and state dependencies the warning omits.

Syntax-based findings are self-contained. When Slither reports "state update after external call," the finding carries its own meaning. An auditor does not need surrounding context to understand what is being flagged. The problem class and its location are both in the warning.

Structural findings do not work this way. "Oracle read inside callback" does not carry its own meaning. Whether that reading is suspicious depends on when the value being read was set relative to the callback entry. If the reference price was established before the callback was invoked, and the callback itself can manipulate that price, then the oracle read returns an attacker-controlled value. If the price is sourced independently and the callback cannot influence it, the same pattern is benign.

The finding is identical in both cases. The verdict depends on context that is not in the finding.

When auditors triage without that context, their conclusions depend on whichever mental model they happen to bring. Two senior auditors with different mental models reach divergent verdicts on the same warning. [Prior research on alarm fatigue](/blog/smart-contract-audit-triage-alarm-fatigue) documents the systematic consequences: real findings get dismissed because auditors habituate to warnings that usually resolve to false positives, and the one real signal gets marked noise. SmartGraphical's 100-developer study showed that verdict accuracy improves significantly when auditors have visual context, with particularly pronounced gains for highly skilled developers. The authors describe the result directly: "This hybrid methodology significantly enhances the interpretability and detection rate of non-trivial logical security threats in smart contracts."<sup>[1](#fn-1)</sup>

What the study does not make explicit: the type of visual context matters as much as its presence.

## The scaling problem with full call graphs

Full call graphs do not solve the structural context problem for production protocols; they trade one form of cognitive overload for another.

The obvious solution is to show auditors the call graph. Slither's `--print call-graph` outputs the entire contract's call graph in DOT format.<sup>[2](#fn-2)</sup> For a straightforward contract (a 200-line ERC-20 implementation), this produces a manageable graph: a dozen nodes, readable paths.

For a production DeFi protocol, this does not scale. A complex AMM or lending protocol spans multiple interacting contracts, each with many functions, each function potentially calling others across contract boundaries. A realistic full call graph for a protocol like this has hundreds of nodes. Reviewers under time pressure cannot reason efficiently about a 200-node graph. They scan for familiar shapes, apply gut heuristics, and move on. That is not structural reasoning. It is pattern-matching, the same thing we were trying to improve on.

SmartGraphical's central design decision: the visualization should be scoped to the flagged pattern's structural context, not derived from the whole contract. Not a smaller version of the full graph. A different artifact, constructed specifically to make the relationship that matters visible, and nothing else.

This is the cognitive difference between printing an entire codebase to find a bug versus opening the relevant function in an IDE with call hierarchy, go-to-definition, and inferred types visible. The full codebase contains the answer. The IDE makes it findable.

## The flash swap TOCTOU pattern: what structural analysis sees

Flash swap vulnerability is a TOCTOU pattern across a callback boundary, not canonical reentrancy; a three-node scoped graph makes the attack window immediately visible where Slither's reentrancy detector sees nothing.

Canonical reentrancy has a well-known signature: external call before state update. Slither reliably catches it. Flash swap vulnerability has a structurally different signature, and Slither's canonical reentrancy detector does not flag it.

A flash swap temporarily manipulates balances within a single transaction: the attacker borrows liquidity, executes logic in a callback, and repays before the transaction ends.<sup>[3](#fn-3)</sup> The vulnerability arises when a price oracle is read inside the callback on a value whose reference point was set before the callback entry.

```solidity
// Flash swap callback , the vulnerability is structural, not syntactic
function uniswapV2Call(
    address sender,
    uint amount0,
    uint amount1,
    bytes calldata data
) external {
    // This read happens inside the callback.
    // The price this returns was captured from pool state
    // before the callback entry , state the attacker can now
    // manipulate via the flash-borrowed liquidity.
    uint price = oracle.getPrice(token);

    // Any calculation that uses `price` to determine output amounts
    // is now operating on attacker-controlled input.
    uint output = calculateOutput(price, amount0);
    // ...
}
```

The attack window is: [reference price set from pool state] → [callback entry, attacker manipulates pool] → [oracle reads attacker-controlled price]. This is a time-of-check/time-of-use (TOCTOU) vulnerability across the callback boundary. It is not reentrancy.

A static analyzer examining `uniswapV2Call` in isolation sees: external call, state reads, no write-before-external-call canonical signature. The function passes the reentrancy check. The warning it might produce , "external call in callback" , is indistinguishable from hundreds of benign callback patterns without context. An auditor triaging that warning against a flat list marks it low priority. An auditor who sees [price set before callback] → [oracle read inside callback] as a three-node graph has an unambiguous classification: the temporal ordering makes the manipulation window visible.

## Building scoped visualization with current tools

You can approximate pattern-scoped subgraphs with Slither's existing printers today, without waiting for a dedicated tool.

SmartGraphical is a research framework, not a production tool. You can approximate its output with Slither today using two printers.

**Step 1: Identify the flagged function.** Run your scanner and note the specific function containing the finding you are evaluating.

**Step 2: Extract the call path to the flagged function.** Slither's `--print call-graph` outputs the full graph in DOT format. Filter it to the subgraph reaching your flagged function:

```bash
slither . --print call-graph 2>/dev/null
# produces call-graph.dot
# manually trace backwards from the flagged function node
# to all entry points that can reach it
```

**Step 3: Extract relevant state variable dependencies.** Slither's `--print data-dependency` outputs which state variables each function reads and writes:

```bash
slither . --print data-dependency 2>/dev/null
```

Filter to the state variables your flagged function reads. Note where those variables are written.

**Step 4: Compose the scoped subgraph.** You now have two things: the call path from entry points to the flagged function, and the state variables it reads along with their write locations. That is the scoped context. Sketch it , even informally , before reading the finding in detail.

The scoped subgraph for the flash swap case has three nodes: pool state write, callback entry, oracle read. One dependency edge, one call edge. Drawn on paper, the temporal ordering is immediate. Written in DOT, it is three lines.

The operational discipline is treating this as a required step, not an optional one. A finding without its structural subgraph waits. A finding with its structural subgraph gets triaged. Without enforcement, reviewers under time pressure skip the graph. With enforcement, every structural finding gets consistent context.

## What the SYFI graph made visible

The SYFI rebase failure is the clearest illustration of what scoped visualization surfaces versus what code inspection misses. [We covered the bug in detail earlier](/blog/the-bug-auditors-tools-miss) , short version: a rebase mechanism that was syntactically correct but economically wrong, invisible to both Slither and Mythril.

The scoped graph for the vulnerability has two nodes: the pathway through which the rebase multiplier gets set, and the balance calculation function that consumes it. One dependency edge.

Seeing those two nodes together prompts a question that the code alone does not: what controls this multiplier? Under what market conditions? What happens at boundary values? The multiplier update and the balance calculation live in different functions. Their dependency is only apparent when they appear in the same graph. A raw warning , "external parameter used in balance calculation" , does not prompt that question. The two-node graph does.

## After deployment: the same structural reasoning on real execution

Everything above is pre-deployment static analysis. After deployment, when a suspicious transaction occurs, the same cognitive operation runs on actual execution data rather than static code.

A block explorer call trace is the runtime equivalent of a pattern-scoped graph: it shows the actual call path, state reads, and external calls in the sequence of a real transaction. An Ethernal trace for a flash swap attack surfaces the same shape that a pre-deployment scoped graph would predict , borrow, manipulate, read manipulated price, profit, repay , visible as a sequence in the call tree, not as noise in a raw event log. The [alarm fatigue article](/blog/smart-contract-audit-triage-alarm-fatigue) covers the post-deployment connection in detail. The point here is that building the structural reasoning habit pre-deployment means it is already practiced when you need it on live transactions.

## The finding you cannot triage without a graph

Smart contract security tooling has largely solved detection for syntactic patterns. [Logical vulnerabilities are a different category entirely](/blog/the-bug-auditors-tools-miss), and structural patterns like flash swap TOCTOU fall squarely outside what syntax-level detectors can classify.

SmartGraphical makes one architectural decision explicit: the visual artifact should be scoped to the flagged pattern, not derived from the whole contract. Full call graphs trade cognitive overload for completeness. Pattern-scoped graphs trade completeness for actionability. For triage, actionability is what matters.

The workflow is buildable with Slither today. The discipline is making the scoped subgraph a required step before triaging any structural finding , not an optional one when time permits.

---

## References

<span id="fn-1">1.</span> Fattahdizaji, A., Pishdar, M., Shukur, Z. "SmartGraphical: A Human-in-the-Loop Framework for Detecting Smart Contract Logical Vulnerabilities via Pattern-Driven Static Analysis and Visual Abstraction." _arXiv_, March 9, 2026. [https://arxiv.org/abs/2603.08580v1](https://arxiv.org/abs/2603.08580v1)

<span id="fn-2">2.</span> Feist, J., Grieco, G., Groce, A. "Slither: A Static Analysis Framework For Smart Contracts." _IEEE/ACM 2nd International Workshop on Emerging Trends in Software Engineering for Blockchain (WETSEB)_, 2019. [https://github.com/crytic/slither](https://github.com/crytic/slither)
