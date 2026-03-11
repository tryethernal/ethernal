---
title: "EVM Opcodes 101: What Happens When You Send a Transaction"
description: "EVM opcodes are the low-level instructions behind every Ethereum transaction. Learn how the stack, memory, and storage work, where gas costs come from, and how to debug failed transactions."
image: "/blog/images/evm-opcodes-101.png"
tags:
  - EVM
  - Ethereum
  - Smart Contracts
  - Developer Education
date: 2026-03-12
status: published
readingTime: 8
---

A developer ships a token swap function. Works perfectly in testing. On mainnet, it burns $47 in gas for what should be a $3 operation. The culprit? An `SSTORE` inside a loop, writing to cold storage on every iteration instead of caching in memory first. Fifteen lines of Solidity, and the most expensive one is invisible unless you know where to look. Understanding opcodes turns that mystery into arithmetic.

EVM opcodes are the low-level, single-byte instructions that the Ethereum Virtual Machine executes. Every Solidity function compiles down to a sequence of these roughly 140 opcodes, covering arithmetic, memory access, persistent storage, and control flow. They're the layer where gas costs are actually determined and where failed transactions can be debugged.

## Your transaction's journey before a single opcode fires

Before the EVM touches your transaction, it goes through a gauntlet of validation checks.

Your wallet packs the transaction using RLP serialization<sup>[1](#fn-1)</sup>, Ethereum's compact binary format. Recipient, value, calldata, gas limit, nonce: everything compressed into a byte stream, then signed with your private key using ECDSA<sup>[2](#fn-2)</sup>.

The signed transaction hits the mempool. A validator pulls it out and runs three checks:

- **Nonce**: does it match your next expected nonce? One ahead or behind, and it's rejected or queued.
- **Signature recovery**: does ECDSA produce an address with enough ETH to cover `gas limit * gas price + value`?
- **Intrinsic gas floor**: every transaction costs at least 21,000 gas before a single opcode runs. Contract creation costs 32,000. Each calldata byte adds 4 gas (zero bytes) or 16 gas (non-zero), as defined in the Yellow Paper<sup>[3](#fn-3)</sup>.

Here's what catches people off guard: gas is deducted *before* execution starts. Your full `gas limit * gas price` is gone from your balance the moment execution begins. You get the unused portion back, but only after. Think of it as a security deposit, not a running meter.

## Three scratch pads: the EVM's workspace

The EVM sets up an execution context, essentially a tiny sandboxed computer with three memory regions. Each has different rules, different lifetimes, and wildly different costs. Understanding the difference is half of understanding gas.

**The stack** is a calculator's display. Last-in, first-out, up to 1,024 items, each 32 bytes. Every opcode reads from and writes to the stack. It starts empty, costs almost nothing, and vanishes when the call ends.

**Memory** is a whiteboard. A linear byte array, all zeros at the start, that grows as you need it. Write whatever you want, erase it when you're done. Cheap at first, but expansion costs scale quadratically, like a parking garage that doubles its rate with every floor.

**Storage** is carved in stone. A key-value store mapping 256-bit slots to 256-bit values, backed by a Merkle Patricia Trie<sup>[4](#fn-4)</sup> that every node on the network maintains. It persists between transactions. It's the *only* thing that persists. And it costs 4,000x more than basic computation.

Program counter starts at zero. Bytecode loads. Execution begins.

What does bytecode look like? Take a dead-simple Solidity function:

```solidity
contract Store {
    uint256 public value;

    function set(uint256 _value) public {
        value = _value;
    }
}
```

That `set` function compiles to essentially two instructions:

```
PUSH1 0x00   // Push storage slot 0
SSTORE       // Store the input value there
```

Two opcodes. That's the whole function at the machine level. Everything else, the function selector, the calldata decoding, the stack shuffling, is boilerplate the compiler generates around it.

## The opcodes that matter

There are about 140 opcodes<sup>[5](#fn-5)</sup>. You don't need to memorize them. But knowing five categories explains 95% of what you'll see in a transaction trace.

### Arithmetic: the penny aisle

`ADD` pops two stack values, pushes their sum. `MUL` multiplies. `LT`, `GT`, `EQ` handle comparisons. Cost: 3 to 5 gas each. Ten arithmetic opcodes cost about 40 gas total. If someone tells you to "optimize your math," they're chasing pennies.

### Stack operations: the plumbing

`PUSH1` through `PUSH32` load constants onto the stack. `DUP1` clones the top value. `SWAP1` flips the top two. All 3 gas. These are the only opcodes that read directly from bytecode instead of the stack, and they're everywhere: a typical function has more `PUSH` instructions than anything else.

### Memory: cheap until it isn't

`MLOAD` reads 32 bytes from a memory offset. `MSTORE` writes 32 bytes. Base cost: 3 gas. But touch a new offset and you pay expansion:

```
cost = (memory_size_words² / 512) + (3 * memory_size_words)
```

That squared term is the key. Your first few kilobytes of memory cost almost nothing. Push into hundreds of kilobytes and each expansion costs more than the last. It's why Solidity won't let you copy a large storage array into memory without warning you about gas.

### Storage: where the real money goes

`SLOAD` reads from storage. `SSTORE` writes. This is where gas costs stop being theoretical.

| Operation | Gas cost | Context |
|-----------|----------|---------|
| `SLOAD` (cold) | 2,100 | First access, disk lookup required |
| `SLOAD` (warm) | 100 | Subsequent access, cached |
| `SSTORE` (zero to non-zero) | 20,000 | Creating new state |
| `SSTORE` (non-zero to non-zero) | 5,000 | Updating existing state |

That 20,000 gas for a new `SSTORE` is not a typo. Writing a single 32-byte value to storage costs almost as much gas as the intrinsic cost of the entire transaction (21,000). The reason is straightforward: that value will be stored by every full node on the network, indefinitely<sup>[7](#fn-7)</sup>. You're not renting space. You're buying permanent real estate on thousands of hard drives.

**Cold vs warm** is a concept from EIP-2929<sup>[6](#fn-6)</sup>, proposed by Vitalik and Martin Swende to align gas prices with actual I/O costs. First access to a storage slot requires a trie traversal (disk I/O), so it costs 2,100. After that, the slot sits in a warm cache: 100 gas. This single distinction explains why access lists can save you gas on complex transactions, and why the order you touch storage slots can matter more than the logic itself.

### Control flow: the wiring

`JUMP` repositions the program counter. `JUMPI` does it conditionally. This is how `if/else` and loops work at the bytecode level. `JUMPDEST` marks valid landing spots, a guardrail that prevents jumping into the middle of a `PUSH` instruction's data<sup>[3](#fn-3)</sup>.

`CALL` invokes another contract. `CREATE` deploys one. `RETURN` ends execution and returns data. `REVERT` does the same but rolls back every state change.

| Opcode | Hex | Gas | What it does |
|--------|-----|-----|-------------|
| `ADD` | 0x01 | 3 | Addition |
| `MUL` | 0x02 | 5 | Multiplication |
| `EQ` | 0x14 | 3 | Equality check |
| `PUSH1` | 0x60 | 3 | Push 1 byte onto stack |
| `MLOAD` | 0x51 | 3* | Read from memory |
| `MSTORE` | 0x52 | 3* | Write to memory |
| `SLOAD` | 0x54 | 2,100/100 | Read from storage |
| `SSTORE` | 0x55 | 20,000/5,000 | Write to storage |
| `JUMP` | 0x56 | 8 | Unconditional jump |
| `CALL` | 0xF1 | varies | Call another contract |
| `RETURN` | 0xF3 | 0 | Return output data |
| `REVERT` | 0xFD | 0 | Revert state changes |

*Plus memory expansion cost.

## The gas hierarchy: a mental model

Once you see the numbers, a clear hierarchy emerges:

**Computation** (3-5 gas): pure math, no side effects. Optimize last, if ever.

**Memory** (3 gas + quadratic expansion): your scratch pad. Cheap for small allocations, punishing for large ones. But it's temporary: gone when the call frame ends, so the network carries no long-term cost.

**Storage** (2,100-20,000 gas): the expensive real estate. Permanent, replicated across every node. This is where 80%+ of your gas goes in any state-changing transaction.

This hierarchy gives you one optimization rule that covers most cases: **never touch storage inside a loop**. Read the value into a memory variable, do your work, write back once. You'll save thousands of gas per iteration. That's the difference between the $3 transaction and the $47 one from the opening.

One more thing: since EIP-3529<sup>[8](#fn-8)</sup> (London hard fork), gas refunds for clearing storage are capped at 20% of total gas used. The old gas-token trick, filling storage slots when gas is cheap and clearing them for refunds later, is dead.

## When things go wrong: success vs revert

Execution ends one of two ways, and the difference is night and day for debugging.

**Success**: all state changes commit. Storage writes, balance transfers, new contracts, all permanent. Unused gas returns to the sender.

**Revert or out-of-gas**: everything rolls back. The transaction still appears on-chain (the validator did real work processing it), but none of the state changes stick. The consumed gas is gone.

Here's where the two failure modes diverge. `REVERT` usually carries a reason: a Solidity `require` message or a custom error<sup>[9](#fn-9)</sup>. You get a string telling you what went wrong. Out-of-gas gives you *nothing*. Just "failed." No breadcrumbs, no stack trace, no hint about which opcode drained the last drop of gas.

That's where most developers hit a wall. Something broke somewhere inside the bytecode, and all you have is a transaction hash and an empty error field.

## Transaction traces: the EVM's flight recorder

Everything that happened during execution, every opcode, every storage read, every gas charge, gets captured in a **transaction trace**.

When Transaction X calls Contract A, which calls Contract B, which calls Contract C, which reverts, the trace shows the entire call tree. Function names decoded, parameters visible, return values captured, gas consumption broken down at each level. You can pinpoint the exact opcode where things went sideways.

If you've clicked "Internal Txns" on Etherscan, you've seen a simplified version of this. Full tracing gives you the complete picture: not just *what* was called, but *what it received*, *what it returned*, and *exactly where and why it failed*.

We built [Ethernal](https://www.tryethernal.com/) for exactly this. Connect a local Hardhat or Anvil chain, send a transaction, and get full traces in under a minute. No configuration, no node setup. [Free tier](https://app.tryethernal.com) covers most development workflows.

## Bottom line

EVM opcodes aren't trivia for compiler engineers. They're the actual instructions your users pay for with every transaction, and the layer where gas optimization and debugging actually happen. Stack, memory, storage: three tiers of cost, one clear hierarchy. Master that hierarchy and you'll write cheaper contracts and debug failed transactions in minutes instead of hours.

Deploy something. Send a transaction. Open the trace. Seeing those opcodes fire for your own code is what makes all of this click.

---

## References

<span id="fn-1">1.</span> Ethereum Foundation. "RLP Serialization." _ethereum.org_, 2024. <a href="https://ethereum.org/developers/docs/data-structures-and-encoding/rlp/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-2">2.</span> Ethereum Foundation. "Transactions." _ethereum.org_, 2024. <a href="https://ethereum.org/developers/docs/transactions/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-3">3.</span> Wood, G. "Ethereum: A Secure Decentralised Generalised Transaction Ledger (Yellow Paper)." _ethereum.github.io_, 2024. <a href="https://ethereum.github.io/yellowpaper/paper.pdf" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-4">4.</span> Ethereum Foundation. "Patricia Merkle Tries." _ethereum.org_, 2024. <a href="https://ethereum.org/developers/docs/data-structures-and-encoding/patricia-merkle-trie/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-5">5.</span> EVM Codes Contributors. "EVM Opcodes Interactive Reference." _evm.codes_, 2024. <a href="https://www.evm.codes/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-6">6.</span> Buterin, V. and Swende, M. "EIP-2929: Gas Cost Increases for State Access Opcodes." _Ethereum Improvement Proposals_, 2020. <a href="https://eips.ethereum.org/EIPS/eip-2929" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-7">7.</span> Buterin, V. "A Theory of Ethereum State Size Management." _ethresear.ch_, 2021. <a href="https://ethresear.ch/t/a-theory-of-ethereum-state-size-management/9292" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-8">8.</span> Buterin, V. and Swende, M. "EIP-3529: Reduction in Refunds." _Ethereum Improvement Proposals_, 2021. <a href="https://eips.ethereum.org/EIPS/eip-3529" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>

<span id="fn-9">9.</span> Solidity Team. "Solidity v0.8.4 Release: Custom Errors." _soliditylang.org_, 2021. <a href="https://soliditylang.org/blog/2021/04/21/custom-errors/" target="_blank" rel="noopener" class="ref-link"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>
