---
title: "The Call Graph Your Auditor Never Drew"
description: "Three visualization commands that reveal what Slither's 92 detectors can't see: topological bugs in call graphs, inheritance trees, and state machines."
date: 2026-06-08
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Solidity
keywords: []
image: "/blog/images/smart-contract-visualization-tools-audit.png"
ogImage: "/blog/images/smart-contract-visualization-tools-audit-og.png"
status: published
readingTime: 8
---

A modifier protects the privileged transfer function. Slither runs clean. The audit passes. Then someone notices: the modifier lives on the child contract. The parent implementation is still `public`. An attacker calls `ParentContract.execute()` directly, skipping the child entirely, and every security check with it.

Nothing in Slither's 92 detectors flags this. It is not an implementation bug. The modifier works. The code is correct. The problem is topological: the system has a shape the reviewers never saw because nobody drew the map.

That map takes two minutes to generate.

## What static analysis sees, and what it doesn't

Slither's detectors operate on the abstract syntax tree (AST): a per-file, linearized representation of code structure. The AST is excellent for pattern matching against known vulnerability signatures. Reentrancy checks, integer overflow, unchecked return values, missing access control on a single function: all visible in the AST.

What the AST cannot represent is topology. Cross-contract reachability. The full set of paths from `external call` to `privileged state`. How execution can travel across four contracts and arrive somewhere the authors never intended. The AST shows each file. It does not show the system.

