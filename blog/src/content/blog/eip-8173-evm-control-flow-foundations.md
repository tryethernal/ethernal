---
title: "The EVM Has No CALL/RET. Here's What It Costs Every L2."
description: "EIP-8173 makes the historical case for static EVM control flow. Here's what the missing CALL/RET instruction costs ZK provers, L2 clients, and block explorers."
date: 2026-06-14
tags:
  - EIP-8173
  - EVM
  - ZK
  - L2
  - Ethereum
keywords: []
image: "/blog/images/eip-8173-evm-control-flow-foundations.png"
ogImage: "/blog/images/eip-8173-evm-control-flow-foundations-og.png"
status: published
readingTime: 7
---

In 1946, Alan Turing designed the Automatic Computing Engine and wrote down how subroutines should work:

> To start on a subsidiary operation we need only make a note of where we left off the major operation and then apply the first instruction of the subsidiary.

He was describing a call stack. Save the return address. Run the subroutine. Resume at the saved point. Turing thought this was obvious enough to state in one sentence and move on.

The EVM, launched 69 years later, has no equivalent mechanism. Internal function calls in Solidity-compiled bytecode are synthesized from raw `PUSH` and `JUMP` instructions, with no native concept of a call boundary or a return point. The EVM executes just fine. Every tool that tries to *understand* what it executes hits a structural wall.

[EIP-8173](https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md), assigned its number via PR #11368 in March 2026, is the document that makes the historical and theoretical case for why this matters , and what it costs every layer of the modern Ethereum stack.<sup>[1](#fn-1)</sup>

## EIP-8173 is a "why" document, not a proposal

