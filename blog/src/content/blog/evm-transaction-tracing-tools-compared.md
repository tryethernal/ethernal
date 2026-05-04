---
title: "Six Ways to Read a Transaction: EVM Tracing Tools Compared"
description: "Tenderly, Phalcon, Foundry, Hardhat, Ethernal, and OpenChain compared by setup, call tree depth, state diff, gas profiling, and pricing."
date: 2026-05-04
tags:
  - Security
  - Developer Tooling
  - Comparison
image: "/blog/images/evm-transaction-tracing-tools-compared.png"
ogImage: "/blog/images/evm-transaction-tracing-tools-compared-og.png"
status: published
readingTime: 12
---

*Last updated: May 2026*

A DeFi exploit just drained $50M. The security researcher has a tx hash. In the next 30 seconds, they will open one of six different tools. Each will show them something different about the same transaction. None will show them everything.

Transaction tracing is not a solved problem. It is a fragmented field where every tool optimizes for a different question. Call trees, state diffs, gas profiles, fund flows: these are different lenses on the same execution. Choosing the wrong tool wastes time or, worse, hides the answer you need.

This article runs a complex DeFi transaction through all six major EVM tracing tools: Tenderly, Phalcon, Foundry, Hardhat, Ethernal, and OpenChain. For each: setup friction, call tree depth, state diff support, gas profiling, pricing, and the scenarios where it is the right choice.

> **Takeaways**
>
> - No single tool covers all use cases. The right choice depends on whether you are debugging locally or on-chain, and what question you are asking.
> - Foundry v1.0 (February 2025) added state diffs and fully decoded calldata, making it the strongest free CLI option.
> - Phalcon has no equal for DeFi fund flow visualization. Open a tx hash in seconds, no account required.
> - Tenderly's simulation capability is unique among tools surveyed here. Replay any transaction with modified parameters.
> - Ethernal fills the gap between raw CLI output and expensive SaaS for teams running local chains.

## What is EVM transaction tracing?

