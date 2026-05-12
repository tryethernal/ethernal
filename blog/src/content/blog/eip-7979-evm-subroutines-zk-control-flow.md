---
title: "The EVM Has No Subroutines. Here's Why That's a ZK Problem, and the Fix"
description: "EIP-7979 adds CALLSUB/ENTERSUB/RETURNSUB to the EVM. Three opcodes that cut ZK proof size 50% and solve a quadratic control flow problem from 2015."
date: 2026-05-12
tags:
  - EIP-7979
  - ZK
  - Ethereum
  - EVM
  - L2
image: "/blog/images/eip-7979-evm-subroutines-zk-control-flow.png"
ogImage: "/blog/images/eip-7979-evm-subroutines-zk-control-flow-og.png"
status: published
readingTime: 7
---

A ZK-rollup proving team runs a benchmark. Same logic. Two bytecode variants: legacy EVM versus EOF-style static control flow. The legacy version burns three times more compute cycles during proof generation. The prover's hotspot is not the hash function or the elliptic curve multiplication. It is the control flow analysis.

The EVM has never had a native subroutine concept. Every function call since 2015 has been synthesized from a `PUSH` (destination address) followed by a `JUMP`. The EVM executes. Analysis tools, ZK provers, JIT compilers: their job is to understand what the code does. And the dynamic `JUMP` makes that understanding quadratically hard.