This distinction explains why current security tooling detects only 8-20% of exploitable bugs.<sup>[1](#fn-1)</sup> That number is worse than it sounds. The 80-90% that tools miss is not random: it concentrates in bugs that require *relational* reasoning, seeing how contract elements connect across the whole system, not within any single file.

[We covered the class of logical bugs that elude automated tools in an earlier post.](/blog/the-bug-auditors-tools-miss) This post is about a different-but-related gap: *topological* bugs that are visible the moment you draw the right graph, and the three commands that draw them.

## Three visualizations every audit should start with

These are not documentation aids. They are first-class security artifacts. Generate them before reading a line of code.

### 1. The call graph

The call graph shows every function, every external call, and every cross-contract edge in your system. Install [Surya](https://github.com/ConsenSysDiligence/surya) (ConsenSys Diligence's audit toolkit) and run:<sup>[2](#fn-2)</sup>

```bash
npm install -g surya
surya graph 'src/**/*.sol' | dot -Tpng > callgraph.png
```

What you are looking for:

- External calls that cycle back to your contract. A call graph where `ContractA -> ExternalContract -> ContractA` forms a cycle is a potential reentrancy topology. It does not prove a reentrancy bug exists: it shows you where to look.
- Public functions in base contracts reachable without going through a child's modifier. This is the hook scenario. The call graph makes it visible as a direct edge: `external -> BaseContract.execute()` with no modifier node on the path.
- Unexpected paths into privileged functions. Any function you consider privileged should have a small, well-defined set of callers in the graph. A privileged function with five unexpected incoming edges is a finding worth investigating before the audit even starts.

For tracing all callers of a specific function:

```bash
surya ftrace 'src/**/*.sol' AuthContract privilegedTransfer all
```

This outputs every code path that can reach `privilegedTransfer`, useful for verifying that access control is applied consistently across all entry points, not just the obvious one.

### 2. The inheritance graph

The inheritance graph exposes the contract hierarchy, every inherited function, every inherited modifier, and where they live in the tree. Two commands produce it; use whichever fits your workflow:

```bash
# Slither printer
slither src/Contract.sol --print inheritance-graph
dot -Tpng inheritance-graph.dot > inheritance.png

# Surya
surya inheritance 'src/**/*.sol' | dot -Tpng > inheritance.png
```

What you are looking for:

- Modifiers applied at a child level whose parent entry points remain callable. The classic bypass pattern. The inheritance graph surfaces it as a base function with no modifier annotation that a child override *does* annotate.
- Functions overriding with changed visibility. A `public` function in a base that a child overrides as `internal` looks correct in isolation. The base version is still `public` and still callable.
- Diamond inheritance conflicts. Multiple inheritance with a shared base produces linearization order issues that are invisible per-file but obvious in a graph. The `super` call chain in a diamond hierarchy can skip function implementations unexpectedly.

Slither's `--print function-summary` printer pairs well with this: it lists parameter types, return types, and state variable access per function, giving you a quick map of what each node in the graph actually does.

```bash
slither src/Contract.sol --print function-summary
```

### 3. The state variable map

[sol2uml](https://github.com/naddison36/sol2uml) generates UML class diagrams from Solidity source: all state variables, their types, the functions that read and write each one, and the inheritance relationships between contracts.<sup>[3](#fn-3)</sup>

```bash
npm install -g sol2uml
sol2uml 'src/**/*.sol' -o architecture.svg
```

This is the foundation for building a state machine diagram manually. Sol2uml gives you the components: the state variables and the functions that touch them. The manual step is drawing the transitions:

1. Identify the central state variable (a protocol phase, an auction status, a vault lock state).
2. List the values it can take.
3. For each function that writes it, draw an arrow: `fromState -> function -> toState`.
4. Mark each arrow with who can call the function (owner, any user, contract only).

What you are looking for:

- Transitions reachable from unexpected callers. A state change that should require an admin calling it but has an edge from `any address` is an access control gap.
- States with no exit. A value the state variable can reach but never leave means funds or permissions can be permanently locked.
- Missing guards on critical transitions. A transition that should only happen from `state == Active` but has no check on the current state is a business logic bug waiting to be exploited.

This is the class of vulnerability that [SmartGraphical's research validates directly](#the-research-case-for-visualization): state machine topology is something static analysis pattern matchers structurally cannot reason about.

## The research case for visualization

A March 2026 paper from Fattahdizaji, Pishdar, and Shukur at Universiti Putra Malaysia introduces SmartGraphical: a framework that combines pattern-driven static analysis with visual abstraction of contract structure.<sup>[4](#fn-4)</sup> The paper's core claim is precise:

> Logical vulnerabilities are inherently context-dependent and arise from weaknesses in the underlying contract logic, unlike syntax-level errors which are deterministic and amenable to pattern matching.

*Fattahdizaji, Pishdar, and Shukur, "SmartGraphical"<sup>[4](#fn-4)</sup>*

Their "Logical Relationship Mapping" renders the dependency graph between contract elements (functions, state variables, external calls) in the same way the three commands above do. In a study across 100 developers at varying expertise levels, SmartGraphical detected vulnerability cases that "eluded state-of-the-art automated detectors including Oyente, Mythril, Securify, and VeriSolid."<sup>[4](#fn-4)</sup>

The human-in-the-loop architecture is deliberate. Automated tools surface graph candidates; humans make contextual judgments about whether a call path represents a real attack vector. Topological bugs are inherently context-dependent: whether a base contract being callable directly is exploitable depends on what that function does and who is supposed to call it. Only a human with business logic context can answer that.

A 2024 IEEE paper by Mothukuri, Parizi, and Massa at Kennesaw State University validates the same intuition from a different direction.<sup>[5](#fn-5)</sup> LLMSmartSec fine-tunes language models on Solidity by annotating control flow graphs (CFGs) and using those as the input representation rather than raw source code. The finding: LLMs reason more accurately about contract security when given the graph structure than when given linear code. Graph representation is the substrate for reasoning about smart contracts, whether the reasoner is human or machine. I find this result unsettling in the best way: even the AI tools work better when you draw the picture first.

## Runtime closes the loop

The static call graph shows the *possible* paths through your contract system. A transaction trace shows the *actual* paths users and attackers take.

These are the same graph at different points in the protocol lifecycle. Pre-deployment visualization is the predicted call graph. Post-deployment traces are the observed call graph. When an exploit happens, the post-mortem traces the attacker's execution path against the expected topology: where did execution diverge from what the call graph said was the intended flow?

This is why generating the static call graph before deployment matters. If you know what the graph should look like, you can recognize when a runtime trace shows an unexpected shape.

Ethernal renders the executed call stack for any transaction. An exploit transaction renders as a decoded call tree showing exactly which contracts were called, in which order, which state changed, and which callbacks fired. When your static call graph flagged `BaseContract.execute()` as a potential bypass path, you know exactly what to look for in a suspicious trace: an inbound call to that function without the expected child contract in the call chain.

For teams running on public chains, Etherscan and similar explorers surface this view. For L2 and L3 deployments on private networks, you need your own trace layer. [Transaction tracing with Ethernal](/blog/transaction-tracing-with-ethernal) covers the mechanics.

## Putting this into a workflow

Three commands, run at the start of every audit engagement before reading a line of implementation code:

```bash
# 1. Call graph
surya graph 'src/**/*.sol' | dot -Tpng > callgraph.png

# 2. Inheritance graph
surya inheritance 'src/**/*.sol' | dot -Tpng > inheritance.png

# 3. State variable map
sol2uml 'src/**/*.sol' -o architecture.svg
```

Then:

1. Review the call graph for unexpected paths into any privileged function. Flag them.
2. Review the inheritance graph for base contract functions whose child overrides add modifiers; verify the base is not directly callable.
3. Use the sol2uml output to draw the state machine manually for any core protocol state variable.
4. Run `surya ftrace` on every flagged privileged function to enumerate all callers.
5. Run `surya mdreport` to generate a Markdown function summary for the whole codebase, a useful orientation before diving into implementations.

```bash
surya mdreport report.md 'src/**/*.sol'
```

This is what SmartGraphical automates at research scale. You can do it manually today with existing, free tools in under an hour for a moderately sized protocol.

## The shape of the system

There are two audit questions, and most teams only ask one.

Slither can tell you a function does not check a return value. Only a call graph can tell you that an attacker can reach a privileged function in three hops that your modifier does not cover. Only an inheritance graph shows that the modifier is applied at the wrong level. Only a state machine diagram shows that a critical state transition has no guard.

These graphs take minutes to generate. They reveal a class of vulnerability that no amount of line-by-line code review catches, because the bug does not live in any single line. It lives in the topology.

Draw the graph first.

---

## References

<span id="fn-1">1.</span> Hacken. "Audit Tools Review: The Security Landscape for Smart Contracts." _hacken.io_, 2026. [https://hacken.io/discover/audit-tools-review/](https://hacken.io/discover/audit-tools-review/)

<span id="fn-2">2.</span> ConsenSys Diligence. "Surya: A Solidity Inspector." _GitHub_, 2024. [https://github.com/ConsenSysDiligence/surya](https://github.com/ConsenSysDiligence/surya)

<span id="fn-3">3.</span> Addison, N. "sol2uml: Solidity UML Generator." _GitHub_, 2024. [https://github.com/naddison36/sol2uml](https://github.com/naddison36/sol2uml)

<span id="fn-4">4.</span> Fattahdizaji, A., Pishdar, M., Shukur, Z. "SmartGraphical: A Human-in-the-Loop Framework for Detecting Smart Contract Logical Vulnerabilities via Pattern-Driven Static Analysis and Visual Abstraction." _arXiv_, March 9, 2026. [https://arxiv.org/abs/2603.08580v1](https://arxiv.org/abs/2603.08580v1)

<span id="fn-5">5.</span> Mothukuri, V., Parizi, R., Massa, F. "LLMSmartSec: Smart Contract Vulnerability Detection Using Fine-Tuned LLM with Control Flow Graphs." _IEEE Blockchain_, 2024. [https://ieeexplore.ieee.org/document/10664261/](https://ieeexplore.ieee.org/document/10664261/)