Most EIPs specify a change. EIP-8173 argues for one. It is an Informational EIP, authored by Greg Colvin, a longtime Ethereum core developer who first proposed static subroutines in 2016 as [EIP-615](https://eips.ethereum.org/EIPS/eip-615).<sup>[2](#fn-2)</sup>

The document is the theoretical foundation for four related proposals:

- **EIP-615** (2016): Subroutines and static jumps, proposed but stalled
- **EIP-4750**: EOF functions (`CALLF`/`RETF`)
- **EIP-7979**: Call and return opcodes (`CALLSUB`/`ENTERSUB`/`RETURNSUB`)
- **EIP-8013**: Static relative jumps (`RJUMP`/`RJUMPI`/`RJUMPV`/`RJUMPSUB`/`RJUMPSUBV`)

The EIP states the relationship plainly: "EIP-7979 can be used to implement every other EIP here." EIP-8173 explains why implementing any of them is worth the disruption. Understanding the argument is useful for anyone who reads EIP-7979's opcode table and asks: why now, and why does this matter beyond a few gas savings?

## The 80-year anomaly

Every major instruction set in the history of computing has explicit call and return instructions.

1833: Charles Babbage's Analytical Engine used punched cards to encode control flow, including conditional operations. The mechanism for breaking execution into discrete, reusable sequences was present from the beginning of programmable machines.

1843: Ada Lovelace's algorithm for computing Bernoulli numbers, the first complete program written for a computing machine, contains implicit call/return structure. Subroutine boundaries were part of how programs were organized before modern hardware existed.

1946: Turing's ACE design formalizes the call stack. Return addresses are saved on subroutine invocation; execution resumes at the saved point. This is not a convenience. It is the mechanism that makes programs analyzable: you can trace what a subroutine does without knowing who called it or what state surrounded the call.

1978 onward: x86 gets `CALL`/`RET`. The JVM has `invokevirtual`/`return`. WebAssembly has `call`/`return_call`. The .NET CLI has `call`/`ret`. Every industrial-strength virtual machine restricts or forbids dynamic jumps precisely because of what their absence costs downstream tools.

**2015:** The EVM ships with `JUMP` and `JUMPI`. No call instruction for internal function dispatch. No return instruction that pops a return stack. Compilers synthesize function calls as `PUSH <destination>` followed by `JUMP`. The EVM executes this correctly. No other production virtual machine in computing history has taken this approach and stayed with it.

EIP-8173 is direct about it: the EVM is the anomaly, not industry best practice.

EIP-615 tried to fix this in 2016. It proposed subroutines and would have restricted dynamic jumps, including a 178-line C++ validator. It stalled. The theoretical arguments for static control flow were not wrong in 2016; they were not yet financially measurable. That changed when ZK rollup proving teams started billing for compute hours and found their hotspot was control flow analysis, not hash functions or elliptic curve multiplications.

## Why the dynamic JUMP is a structural problem

A Control Flow Graph maps instruction blocks to control transfer edges. You need one before you can do almost anything useful with bytecode: formal verification, JIT compilation, ZK circuit construction, fraud proof generation, static security analysis.

For a static jump, CFG construction is trivial: one edge, one destination. For a dynamic jump, the destination is whatever value happens to be on the stack at runtime. The analysis must consider every value that could reach that jump site across every possible execution path. For a contract of N basic blocks where any block might jump to any other, the number of possible CFG edges is O(N²).

EIP-8173 cites multiple academic works that have independently arrived at the same conclusion about EVM bytecode analysis:<sup>[1](#fn-1)</sup>

- Static analysis of EVM bytecode is "challenging and error-prone" due to dynamic jump resolution
- Dynamic jump patterns create "significant obstacles" to automated reasoning about contract behavior
- Function identification in EVM bytecode is harder than in other bytecodes because the format lacks "internal function call statements" to guide reconstruction

These are not theoretical worst cases. Solidity compiles internal function calls as `PUSH`+`JUMP` patterns. Any large Solidity contract with many internal functions produces exactly the pattern that triggers quadratic CFG construction. As EIP-8173 puts it: "building and traversing a dynamic control flow graph can take quadratic space and time."<sup>[1](#fn-1)</sup>

The MAGIC validation framework in EIP-7979 solves this by running at `CREATE` time. A one-time linear-time check at deployment makes every subsequent analysis, proof generation, and trace reconstruction linear as well. The deployer pays once; the entire ecosystem benefits on every future execution.<sup>[3](#fn-3)</sup>

## What static control flow unlocks, layer by layer

EIP-8173's scope is wider than ZK provers. Here is what each layer of the stack gains.

### ZK rollups

ZK proof systems encode EVM execution as polynomial circuits. Circuit construction requires a complete, sound CFG. A dynamic jump forces the circuit builder to encode a case analysis over all possible destination values, producing circuits that grow quadratically with program complexity.

With static control flow, the CFG is known at deployment. Circuit construction is linear. Parallelization becomes possible: independent execution segments can be proved concurrently rather than sequentially.

The concrete benchmarks, from Succinct's EOF comparison work:<sup>[4](#fn-4)</sup>

| Metric | Improvement with static control flow |
|--------|--------------------------------------|
| Interpreter cycle consumption | 3x fewer cycles |
| End-to-end proving speed | 2.69x faster |
| STARK proof size | 50% smaller |
| Dynamic SRL opcode usage | 96.64% reduction |

For L2 operators, smaller proofs mean lower L1 blob costs and faster finality. The 50% STARK proof size reduction cuts the on-chain data footprint in half for equivalent computation.

### Optimistic rollups

Fraud proofs require constructing a valid execution trace of a disputed transaction and running it through a bisection game. Static control flow enables linear-time bytecode validation at deployment, establishing provable safety properties before a contract can be disputed. The bisection protocol machinery becomes cleaner because the execution model is fully specified before execution begins rather than being resolved during multi-round interactive verification.

### JIT and AOT compilation

Non-ZK L2 node operators also benefit. Static control flow allows EVM bytecode to be compiled ahead-of-time to native machine code through a linear pass. Without it, dynamic jump resolution forces partial compilation or runtime interpretation for non-statically-analyzable segments. Every L2 execution client, zkEVM or not, running on server hardware benefits from AOT-compiled contract execution.

### RISC-V migration

Ethereum research is actively exploring replacing the EVM interpreter with a RISC-V target, where EVM bytecode would be compiled to RISC-V instructions for direct CPU execution. [EIP-7937 (EVM64)](https://eips.ethereum.org/EIPS/eip-7937) addresses the mismatch between EVM's 256-bit arithmetic and RISC-V's 64-bit registers.<sup>[5](#fn-5)</sup>

EIP-8173 states the prerequisite explicitly: "With static control flow, EVM code compiles directly to RISC-V code in linear time."<sup>[1](#fn-1)</sup>

Without static control flow, the dynamic jump resolution problem must be solved at translation time. The translator must enumerate possible destinations, insert conditional branches for each, and reconstruct the call graph from heuristics. The single-pass linear-time compilation that makes RISC-V attractive becomes non-linear in the general case. Static control flow is not one benefit of the RISC-V migration path. It is a precondition for the most efficient form of it.

## The fix, briefly

[EIP-7979](https://eips.ethereum.org/EIPS/eip-7979) introduces `CALLSUB`, `ENTERSUB`, and `RETURNSUB`.<sup>[3](#fn-3)</sup> The return address is stored on a separate return stack, not accessible to EVM code, which prevents control flow integrity attacks and eliminates the data/return stack confusion that `PUSH`+`JUMP` creates. [EIP-8013](https://eips.ethereum.org/EIPS/eip-8013) extends this with five relative-addressed variants that encode destinations in the bytecode itself rather than on the stack.<sup>[6](#fn-6)</sup>

| Opcode | Gas | Destination type | CFG complexity |
|--------|-----|-----------------|----------------|
| `JUMP` | 8 | Stack (runtime) | O(N²) |
| `CALLSUB` | 8 | Stack (validated at CREATE) | O(N) |
| `RJUMP` | 2 | Bytecode offset | O(N) |
| `RJUMPSUB` | 5 | Bytecode offset | O(N) |

The gas savings are concrete: `RJUMP` costs 2 gas versus `JUMP`'s 8, and eliminating `JUMPDEST` markers saves 200 gas per destination at deployment. For the full opcode mechanics, MAGIC validation algorithm, and the `SQUARE` benchmark showing 32% code size reduction and 30% gas reduction per function call, see [The EVM Has No Subroutines. Here's Why That's a ZK Problem, and the Fix](/blog/eip-7979-evm-subroutines-zk-control-flow).

## What it means for call trace decoding

Block explorers reconstruct internal call trees from execution traces. For legacy bytecode, that means heuristic pattern matching: identify `PUSH`+`JUMP` sequences, infer subroutine boundaries, cross-reference with source maps and compiler debug info. The inference works for well-behaved compiler output but breaks on hand-crafted bytecode and fails when call targets are computed dynamically.

With `CALLSUB` and `RJUMPSUB`, the call graph is statically known from the bytecode before execution. Ethernal's decoded call traces and internal function views work on explicit structure rather than runtime inference. In contracts that use EIP-7979 or EIP-8013, `ENTERSUB` markers map directly to function entry points: decoding is a read, not a reconstruction.

## The rarity of a "why" document

The EIP process produces specifications. It occasionally produces informational EIPs that describe existing practices. Rarely does it produce a document that argues: here is why a 10-year-old design decision was wrong, and here is the 80-year arc of computing history that makes the case.

EIP-8173 is that document. The argument has been available since 2016. What changed is that the cost of the EVM's missing call/return mechanism became financially measurable , in ZK proving costs, L2 finality latency, and compiler efficiency. The theoretical case became an operational one.

The question is no longer whether static control flow comes to the EVM. It is which combination of EIP-615, EIP-4750, EIP-7979, and EIP-8013 carries it in, and which hard fork window gets the consensus needed to ship it.

For more on the specific opcodes and validation mechanics, see [The EVM Has No Subroutines. Here's Why That's a ZK Problem, and the Fix](/blog/eip-7979-evm-subroutines-zk-control-flow). For state healing improvements coming in the same upgrade window, see [The Sync That Never Finishes: How snap/2 Replaces Trie Healing](/blog/eip-8189-snap2-state-healing).

---

## FAQ

### What is EIP-8173?

EIP-8173 is an Informational EIP authored by Greg Colvin that makes the historical and theoretical case for adding static control flow to the EVM. It does not introduce opcodes itself; it serves as the foundation document for EIP-615, EIP-4750, EIP-7979, and EIP-8013, explaining why the EVM's reliance on dynamic jumps is an 80-year regression from standard computing practice.

### Why does the EVM use dynamic jumps instead of CALL/RET?

The EVM was designed in 2015 with a minimalist instruction set. Internal function calls were delegated to compilers rather than the VM itself: Solidity emits `PUSH <destination>` followed by `JUMP`, managing return addresses on the data stack. This was a deliberate simplicity choice. The cost, measured in quadratic CFG analysis for ZK provers, JIT compilers, and formal verification tools, was not visible at 2015 deployment scale.

### Is EIP-8173 assigned to a specific hard fork?

As of June 2026, EIP-8173 is Draft status with no assigned hard fork. The EIPs it motivates, primarily EIP-7979 and EIP-8013, are also Draft. Glamsterdam (H1 2026) focuses on EIP-7928 and EIP-7732. Static control flow EIPs are realistic candidates for a post-Hegota upgrade window.

### How does EIP-8173 relate to EIP-7979?

EIP-7979 proposes the specific opcodes (`CALLSUB`, `ENTERSUB`, `RETURNSUB`) and the MAGIC validation framework. EIP-8173 is the companion document explaining why those opcodes matter across ZK provers, optimistic rollups, JIT compilers, and the RISC-V migration path. EIP-7979 is the what; EIP-8173 is the why.

### Does EIP-8173 affect existing deployed contracts?

No. EIP-8173 is an informational document and introduces no protocol changes itself. The EIPs it motivates, particularly EIP-7979, are fully backwards compatible via opt-in MAGIC validation at contract creation time. Existing bytecode runs unchanged.

---

## References

<span id="fn-1">1.</span> Colvin, Greg. "EIP-8173: Foundations of EVM Control Flow." _Ethereum Improvement Proposals_, March 2026. [https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md](https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md)

<span id="fn-2">2.</span> Colvin, Greg, Zelenka, Brooklyn, Bylica, Paweł, and Reitwiessner, Christian. "EIP-615: Subroutines and Static Jumps for the EVM." _Ethereum Improvement Proposals_, December 2016. [https://eips.ethereum.org/EIPS/eip-615](https://eips.ethereum.org/EIPS/eip-615)

<span id="fn-3">3.</span> Colvin, Greg. "EIP-7979: Call and Return Opcodes for the EVM." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7979](https://eips.ethereum.org/EIPS/eip-7979)

<span id="fn-4">4.</span> Succinct Labs. "Benefits of EOF for Zero-Knowledge Proofs." _Succinct Blog_, 2025. [https://blog.succinct.xyz/learn/eofbenefits/](https://blog.succinct.xyz/learn/eofbenefits/)

<span id="fn-5">5.</span> "EIP-7937: EVM64." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-7937](https://eips.ethereum.org/EIPS/eip-7937)

<span id="fn-6">6.</span> "EIP-8013: Static Relative Jumps and Calls." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-8013](https://eips.ethereum.org/EIPS/eip-8013)

<span id="fn-7">7.</span> Ethereum Improvement Proposals. "PR #11368: Update EIP-7979, EIP-xxxx to EIP-8173." _GitHub_, March 5, 2026. [https://github.com/ethereum/EIPs/pull/11368](https://github.com/ethereum/EIPs/pull/11368)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is EIP-8173?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-8173 is an Informational EIP authored by Greg Colvin that makes the historical and theoretical case for adding static control flow to the EVM. It does not introduce opcodes itself; it serves as the foundation document for EIP-615, EIP-4750, EIP-7979, and EIP-8013, explaining why the EVM's reliance on dynamic jumps is an 80-year regression from standard computing practice."
      }
    },
    {
      "@type": "Question",
      "name": "Why does the EVM use dynamic jumps instead of CALL/RET?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The EVM was designed in 2015 with a minimalist instruction set. Internal function calls were delegated to compilers rather than the VM itself: Solidity emits PUSH followed by JUMP, managing return addresses on the data stack. This was a deliberate simplicity choice whose cost in ZK proving complexity and JIT compiler efficiency was not visible at 2015 deployment scale."
      }
    },
    {
      "@type": "Question",
      "name": "Is EIP-8173 assigned to a specific hard fork?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "As of June 2026, EIP-8173 is Draft status with no assigned hard fork. The EIPs it motivates, primarily EIP-7979 and EIP-8013, are also Draft. Static control flow EIPs are realistic candidates for a post-Hegota upgrade window."
      }
    },
    {
      "@type": "Question",
      "name": "How does EIP-8173 relate to EIP-7979?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-7979 proposes the specific opcodes (CALLSUB, ENTERSUB, RETURNSUB) and the MAGIC validation framework. EIP-8173 is the companion document explaining why those opcodes matter across ZK provers, optimistic rollups, JIT compilers, and the RISC-V migration path. EIP-7979 is the what; EIP-8173 is the why."
      }
    },
    {
      "@type": "Question",
      "name": "Does EIP-8173 affect existing deployed contracts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. EIP-8173 is an informational document and introduces no protocol changes itself. The EIPs it motivates, particularly EIP-7979, are fully backwards compatible via opt-in MAGIC validation at contract creation time. Existing bytecode runs unchanged."
      }
    }
  ]
}
</script>