[EIP-7979](https://eips.ethereum.org/EIPS/eip-7979) proposes three new opcodes to fix this.<sup>[1](#fn-1)</sup> [EIP-8173](https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md) is the accompanying theoretical treatise explaining why it matters.<sup>[2](#fn-2)</sup> The fix has been attempted before. [EIP-615](https://eips.ethereum.org/EIPS/eip-615) proposed it in 2016 and stalled.<sup>[3](#fn-3)</sup> Here is what has changed.

## The EVM's missing abstraction

Every programming system since Turing's ACE (1945) has explicit call and return instructions. x86 has `CALL`/`RET`. The JVM has `invokevirtual`/`return`. WebAssembly has `call`/`return_call`. These are not conveniences. They are what make programs analyzable.

The EVM launched in 2015 with only `JUMP` and `JUMPI` (conditional jump). There is no `CALLSUB` equivalent for internal subroutine invocation. The `CALL` opcode exists, but it dispatches cross-contract message calls, an entirely different mechanism that spins up a new execution context, carries value and calldata, and pays its own gas.

Internal function calls (the kind Solidity emits hundreds of times in a typical contract) are synthesized by compilers as:

```
; Calling a subroutine at 0x3A8 (legacy bytecode)
PUSH2 0x03A8   ; push destination
JUMP           ; jump there
; ... at the call site, the return address is also pushed on the data stack
; ... and another JUMP at the end sends execution back
```

The EVM sees none of this structure. From its perspective, the bytecode is just "jump to some value on the stack." The destination is a runtime quantity. The EVM has no concept of a call boundary, a return point, or a subroutine.

Java, WebAssembly, and .NET prohibit or restrict dynamic jumps precisely because of what this invisibility costs downstream tools.<sup>[2](#fn-2)</sup>

## Why dynamic JUMP creates quadratic complexity

A Control Flow Graph (CFG) models all possible execution paths through a program. Each node is a basic block , a straight-line sequence of instructions. Each edge is a control transfer between blocks.

For a static jump, the analysis is trivial: `JUMP 0x3A8` adds exactly one outgoing edge from the current block.

For a dynamic jump, the destination is whatever value happens to be on the stack at runtime. The analysis must consider every value that could be on the stack at that point , which means tracing every possible path through the program that could have put a value there. For a program of N basic blocks where any block might jump to any other, the CFG can have O(N²) possible edges.

As EIP-8173 states directly: "building and traversing a dynamic control flow graph can take quadratic space and time."<sup>[2](#fn-2)</sup>

This is not a theoretical worst case. It is the practical reality of Solidity-compiled contracts. An attacker can construct bytecode that forces bytecode analyzers, formal verification tools, and JIT compilers to hit this wall , a DoS vector that grows with contract size. Legitimate contracts do it too: large Solidity files with many internal functions generate exactly this pattern.

The MAGIC validation framework in EIP-7979 solves this by running at `CREATE` time. When a contract opts into validation (via the `0xEF` magic prefix), the validator checks that all `JUMP` destinations are statically known before the bytecode ever executes. That one-time linear-time check at deployment eliminates quadratic analysis for every subsequent execution, proof generation, and trace reconstruction.

## Why ZK provers feel this most

ZK proof systems encode EVM execution as polynomial circuits. Circuit construction requires a complete, sound CFG , every possible execution path must be represented. A dynamic jump forces the circuit builder to encode a case analysis: "if stack value is X, execution goes to A; if Y, it goes to B; for all possible values..." For large contracts with many internal functions, this produces circuits that are exponentially larger than the logical program requires.

The concrete cost is documented by Succinct's benchmarks comparing EOF-style static control flow against legacy bytecode:<sup>[4](#fn-4)</sup>

| Metric | Improvement |
|--------|-------------|
| Interpreter cycle consumption | 3x fewer cycles |
| End-to-end proving speed | 2.69x faster |
| STARK proof size | 50% smaller |
| Gas cost on-chain | 16.08% less |
| Dynamic SRL opcode usage | 96.64% reduction (46,680 → 1,570 instances) |

For L2 operators, the chain of effects is direct: smaller proofs mean lower L1 blob costs and faster finality. The 50% reduction in STARK proof size alone cuts the on-chain data footprint in half for equivalent computation.

There is also a longer-horizon implication. The RISC-V migration path for zkEVMs , where the EVM interpreter is replaced entirely by a RISC-V target , requires compiling EVM bytecode to RISC-V in linear time. Static control flow is a precondition. Dynamic jumps make that compilation non-linear in the general case.

## EIP-7979: three opcodes

[EIP-7979](https://eips.ethereum.org/EIPS/eip-7979) introduces the EVM's first native subroutine mechanism, authored by Greg Colvin , a longtime Ethereum core developer who first proposed this direction in 2016.<sup>[1](#fn-1)</sup> The design is deliberately minimal.

Three new opcodes:

| Opcode | Gas | Function |
|--------|-----|----------|
| `CALLSUB` | 8 | Pops destination from stack, pushes PC+1 to the **return stack**, jumps to destination |
| `ENTERSUB` | 1 | Labels a valid `CALLSUB` destination (like `JUMPDEST`) |
| `RETURNSUB` | 5 | Pops the return stack into PC; returns to caller |

The key architectural detail is the separate return stack. The data stack holds values. The return stack holds return addresses set by `CALLSUB` and consumed by `RETURNSUB`. This mirrors every real-world architecture: x86, VAX, the JVM. Without a separate return stack, return addresses mix with data and the quadratic analysis problem returns.

A simple subroutine in the new model:

```
; Subroutine definition
ENTERSUB        ; marks valid entry point
DUP1            ; square the argument
MUL
RETURNSUB       ; return to caller

; Call site
PUSH2 <dest>    ; push ENTERSUB address
CALLSUB         ; call it; return address auto-pushed to return stack
                ; result now on data stack
```

Compare to legacy bytecode, which encodes the same logic with explicit return address management on the data stack. The EIP's `SQUARE` benchmark: 18 bytes and 49 gas for the JUMP-based version; 13 bytes and 38 gas for the `CALLSUB` version. That is a 32% code size reduction and a 30% gas reduction for one small function. The savings compound across real contracts.

The MAGIC validation prefix (`0xEF...`) triggers compile-time validation at `CREATE`. Validated code must satisfy five invariants:

1. All opcodes are valid and not deprecated
2. `JUMP`/`JUMPI` targets must be `JUMPDEST` instructions, preceded by a `PUSH`
3. `CALLSUB` targets must be `ENTERSUB` instructions, preceded by a `PUSH`
4. Data and return stacks remain within bounds (1–1024 items)
5. Stack depth is constant across all paths per subroutine , the stack pointer difference between `CALLSUB` and `RETURNSUB` is invariant

Validation runs in linear time and space. Backwards compatibility is preserved: old bytecode runs unchanged. MAGIC validation is opt-in at contract creation.

One misconception worth clearing up: `CALLSUB` is not related to `CALL`. `CALL` dispatches a cross-contract message call with its own execution context, value transfer, and gas accounting. `CALLSUB` is a within-contract subroutine jump. Different mechanism, different purpose, different gas model.

## EIP-8013: relative jumps complete the picture

[EIP-8013](https://eips.ethereum.org/EIPS/eip-8013) extends EIP-7979 with five relative-addressed jump opcodes.<sup>[5](#fn-5)</sup> Where EIP-7979's `CALLSUB` still pushes an absolute destination address from the stack, EIP-8013's opcodes encode the destination as a 16-bit signed offset in the bytecode itself , no stack operand needed, no `ENTERSUB` target required.

| Opcode | Gas | Description |
|--------|-----|-------------|
| `RJUMP` | 2 | Unconditional relative jump (±32,767 bytes) |
| `RJUMPI` | 4 | Conditional relative jump |
| `RJUMPV` | 4 | Jump table variant |
| `RJUMPSUB` | 5 | Relative subroutine call (pushes return address to return stack) |
| `RJUMPSUBV` | 5 | Table-based subroutine call |

Relative addressing means position-independent code: bytecode can be relocated, injected, or inlined without recalculating absolute addresses. No `JUMPDEST` markers at destinations, which saves deployment gas. `RJUMPSUB` and `RJUMPSUBV` destinations must still target `ENTERSUB` instructions from EIP-7979, so the validation guarantee holds.

EIP-8013 explicitly requires EIP-7979 and extends its validation algorithm. The two EIPs form a coherent unit: EIP-7979 provides the foundation (separate return stack, validation framework, subroutine semantics), EIP-8013 adds the ergonomics (relative addressing, jump tables, position independence).

## Ten years of attempting this

Static subroutines for the EVM have been proposed and stalled repeatedly:

**EIP-615 (December 2016):** Greg Colvin, Brooklyn Zelenka, Paweł Bylica, and Christian Reitwiessner proposed subroutines plus static jumps , and would have disallowed dynamic `JUMP` entirely. The proposal included a 178-line C++ validator. It stalled. The changes were too sweeping for consensus at the time.<sup>[3](#fn-3)</sup>

**EIP-3779 (2021):** Safer control flow for the EVM. Incremental approach, stalled.

**EIP-4573 (2022):** Procedures for the EVM , EIP-615 refactored. Did not advance.

**EIP-4750 (2022):** EOF functions (`CALLF`/`RETF`), bundled inside the EVM Object Format container. Reached Pectra's inclusion list before being dropped when EOF was descoped. `CALLF`/`RETF` remain the EOF-specific function mechanism; EIP-7979 is independent of the EOF container format.

**EIP-7979 (2024–2026):** The minimal three-opcode approach with MAGIC opt-in. EIP-8173 written as the theoretical foundation document.

What changed between 2016 and now: ZK rollup growth turned the proof complexity argument from theoretical to operational. Proving teams are running production systems where dynamic jump analysis is a measurable cost. The benchmarks are real. The argument for static control flow no longer needs to be made abstractly.

## Current status and what to watch

Neither EIP-7979 nor EIP-8013 is assigned to a hard fork. Glamsterdam (targeting H1 2026) focuses on EIP-7928 (Block-Level Access Lists) and EIP-7732 (ePBS). Hegota (H2 2026) targets FOCIL and Account Abstraction. Static control flow is a post-Hegota candidate at the earliest.

The adoption path is gradual by design. MAGIC is opt-in at contract creation. Compilers (Solidity, Vyper) can add a target that emits MAGIC-validated bytecode with `CALLSUB`/`ENTERSUB`/`RETURNSUB` instructions. ZK toolchains can then optimize specifically for MAGIC-validated code. The ecosystem shifts without breaking anything.

If you are building a bytecode analyzer, ZK circuit builder, or JIT compiler today, EIP-8173 is worth reading in full as a reference document. Colvin's historical arc , from Babbage's 1833 Analytical Engine through Ada Lovelace's programming notes to Turing's ACE to the EVM , makes a clean case for why call/return is not a convenience but a fundamental correctness primitive.<sup>[2](#fn-2)</sup>

Block explorers sit downstream of all of this. Ethernal reconstructs call trees from execution traces. For legacy bytecode, that means heuristic pattern matching: find the `PUSH`+`JUMP` sequences, infer subroutine boundaries, hope the compiler behaved predictably. For MAGIC-validated contracts, `CALLSUB` marks entry and `RETURNSUB` marks exit. The structure is explicit. Trace reconstruction becomes a deterministic read rather than an inference problem.

That is what static control flow buys: not just faster proofs. Analyzability. The ability to know what a program does by reading it, not by running it and watching what happens.

## FAQ

### What is EIP-7979?

EIP-7979 adds three opcodes to the EVM , `CALLSUB`, `ENTERSUB`, and `RETURNSUB` , that introduce native subroutine semantics. It includes an opt-in MAGIC validation framework that verifies static control flow at contract creation time, eliminating the need for runtime dynamic jump analysis.

### How does EIP-7979 differ from EIP-4750 (EOF functions)?

EIP-4750 (`CALLF`/`RETF`) is the EVM Object Format's function mechanism and requires the full EOF container format. EIP-7979 is independent of EOF , it uses a MAGIC prefix for opt-in validation but does not require the EOF container. Both provide static subroutine semantics; they differ in their deployment model and the surrounding format constraints.

### Does EIP-7979 remove dynamic JUMPs?

No. EIP-7979 is fully backwards compatible. Existing `JUMP` and `JUMPI` instructions remain valid. MAGIC validation only applies to contracts that opt in via the `0xEF` prefix at creation time. Legacy bytecode runs unchanged.

### When will EIP-7979 be included in a hard fork?

As of May 2026, EIP-7979 and EIP-8013 are both Draft status with no assigned hard fork. Glamsterdam (H1 2026) focuses on EIP-7928 and EIP-7732. The earliest realistic inclusion window is a post-Hegota upgrade.

### Why does static control flow matter for ZK rollups?

ZK proof systems must encode every possible execution path as polynomial circuit constraints. Dynamic jumps force the circuit builder to enumerate all possible destination values , producing circuits that grow quadratically with program size. Static control flow produces deterministic execution traces with linear circuit construction, cutting proving time by roughly 2.69x and STARK proof size by 50% based on Succinct's EOF benchmarks.

---

## References

<span id="fn-1">1.</span> Colvin, Greg. "EIP-7979: Call and Return Opcodes for the EVM." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7979](https://eips.ethereum.org/EIPS/eip-7979)

<span id="fn-2">2.</span> Colvin, Greg. "EIP-8173: Foundations of EVM Control Flow." _Ethereum Improvement Proposals_, March 2026. [https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md](https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-8173.md)

<span id="fn-3">3.</span> Colvin, Greg, Zelenka, Brooklyn, Bylica, Paweł, and Reitwiessner, Christian. "EIP-615: Subroutines and Static Jumps for the EVM." _Ethereum Improvement Proposals_, December 2016. [https://eips.ethereum.org/EIPS/eip-615](https://eips.ethereum.org/EIPS/eip-615)

<span id="fn-4">4.</span> Succinct Labs. "Benefits of EOF for Zero-Knowledge Proofs." _Succinct Blog_, 2025. [https://blog.succinct.xyz/learn/eofbenefits/](https://blog.succinct.xyz/learn/eofbenefits/)

<span id="fn-5">5.</span> "EIP-8013: Static Relative Jumps and Calls." _Ethereum Improvement Proposals_, 2025. [https://eips.ethereum.org/EIPS/eip-8013](https://eips.ethereum.org/EIPS/eip-8013)

<span id="fn-6">6.</span> Ethereum Improvement Proposals. "PR #11368: Update EIP-7979 , EIP-xxxx → EIP-8173." _GitHub_, March 5, 2026. [https://github.com/ethereum/EIPs/pull/11368](https://github.com/ethereum/EIPs/pull/11368)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is EIP-7979?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-7979 adds three opcodes to the EVM , CALLSUB, ENTERSUB, and RETURNSUB , that introduce native subroutine semantics. It includes an opt-in MAGIC validation framework that verifies static control flow at contract creation time, eliminating the need for runtime dynamic jump analysis."
      }
    },
    {
      "@type": "Question",
      "name": "How does EIP-7979 differ from EIP-4750 (EOF functions)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "EIP-4750 (CALLF/RETF) is the EVM Object Format's function mechanism and requires the full EOF container format. EIP-7979 is independent of EOF , it uses a MAGIC prefix for opt-in validation but does not require the EOF container. Both provide static subroutine semantics; they differ in their deployment model and surrounding format constraints."
      }
    },
    {
      "@type": "Question",
      "name": "Does EIP-7979 remove dynamic JUMPs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. EIP-7979 is fully backwards compatible. Existing JUMP and JUMPI instructions remain valid. MAGIC validation only applies to contracts that opt in via the 0xEF prefix at creation time. Legacy bytecode runs unchanged."
      }
    },
    {
      "@type": "Question",
      "name": "When will EIP-7979 be included in a hard fork?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "As of May 2026, EIP-7979 and EIP-8013 are both Draft status with no assigned hard fork. Glamsterdam (H1 2026) focuses on EIP-7928 and EIP-7732. The earliest realistic inclusion window is a post-Hegota upgrade."
      }
    },
    {
      "@type": "Question",
      "name": "Why does static control flow matter for ZK rollups?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ZK proof systems must encode every possible execution path as polynomial circuit constraints. Dynamic jumps force the circuit builder to enumerate all possible destination values, producing circuits that grow quadratically with program size. Static control flow produces deterministic execution traces with linear circuit construction, cutting proving time by roughly 2.69x and STARK proof size by 50% based on Succinct's EOF benchmarks."
      }
    }
  ]
}
</script>