EVM transaction tracing is the replay of every execution step in a transaction: opcodes, call stack, storage reads and writes, gas consumption, and event emissions. The standard underlying mechanism is `debug_traceTransaction`, a Geth RPC method that returns the complete execution record.<sup>[1](#fn-1)</sup>

But "trace" is not one thing. It is a stack of distinct data layers:

- **Call tree:** which contracts called which, in what order, with what parameters
- **State diff:** what storage slots changed, and how
- **Gas accounting:** how much gas each call consumed
- **Fund flow:** how tokens and ETH moved between addresses
- **Event logs:** what events fired and in what context

Modern DeFi protocols can touch 30 to 50 contracts in a single transaction. Without tracing, debugging a revert or understanding an exploit is a process of inference. With tracing, you have a complete replay of what actually happened.

## How we evaluated these tools

Six tools, evaluated across six dimensions:

1. **Setup friction:** time from "I have a tx hash" to "I can see the trace"
2. **Call tree depth:** decoded params, call types (CALL/DELEGATECALL/CREATE), and source mapping
3. **State diff:** SLOAD/SSTORE visibility, storage slot changes before and after execution
4. **Gas profiling:** per-call breakdown and flamegraph support
5. **Fund flow:** asset movement tracking across addresses within a single transaction
6. **Pricing:** free tier limits and paid plan structure

---

## Tenderly: the visual workhorse

### Setup

Create an account at tenderly.co, then paste a tx hash into the debugger. For local chain debugging, provision a Virtual TestNet (a fork environment). The account requirement is the tradeoff for persistent dashboards and team collaboration.

### Call tree

Tenderly's Visual Debugger renders the full call tree as a navigable UI. Each node shows the function name, decoded parameters, gas consumed, and the decoded return value. You can step through execution opcode by opcode, inspecting the EVM stack, memory, and storage at each step.

### State diff

Tenderly exposes SLOAD and SSTORE operations with 3x improved granularity as of their 2025 debugger update.<sup>[2](#fn-2)</sup> Storage slot changes are visible at the point where they occur in the call tree, not just as a post-execution summary.

### Gas profiling

Per-function gas breakdown is built in. You can identify which call in a complex sequence consumed the most gas without additional configuration.

### Simulation

Tenderly lets you replay any transaction with modified parameters. Change a function argument, the sender address, or the block number, then see how the outcome changes. This is the standout feature for production incident response.

### Pricing

The free tier covers forks, the Visual Debugger, transaction overview (state changes, decoded events, token transfers), and the Gateway free tier.<sup>[3](#fn-3)</sup> Paid plans are priced in Tenderly Units (TU): Starter at 35M TU per month, Pro at 350M TU per month. A single write method on a Virtual TestNet costs 2,000 TU. The billing model adds cognitive overhead for high-volume testing.

### Verdict

Tenderly is the strongest all-around tool for post-deployment debugging on mainnet and testnet forks. The gas profiler, simulation capability, and team-shared dashboards make it the default for production incident response at DeFi protocols. It is not designed for local chain development, and the TU billing limits its usefulness for CI/CD pipelines with high test volumes.

---

## Phalcon: the security analyst's lens

### Setup

Zero. Go to [blocksec.com/phalcon](https://blocksec.com/phalcon/explorer), paste a tx hash. No account required. You are reading traces in under 10 seconds.

### Call tree (Invocation Flow)

Phalcon renders a full call tree where each node represents a function call or event trigger. Nodes show call type (CALL, DELEGATECALL, STATICCALL, CREATE), depth, decoded parameters, and return values. It handles transactions with 4,000 or more internal calls without performance issues.<sup>[4](#fn-4)</sup>

### Fund flow

This is where Phalcon leads the field. The Fund Flow tab visualizes exactly how assets moved through a transaction, step by step, address by address. For DeFi exploits, this answers the critical question: where did the money go, and in what sequence. The Balance Changes tab shows the net token delta per address after execution, denominated in USD.

### State changes

Contract variable modifications are tracked and exposed in a separate tab.

### Pricing

Free. Phalcon is a public tool maintained by BlockSec, a blockchain security research firm.<sup>[5](#fn-5)</sup>

### Chains supported

Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche C-Chain, Base, Sepolia, and others including Hyperliquid.

### Verdict

Phalcon is indispensable for DeFi security research, audit preparation, and post-mortem analysis. No other tool comes close on fund flow visualization. When a hack happens and you need to understand the movement of funds within minutes, Phalcon is the first tool to open. It is mainnet and testnet only, has no simulation capability, and no gas profiler.

---

## Foundry trace: the speed freak's choice

### Setup

If you are already running Foundry, you already have this. Run `forge test -vvvv` for traces during testing, or `cast run <tx-hash> --rpc-url <rpc-url>` to replay any on-chain transaction locally.

### Verbosity levels

```
-v     Logs only
-vv    Logs for all tests
-vvv   Execution traces for failing tests
-vvvv  Execution traces for all tests + setup traces for failures
-vvvvv All of the above + storage changes + backtraces with line numbers
```

### Call tree

Tree-structured call graph with gas consumption in brackets, decoded function names, and internal call nesting. Foundry v1.0 (released February 2025) added fully decoded calldata and return values, including external library calls and fallback functions.<sup>[6](#fn-6)</sup>

### State diff

Also added in v1.0. Storage slot changes, balance changes, and code modifications from CREATE and CREATE2 operations are all tracked.

### Gas profiling

The `--flamechart` flag generates a flamechart showing gas usage over time. The `--flamegraph` flag produces a flamegraph for identifying deep call stacks. Both output to HTML and require no external services.

### Speed

Foundry is Rust-based. Compilation and test execution are significantly faster than Hardhat's JavaScript runtime. For large test suites, this difference is meaningful.

### Pricing

Free. Open-source under the MIT license, maintained by Paradigm.

### Verdict

Foundry is the dominant choice for TDD workflows, gas optimization, and CI/CD pipelines. Most DeFi protocol teams have moved to Foundry specifically because of this feedback loop. The v1.0 release filled the state diff gap that previously pushed teams toward Tenderly for certain workflows. The limitation is CLI-only and no persistent UI. Replaying on-chain transactions with `cast run` is a separate workflow from the test suite.

---

## Hardhat Trace: The Quick Feedback Loop

**Setup:** Zero, for basic features. Hardhat outputs Solidity stack traces on transaction failure automatically. For deeper traces, install the `hardhat-tracer` plugin.<sup>[7](#fn-7)</sup>

**Built-in features:**

- Decoded revert reasons and custom error messages
- Solidity stack traces combining Solidity and JavaScript frames
- `console.log()` output from any Solidity function (via `import "hardhat/console.sol"`)

**hardhat-tracer plugin verbosity:**

```
--v    Internal calls for failed txs
--vv   Internal calls + storage ops for failed txs
--vvv  Internal calls for all txs
--vvvv Internal calls + storage ops for all txs
```

**Pricing:** Free. Open-source.

**Verdict:** Hardhat's built-in tracing is right for one specific moment: a test just failed and you want to know why, immediately, without changing your workflow. The `console.log` integration from Solidity is genuinely useful during iterative development. The gaps are no persistent trace history, no visual UI, no gas profiler, and you need the plugin for anything beyond failure analysis.

---

## Ethernal: Traces with Explorer Context

**Setup:** Install the Ethernal Hardhat plugin, connect it to an Ethernal workspace, and start your local chain. Tracing is activated in workspace settings under Advanced Options. Two modes are available: Hardhat mode (uses `experimentalAddHardhatNetworkMessageTraceHook` to avoid OOM issues from large trace payloads) and non-Hardhat mode (uses `debug_traceTransaction` directly).<sup>[8](#fn-8)</sup>

**Call tree:** Decoded function names and parameters for each internal call. Ethernal resolves contract addresses against your synced workspace first, then falls back to bytecode hash matching, then to Etherscan ABI lookup. This means you get decoded traces even for contracts you have not explicitly verified.

**What makes it different from CLI tools:** The trace is stored in a persistent block explorer UI alongside block and transaction context. You can navigate to any transaction from any block in your session, inspect its trace, examine the contract state, and return to it later. CLI tools lose traces when the session ends. Ethernal does not.

This matters for teams running shared local chain environments. A developer can debug a failing transaction, share the Ethernal workspace URL with a colleague, and both can inspect the same trace with full context and decoded ABI.

**Pricing:** Free for local development on the Starter plan. No trace limits on local chains.

**Limitations to be upfront about:** No state diff or gas profiler currently. Large transactions on JavaScript-based EVMs (Hardhat, Ganache) can hit out-of-memory limits due to full trace payload size. Ethernal is designed for local chain development workflows, not for browsing mainnet transactions.

**Verdict:** Ethernal fills a specific gap: visual, persistent, decoded trace history for local chain development. It is not competing with Tenderly on post-deployment debugging or with Phalcon on DeFi forensics. It competes with raw CLI output, and the comparison is clear if you need to navigate traces across a session, share them with teammates, or review what happened two hours ago.

---

## OpenChain: The Zero-Friction Snapshot

**Setup:** Zero. Go to [openchain.xyz/trace](https://openchain.xyz/trace), paste any Ethereum transaction hash. Results appear in seconds.

**Call tree:** Basic call tree with decoded function names pulled from OpenChain's signature database. That signature database is notable: Foundry, Etherscan, and other tools use OpenChain's database as their function signature resolution backend.<sup>[9](#fn-9)</sup>

**Pricing:** Free.

**Verdict:** OpenChain is right for one scenario: you encountered a tx hash you have never seen, you want a quick read of what happened, and you have 30 seconds. The shareable URL is useful for pasting into a chat thread. The gaps are significant: no state diff, no gas profiler, no fund flow, and chain support beyond Ethereum is limited. For anything deeper, switch to Phalcon.

---

## Full comparison table

| | Tenderly | Phalcon | Foundry | Hardhat | Ethernal | OpenChain |
|---|---|---|---|---|---|---|
| **Setup** | Account required | Zero | CLI (bundled) | Zero (built-in) | CLI install | Zero |
| **Call tree** | Visual, decoded | Visual, decoded | Decoded (v1.0) | Partial (plugin) | Decoded | Basic |
| **State diff** | Yes | Yes | Yes (v1.0) | No | No | No |
| **Gas profiler** | Yes (per-call) | No | Flamechart | No | No | No |
| **Fund flow** | No | Best-in-class | No | No | No | No |
| **Local chain** | Via VirtualTestNet | No | Yes | Yes | Yes | No |
| **Simulation** | Yes | No | Via `cast run` | No | No | No |
| **Persistent UI** | Yes | No | No | No | Yes | No |
| **Pricing** | Free / Paid (TU) | Free | Free | Free | Free | Free |
| **Chains** | Multi-chain | 8+ public chains | Any (via RPC) | Local only | Local only | ETH primary |

---

## Decision framework: which tool for which scenario

| Scenario | Recommended Tool | Why |
|---|---|---|
| Local dev, want visual persistent trace history | Ethernal | Only tool with a block explorer UI for local chains |
| Local dev, fast CLI feedback during test iteration | Foundry (`-vvvv`) or Hardhat | Zero context switch from test output |
| On-chain tx: DeFi hack, fund flow analysis | Phalcon | Fund flow visualization has no equivalent |
| On-chain tx: gas profiling, simulation | Tenderly | Per-call gas breakdown and transaction replay |
| On-chain tx: 30-second glance, no setup | OpenChain | Zero friction, shareable URL |
| CI/CD: gas regression testing | Foundry | Flamechart output, fast Rust runtime |
| Team debugging: shared production incident | Tenderly | Persistent dashboards, team collaboration |
| Security audit: pre-engagement transaction recon | Phalcon | Invocation flow plus fund flow in one tool |

---

## Hands-on: setting up Ethernal traces in a Hardhat project

If you are running a Hardhat local chain and want persistent trace history across your dev session, here is the setup from scratch.

**1. Install the Ethernal Hardhat plugin**

```bash
npm install --save-dev @ethernal/hardhat-ethernal
```

**2. Configure your Hardhat project**

```javascript
// hardhat.config.js
require("@ethernal/hardhat-ethernal");

module.exports = {
  ethernal: {
    email: process.env.ETHERNAL_EMAIL,
    password: process.env.ETHERNAL_PASSWORD,
    workspace: "my-local-chain",
    uploadAst: true,   // enables decoded traces via ABI
    trace: true,       // activate tracing
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
  },
};
```

**3. Activate tracing in the Ethernal workspace**

Go to your workspace settings in the Ethernal dashboard. Under Advanced Options, select "Hardhat" tracing mode. This uses the Hardhat network message trace hook, which avoids the OOM issues that can occur when pulling full `debug_traceTransaction` payloads from Hardhat's JavaScript EVM for large transactions.

**4. Run your node and scripts**

```bash
npx hardhat node &
npx hardhat run scripts/deploy.js --network localhost
```

Every transaction that runs will now appear in your Ethernal workspace with a decoded call tree. Navigate to any transaction, open the Trace tab, and you will see the full internal call structure with decoded parameters and contract names.

For Foundry/Anvil projects, use the Ethernal CLI instead:

```bash
npm install -g ethernal
ethernal listen --workspace my-local-chain
```

Point your Anvil instance at `http://localhost:8545` and run forge scripts as usual. Transactions sync automatically.

---

## Frequently asked questions

### What is the best EVM transaction tracer?

The best EVM transaction tracer depends on your workflow. For local development with a visual UI and persistent history, Ethernal is the only option in this category. For fast CLI feedback during testing, Foundry or Hardhat. For DeFi forensics and fund flow analysis, Phalcon. For production incident response with simulation capability, Tenderly. For a zero-setup glance at any public tx, OpenChain.

### Does Foundry trace support state diffs?

Yes. Foundry v1.0 (released February 2025) added state diff support, including storage slot changes, balance changes, and code modifications from CREATE and CREATE2 operations. Use `-vvvvv` verbosity to see storage changes alongside the full call trace.<sup>[6](#fn-6)</sup>

### Can Phalcon trace local chain transactions?

No. Phalcon only supports public chains: Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche C-Chain, Base, Sepolia, and others. For local chain tracing, use Foundry, Hardhat, or Ethernal.

### Is Tenderly free?

Tenderly has a free tier that includes the Visual Debugger, forks, transaction overview (state changes, decoded events, token transfers), and the Gateway free tier. Paid plans (Starter, Pro, Pro+) are priced in Tenderly Units. A single write operation on a Virtual TestNet costs 2,000 TU, so high-volume testing can exhaust the free tier quickly.<sup>[3](#fn-3)</sup>

### What is `debug_traceTransaction`?

`debug_traceTransaction` is the standard Geth RPC method for replaying a transaction and returning every execution step at the opcode level, including stack, memory, and storage state at each instruction. The response payload can be very large for complex transactions. This is why tools like Ethernal offer a Hardhat-specific mode that uses an alternative hook to avoid out-of-memory errors on JavaScript-based EVMs.<sup>[1](#fn-1)</sup>

### How does Phalcon handle complex DeFi transactions?

Phalcon's Invocation Flow handles transactions with 4,000 or more internal calls without performance degradation, according to BlockSec's documentation.<sup>[4](#fn-4)</sup> The Fund Flow and Balance Changes tabs are specifically designed for multi-protocol DeFi transactions where assets move through many contracts and addresses in a single execution.

---

## Key takeaways

- No single EVM tracing tool covers all use cases. Stack them based on the question you are asking.
- Foundry v1.0 added state diffs and decoded return values, closing the feature gap that previously pushed teams toward paid tooling for local development.
- Phalcon's fund flow visualization is in a category of its own for DeFi forensics and security research.
- Tenderly's simulation is not available in any other tool here. For production incident response, it is the right tool.
- Ethernal is the only tool in this list that provides a persistent, visual, decoded trace explorer for local chains, at no cost.
- OpenChain and Phalcon require zero setup. When you need to read an unfamiliar public transaction with no context and no time, start there.

---

## References

<span id="fn-1">1.</span> Ethereum Foundation. "Built-in Tracers." _Go Ethereum Documentation_, 2024. [https://docs.go-ethereum.org/developers/evm-tracing/built-in-tracers](https://docs.go-ethereum.org/developers/evm-tracing/built-in-tracers)

<span id="fn-2">2.</span> Tenderly. "Debugger: Improved Visibility and Granularity." _Tenderly Changelog_, 2025. [https://blog.tenderly.co/changelog/debugger-improved-visibility-granularity/](https://blog.tenderly.co/changelog/debugger-improved-visibility-granularity/)

<span id="fn-3">3.</span> Tenderly. "Tenderly Plans." _Tenderly Documentation_, 2025. [https://docs.tenderly.co/tenderly-plans](https://docs.tenderly.co/tenderly-plans)

<span id="fn-4">4.</span> BlockSec. "Getting Started with Phalcon 2.0." _BlockSec Blog_, 2024. [https://blocksecteam.medium.com/getting-started-with-phalcon-2-0-253da584ca91](https://blocksecteam.medium.com/getting-started-with-phalcon-2-0-253da584ca91)

<span id="fn-5">5.</span> BlockSec. "Phalcon Explorer." _BlockSec_, 2025. [https://blocksec.com/phalcon/explorer](https://blocksec.com/phalcon/explorer)

<span id="fn-6">6.</span> Paradigm. "Announcing Foundry v1.0." _Paradigm Blog_, February 2025. [https://www.paradigm.xyz/2025/02/announcing-foundry-v1-0](https://www.paradigm.xyz/2025/02/announcing-foundry-v1-0)

<span id="fn-7">7.</span> zemse. "hardhat-tracer." _GitHub_, 2024. [https://github.com/zemse/hardhat-tracer](https://github.com/zemse/hardhat-tracer)

<span id="fn-8">8.</span> Ethernal. "Transaction Tracing with Ethernal." _Ethernal Blog_, 2021. [https://tryethernal.com/blog/transaction-tracing-with-ethernal](https://tryethernal.com/blog/transaction-tracing-with-ethernal)

<span id="fn-9">9.</span> OpenChain. "Transaction Decoder." _OpenChain_, 2025. [https://openchain.xyz/trace](https://openchain.xyz/trace)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the best EVM transaction tracer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The best EVM transaction tracer depends on your workflow. For local development with a visual UI and persistent history, Ethernal is the only option in this category. For fast CLI feedback during testing, use Foundry or Hardhat. For DeFi forensics and fund flow analysis, use Phalcon. For production incident response with simulation capability, use Tenderly. For a zero-setup glance at any public tx, use OpenChain."
      }
    },
    {
      "@type": "Question",
      "name": "Does Foundry trace support state diffs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Foundry v1.0 (released February 2025) added state diff support, including storage slot changes, balance changes, and code modifications from CREATE and CREATE2 operations. Use -vvvvv verbosity to see storage changes alongside the full call trace."
      }
    },
    {
      "@type": "Question",
      "name": "Can Phalcon trace local chain transactions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Phalcon only supports public chains: Ethereum, BNB Chain, Polygon, Arbitrum, Avalanche C-Chain, Base, Sepolia, and others. For local chain tracing, use Foundry, Hardhat, or Ethernal."
      }
    },
    {
      "@type": "Question",
      "name": "Is Tenderly free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Tenderly has a free tier that includes the Visual Debugger, forks, transaction overview, and the Gateway free tier. Paid plans (Starter, Pro, Pro+) are priced in Tenderly Units. A single write operation on a Virtual TestNet costs 2,000 TU, so high-volume testing can exhaust the free tier quickly."
      }
    },
    {
      "@type": "Question",
      "name": "What is debug_traceTransaction?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "debug_traceTransaction is the standard Geth RPC method for replaying a transaction and returning every execution step at the opcode level, including stack, memory, and storage state at each instruction. The response payload can be very large for complex transactions."
      }
    },
    {
      "@type": "Question",
      "name": "How does Phalcon handle complex DeFi transactions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Phalcon's Invocation Flow handles transactions with 4,000 or more internal calls without performance degradation. The Fund Flow and Balance Changes tabs are specifically designed for multi-protocol DeFi transactions where assets move through many contracts and addresses in a single execution."
      }
    }
  ]
}
</script>
