---
title: "Hardhat, Foundry, Brownie, Truffle, or Ape: Which EVM Framework Does Your Team Actually Need in 2026?"
description: "Compare Hardhat, Foundry, Brownie, Truffle, and Ape for EVM development in 2026. Survey data, code examples, and a decision framework by team type."
date: 2026-05-08
tags:
  - Developer Tooling
  - Comparison
  - Testing
image: "/blog/images/evm-dev-frameworks-compared-2026.png"
ogImage: "/blog/images/evm-dev-frameworks-compared-2026-og.png"
status: published
readingTime: 13
---

*Last updated: May 2026*

A new L2 team opens a fresh repo and searches "Ethereum development framework." Five names come back: Hardhat, Foundry, Brownie, Truffle, and Ape. Two haven't shipped a meaningful update in years. One was officially archived in December 2023. The 10-minute setup decision they make now will govern their test feedback loop for the next year.

The right answer is rarely "just one." In 2026, the dominant professional pattern is a hybrid stack: Foundry for unit, fuzz, and invariant testing; Hardhat for TypeScript integration tests and declarative deployments. Understanding when to use that hybrid, when to go single-framework, and when to pick Ape instead is what this guide covers.

We will cut through the noise: Truffle is dead, Brownie is effectively retired, and if you are starting a new project today, your real choice is between Foundry, Hardhat, or Ape , depending on what your team already knows and what kind of bugs you need to catch.

> **Takeaways**
>
> - Foundry leads with 57% of developers as primary framework in 2025, up from 1.1% in 2022. Hardhat holds at 33%. Truffle is at effectively zero.
> - Truffle and Brownie are not viable choices for new projects.
> - The professional default is a hybrid: Foundry for tests, Hardhat for deployments.
> - Ape is the right choice for Python-native teams, Vyper projects, and data scientists.
> - Ethernal connects to both Foundry (via Anvil) and Hardhat via a one-line plugin, giving you a visual block explorer for local development.

## What we evaluated

Five EVM development frameworks, evaluated across six dimensions:

1. Language: what programming language tests and scripts use
2. Testing: unit, fuzz, and invariant testing support
3. Compilation speed: time from change to test feedback
4. Deployment: how deployments are managed and made reproducible
5. Local node: the bundled local blockchain environment
6. Ecosystem maturity: plugins, documentation, community activity

---

## The state of the field in 2026

Foundry is now the primary framework for 57% of Solidity developers, according to the 2025 Solidity Developer Survey.<sup>[1](#fn-1)</sup> That number was 51% in 2024<sup>[2](#fn-2)</sup> and 1.1% in 2022. The trajectory makes it one of the fastest tool adoptions in the Ethereum developer ecosystem.

Hardhat holds at 33% combined (18% on v3, 15% still on v2). It is not in decline , it has ceded protocol testing ground to Foundry while remaining essential for TypeScript-heavy, full-stack teams.

Truffle sits at approximately 0%. The 2025 survey found one remaining user. Brownie has a similarly negligible share. Both are effectively out of the picture for new projects.

The shift is not "Foundry replaced Hardhat." It is a specialization: security researchers and DeFi protocol teams moved to Foundry for its Solidity-native tests, fuzz testing, and fast compilation. Full-stack teams stayed on Hardhat or adopted a hybrid. The field split into niches rather than converging on a single winner.

---

## Truffle: archived in 2023, skip it

**The short answer: do not use Truffle for new projects.** ConsenSys archived the Truffle and Ganache codebases on December 20, 2023.<sup>[7](#fn-7)</sup> The repos are public read-only. No new releases, no security patches. Dependency rot is accumulating.

At the time of the sunset, ConsenSys recommended a 90-day migration window and published guides for moving to both Hardhat and Foundry. By the 2025 Solidity Developer Survey, one developer in the entire sample was still using Truffle as their primary framework.

If you have existing Truffle code: the migration path to Hardhat is the most structurally similar (both JS/TS). ConsenSys published step-by-step migration guides before archiving the project. For teams that want to make the leap to Foundry at the same time, guides exist for that path too.

Truffle's config pattern, for historical context:

```javascript
// truffle-config.js (do not use for new projects)
module.exports = {
  networks: {
    development: { host: "127.0.0.1", port: 8545, network_id: "*" }
  },
  compilers: { solc: { version: "0.8.20" } }
};
```

If you are still on Truffle, migrate. The dependency risk is not theoretical.

---

## Brownie: effectively retired

**Brownie is no longer actively maintained.** The README is explicit: "no longer actively maintained," and "future releases may come sporadically , or never at all."<sup>[8](#fn-8)</sup> The maintainers direct users building new Python projects to Ape Framework instead.

Brownie introduced many Python developers and data scientists to on-chain development. It runs on Python 3.x and still executes correctly , if you have existing Brownie scripts for occasional one-off use, they will likely work. But for any new project, the risk of dependency rot is real, and there is no active maintainer addressing security issues.

The Python community has a better option. Move to Ape.

---

## Foundry: the new default for protocol work

**Foundry is the fastest, most test-capable framework available for EVM development in 2026.** Built in Rust by Paradigm and released as v1.0 in February 2025,<sup>[3](#fn-3)</sup> it ships four tools: `forge` (build, test, deploy), `cast` (CLI for RPC calls), `anvil` (local EVM node), and `chisel` (interactive Solidity REPL).

### Speed

Foundry compiles 2.1 to 5.2 times faster than Hardhat depending on caching.<sup>[5](#fn-5)</sup> DeFi teams report full test suite runs 5 to 10 times faster than equivalent Hardhat setups. On a large protocol with hundreds of tests, this difference compounds: the tighter the feedback loop, the faster engineers iterate.

### Tests in Solidity

Foundry tests are Solidity contracts. You write your tests in the same language as your contracts, without context-switching to JavaScript. For protocol teams where everyone is a Solidity expert, this eliminates friction.

```solidity
// Foundry fuzz test , Forge runs this with thousands of random inputs
function testFuzz_withdraw(uint96 amount) public {
    vm.assume(amount > 0);
    vault.deposit{value: amount}();
    vault.withdraw(amount);
    assertEq(address(vault).balance, 0);
}
```

### Fuzz and invariant testing

Fuzz testing feeds random inputs to a function and checks that it never panics or violates an assertion. Invariant testing is more powerful: Forge generates arbitrary sequences of calls across multiple functions and checks that a defined property holds across all of them , regardless of order or parameters.

```solidity
// Foundry invariant test , Forge generates arbitrary call sequences trying to violate this
function invariant_totalSupplyEqualsDeposits() public {
    assertEq(token.totalSupply(), vault.totalDeposits());
}
```

This catches entire classes of logic bugs that unit tests miss. Three Sigma's security research team has documented how invariant testing surfaces state inconsistencies that only emerge after multi-step interaction sequences , the exact shape of many real DeFi exploits.<sup>[11](#fn-11)</sup> The invariant shrinking algorithm was rewritten for v1.0, significantly improving performance on finding minimal failing sequences.

### `foundry.toml` basics

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
evm_version = "prague"   # EIP-7702 support

[fuzz]
runs = 1000

[invariant]
runs = 500
depth = 15
```

EIP-7702 support landed in October 2024. Symbolic execution integration shipped in v1.0.

### Anvil and Cast

Anvil is Foundry's local EVM node. It supports mainnet forking (`anvil --fork-url $RPC --fork-block-number 19000000`), faster startup, and higher throughput than JavaScript-based nodes. Cast handles any EVM chain interaction from the CLI: `cast call`, `cast send`, `cast tx`, `cast block`. Chisel is an interactive Solidity REPL for prototyping expressions before putting them in contracts.

**Best for:** DeFi protocol teams, security researchers and auditors, gas-optimization-critical work, and teams where every engineer is Solidity-native. Also the simplest starting point for solo developers who don't want to set up a Node.js environment.

---

## Hardhat: essential for full-stack teams

**Hardhat remains the right choice for teams building contracts alongside TypeScript frontends, and for any workflow that needs a declarative deployment system.** Maintained by the Nomic Foundation, Hardhat 3 shipped with ESM by default, TypeScript-first configuration, and Hardhat Ignition , a declarative deployment system with resumable journals and parallelizable deployment steps.<sup>[6](#fn-6)</sup>

### TypeScript-first development

Hardhat's contract artifacts are typed by default in v3. Your tests and scripts get autocompletion, type-safe contract instances, and no separate code generation step. For full-stack teams where the same engineers write Solidity and React, this is the natural fit. The `hardhat-toolbox-viem` package uses Viem as the connection library and the Node.js test runner , the current recommended setup for new projects.

### Hardhat Ignition

Ignition is a declarative deployment system. You define what to deploy and how dependencies connect, not the imperative sequence of steps. Ignition tracks deployment state in a journal file, so interrupted deployments resume from where they stopped. Steps that don't depend on each other can deploy in parallel.

```typescript
// ignition/modules/Lock.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LockModule = buildModule("LockModule", (m) => {
  const lock = m.contract("Lock", [1893456000n], { value: 1_000_000_000n });
  return { lock };
});
export default LockModule;
```

For teams deploying across multiple networks (testnet, staging, mainnet), Ignition keeps deployment state tracked and idempotent. This is a category where Foundry's deployment scripts don't yet match Ignition's feature set.

### Plugin ecosystem

Hardhat's plugin ecosystem is the most mature in the field: gas reporter, contract-sizer, OpenZeppelin Upgrades plugin, `hardhat-verify` for Etherscan and Blockscout, and more. Foundry's ecosystem is growing but has not caught up on breadth.

### Built-in coverage

Hardhat 3 ships with `--coverage` as a built-in flag for both Solidity and TypeScript tests. No additional plugin required.

**Best for:** Full-stack dApp teams, teams running multi-network deployments with Ignition, and anyone who needs TS integration tests alongside Solidity contracts. Also the most familiar migration target for Truffle users.

---

## Ape (ApeWorX): Python's serious contender

**Ape is the recommended Python framework for EVM development in 2026**, replacing Brownie for all new projects. Built by ApeWorX and actively maintained, Ape is modular by design: nothing is bundled by default. You add `ape-solidity` for Solidity support, `ape-vyper` for Vyper, `ape-etherscan` for verification, `ape-alchemy` for RPC, and `ape-ledger` or `ape-trezor` for hardware wallet signing.<sup>[9](#fn-9)</sup>

### Python SDK and Jupyter integration

Ape's Python SDK makes it a natural fit for data scientists who want to run Pandas analyses on live contract state, or quantitative researchers who live in Jupyter notebooks. You can load a deployed contract and run statistical analysis on its historical interactions with a few lines of Python.

```python
# Python-native contract interaction with Ape
from ape import accounts, project

def main():
    dev = accounts.load("deployer")
    contract = project.MyToken.deploy(sender=dev)
    contract.transfer(dev, 1000, sender=dev)
```

### Silverback

Silverback is an ApeWorX product built on top of Ape: deploy Python bots that respond to on-chain events. For teams building monitoring systems, automated market makers, or arbitrage bots, Silverback keeps the entire stack in Python.

### Built-in gas reporting and transaction tracing

The Ape CLI ships with gas reporting and transaction tracing integrated. The Lido team published a technical comparison of Hardhat and Ape when evaluating a migration , they found Ape's CLI tracing and gas reporting directly competitive with Hardhat's plugin equivalents.<sup>[13](#fn-13)</sup>

**Best for:** Data scientists running analytics on deployed contracts, security researchers who prefer Python, teams writing Vyper contracts, and quantitative research teams at DeFi protocols who work primarily in notebooks.

---

## Full comparison table

| | Foundry | Hardhat | Ape | Truffle | Brownie |
|---|---|---|---|---|---|
| **Language** | Solidity | TypeScript/JS | Python | JavaScript | Python |
| **Status** | Active (v1.0, Feb 2025) | Active (v3) | Active | Archived (Dec 2023) | Unmaintained |
| **Test language** | Solidity | TypeScript/JS | Python | JavaScript | Python |
| **Fuzz testing** | Built-in, first-class | Via plugins | Via plugins | None | None |
| **Invariant testing** | Built-in, first-class | No | No | No | No |
| **Compilation speed** | 2.1–5.2x faster than Hardhat | Baseline | Plugin-dependent | Similar to Hardhat | Similar to Hardhat |
| **Deployment system** | Solidity scripts | Hardhat Ignition (declarative) | Python scripts | Truffle Migrate | Python scripts |
| **Local node** | Anvil | Hardhat Network | External (Anvil/Hardhat) | Ganache (archived) | Ganache (archived) |
| **Plugin ecosystem** | Growing | Mature and extensive | Modular Python plugins | Deprecated | Deprecated |
| **Built-in coverage** | Yes | Yes (v3) | Via plugins | No | No |
| **Vyper support** | Partial | Via plugin | First-class (ape-vyper) | No | Yes (legacy) |
| **Developer survey 2025** | 57% | 33% | Niche | approximately 0% | Negligible |

---

## Decision framework

The right framework depends on your team's language background, what kind of testing matters most, and how you deploy.

| Team Profile | Recommended Stack | Why |
|---|---|---|
| DeFi protocol, Solidity-native team | Foundry | Invariant testing catches whole bug classes that unit tests miss; fastest feedback loop |
| Full-stack dApp (contracts + TypeScript frontend) | Hardhat + Foundry | Ignition for deployments and TS integration tests; Foundry for fuzz/invariant |
| Security researcher or auditor | Foundry | Invariant testing + `cast` + cheatcodes; the toolkit security researchers reach for |
| Python-native team or data scientist | Ape | Python SDK, Jupyter integration, Vyper support, Silverback for on-chain bots |
| L2 operator, local dev with visual explorer | Foundry or Hardhat + Ethernal | Anvil + Ethernal CLI; or hardhat-ethernal plugin for Hardhat |
| Solo developer, new to EVM | Foundry | No Node.js setup required; Chisel REPL for learning; simpler getting-started path |
| Legacy Truffle project | Migrate to Hardhat | Most structurally similar DX; ConsenSys published migration guides |
| Legacy Brownie project | Migrate to Ape | Brownie maintainers explicitly recommend Ape for new work |

### The hybrid pattern

The most common professional setup in 2026 is Foundry and Hardhat in one repo. Foundry handles unit, fuzz, and invariant tests. Hardhat handles TypeScript integration tests, Ignition deployments, and verification scripts.

They coexist cleanly. One `foundry.toml` and one `hardhat.config.ts` in the same directory, separate `src/` and `test/` conventions. The Foundry toolchain does not touch Node.js; Hardhat does not touch Rust. MetaMask's development guide covers this hybrid setup in detail.<sup>[14](#fn-14)</sup>

---

## Local dev visibility: connecting your framework to Ethernal

Whatever framework you use, local development needs a way to inspect transactions and contracts beyond reading test output. Ethernal fills this gap for both dominant frameworks , giving you a visual block explorer for your local chain without any additional infrastructure.

### Hardhat: hardhat-ethernal plugin

The `hardhat-ethernal` plugin syncs every block, transaction, and contract ABI to an Ethernal workspace automatically. Set `uploadAst: true` to enable storage slot inspection.<sup>[10](#fn-10)</sup>

```bash
npm install --save-dev hardhat-ethernal
```

```javascript
// hardhat.config.js
require("hardhat-ethernal");

module.exports = {
  ethernal: {
    uploadAst: true,             // enables storage slot inspection
    resetOnStart: "myWorkspace", // clears workspace on each run
  }
};
// env: ETHERNAL_API_TOKEN=<token from app.tryethernal.com > Settings > Account>
```

Every transaction your scripts or tests send now appears in the Ethernal dashboard with decoded call data, event logs, and contract state. Contract ABIs sync automatically, so all read/write methods get a generated interaction UI without any manual verification step.

### Foundry/Anvil: Ethernal CLI

Anvil exposes a standard JSON-RPC endpoint at `http://localhost:8545`. Ethernal supports any EVM-compatible RPC, so connecting Foundry's local node takes two terminal commands:

```bash
# Terminal 1: start Anvil
anvil

# Terminal 2: sync to Ethernal
ETHERNAL_API_TOKEN=<your-token> npx ethernal listen --workspace my-workspace
```

Every block Anvil produces appears in your Ethernal explorer. Run `forge script` or `forge test` as usual , transactions sync in real time. The result is the same dashboard experience whether you are using Hardhat or Foundry: decoded transactions, contract interaction UI, event log viewer, and storage reader for any synced contract.

---

## Frequently asked questions

### Which EVM framework is best in 2026?

Foundry is the most widely used EVM development framework in 2026, with 57% of Solidity developers naming it as their primary tool.<sup>[1](#fn-1)</sup> Hardhat is second at 33% and remains essential for TypeScript-heavy teams. The most common professional setup combines both. For Python teams, Ape is the only actively maintained option.

### Is Foundry better than Hardhat?

Foundry is faster and has superior testing capabilities, specifically fuzz testing and invariant testing. Hardhat has a more mature plugin ecosystem, a TypeScript-first workflow, and Hardhat Ignition for declarative deployments. Neither is universally better. They serve different team profiles and many professional teams use both in the same repository.

### Is Truffle still used in 2026?

No. ConsenSys archived Truffle and Ganache on December 20, 2023.<sup>[7](#fn-7)</sup> The 2025 Solidity Developer Survey found one developer using it as a primary framework. Do not use Truffle for new projects. Migrate existing Truffle codebases to Hardhat using the migration guides ConsenSys published before archiving the project.

### Should I use Brownie or Ape for Python EVM development?

Use Ape. Brownie is no longer actively maintained and its own maintainers redirect new projects to Ape Framework.<sup>[8](#fn-8)</sup> Brownie's archived code still executes on Python 3.x but accumulates dependency risk with no active security maintenance.

### What is invariant testing in Foundry?

Invariant testing is stateful fuzz testing where Forge generates arbitrary sequences of contract calls and verifies that a defined property holds across all sequences , regardless of the order or parameters. For example, `token.totalSupply() == vault.totalDeposits()` should be true no matter what sequence of deposits, withdrawals, or transfers has occurred. Invariant tests catch logic bugs that only emerge from multi-step interaction sequences, which is a common attack pattern in DeFi exploits.<sup>[12](#fn-12)</sup>

### Can Foundry and Hardhat run in the same repository?

Yes. This is the standard professional setup. One `foundry.toml` and one `hardhat.config.ts` coexist in the same repo without interference. Foundry manages dependencies via git submodules in `lib/`. Hardhat uses npm. They use separate test directories and do not conflict.

### What does Hardhat Ignition do differently from deployment scripts?

Hardhat Ignition is declarative: you define what to deploy and how dependencies connect, not the imperative sequence of steps. Ignition tracks deployment state in a journal file, so interrupted deployments resume from where they stopped and steps without dependencies can run in parallel. A standard Hardhat script re-deploys from scratch if it fails mid-way. Ignition does not.<sup>[6](#fn-6)</sup>

---

## Takeaways

- Foundry leads at 57% of primary framework usage in 2025. Hardhat is second at 33%. Neither is going away.
- Truffle is archived. Brownie is unmaintained. Do not use either for new projects.
- The dominant professional pattern is the hybrid stack: Foundry for tests, Hardhat for deployments and TS integration.
- Foundry's invariant testing is the single most important reason to adopt it for protocol work. It surfaces whole classes of bugs that unit tests cannot catch.
- Ape is the only active Python framework for EVM development. For Python teams, it is the right choice.
- Ethernal connects to both Hardhat (via `hardhat-ethernal`) and Foundry (via Anvil + Ethernal CLI) and provides a visual block explorer for local development without additional infrastructure.

---

## References

<span id="fn-1">1.</span> Solidity Team. "Solidity Developer Survey 2025 Results." _Solidity Blog_, April 2026. [https://www.soliditylang.org/blog/2026/04/15/solidity-developer-survey-2025-results/](https://www.soliditylang.org/blog/2026/04/15/solidity-developer-survey-2025-results/)

<span id="fn-2">2.</span> Solidity Team. "Solidity Developer Survey 2024 Results." _Solidity Blog_, April 2025. [https://www.soliditylang.org/blog/2025/04/25/solidity-developer-survey-2024-results/](https://www.soliditylang.org/blog/2025/04/25/solidity-developer-survey-2024-results/)

<span id="fn-3">3.</span> Paradigm. "Announcing Foundry v1.0." _Paradigm Blog_, February 2025. [https://www.paradigm.xyz/2025/02/announcing-foundry-v1-0](https://www.paradigm.xyz/2025/02/announcing-foundry-v1-0)

<span id="fn-4">4.</span> Paradigm. "Foundry: Blazing fast, portable and modular toolkit for Ethereum application development." _GitHub_, 2025. [https://github.com/foundry-rs/foundry](https://github.com/foundry-rs/foundry)

<span id="fn-5">5.</span> Paradigm. "Foundry Benchmarks." _getfoundry.sh_, 2025. [https://getfoundry.sh/benchmarks/](https://getfoundry.sh/benchmarks/)

<span id="fn-6">6.</span> Nomic Foundation. "What's new in Hardhat 3." _Hardhat Documentation_, 2025. [https://hardhat.org/docs/hardhat3/whats-new](https://hardhat.org/docs/hardhat3/whats-new)

<span id="fn-7">7.</span> ConsenSys. "ConsenSys announces the sunset of Truffle and Ganache." _ConsenSys Blog_, September 2023. [https://consensys.io/blog/consensys-announces-the-sunset-of-truffle-and-ganache-and-new-hardhat](https://consensys.io/blog/consensys-announces-the-sunset-of-truffle-and-ganache-and-new-hardhat)

<span id="fn-8">8.</span> eth-brownie. "Brownie , Python-based development and testing framework for Ethereum." _GitHub_, 2024. [https://github.com/eth-brownie/brownie](https://github.com/eth-brownie/brownie)

<span id="fn-9">9.</span> ApeWorX. "Ape Framework , The Ethereum development tool for Pythonistas, Data Scientists, and Security Professionals." _GitHub_, 2025. [https://github.com/ApeWorX/ape](https://github.com/ApeWorX/ape)

<span id="fn-10">10.</span> Ethernal. "hardhat-ethernal , Hardhat plugin for Ethernal." _GitHub_, 2025. [https://github.com/tryethernal/hardhat-ethernal](https://github.com/tryethernal/hardhat-ethernal)

<span id="fn-11">11.</span> Three Sigma. "Foundry vs Hardhat: Solidity Testing Tools." _Three Sigma Blog_, 2024. [https://threesigma.xyz/blog/foundry/foundry-vs-hardhat-solidity-testing-tools](https://threesigma.xyz/blog/foundry/foundry-vs-hardhat-solidity-testing-tools)

<span id="fn-12">12.</span> Three Sigma. "Foundry Cheatcodes: Invariant Testing." _Three Sigma Blog_, 2024. [https://threesigma.xyz/blog/foundry/foundry-cheatcodes-invariant-testing](https://threesigma.xyz/blog/foundry/foundry-cheatcodes-invariant-testing)

<span id="fn-13">13.</span> Lido Engineering. "Hardhat vs Ape: A Comparative Report." _HackMD_, 2024. [https://hackmd.io/@lido/hhvsape](https://hackmd.io/@lido/hhvsape)

<span id="fn-14">14.</span> MetaMask. "Hardhat vs Foundry: Choosing the Right Ethereum Development Tool." _MetaMask News_, 2024. [https://metamask.io/news/hardhat-vs-foundry-choosing-the-right-ethereum-development-tool](https://metamask.io/news/hardhat-vs-foundry-choosing-the-right-ethereum-development-tool)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Which EVM framework is best in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Foundry is the most widely used EVM development framework in 2026, with 57% of Solidity developers naming it as their primary tool. Hardhat is second at 33% and remains essential for TypeScript-heavy teams. The most common professional setup combines both. For Python teams, Ape (ApeWorX) is the only actively maintained option."
      }
    },
    {
      "@type": "Question",
      "name": "Is Foundry better than Hardhat?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Foundry is faster and has superior testing capabilities, specifically fuzz testing and invariant testing. Hardhat has a more mature plugin ecosystem, a TypeScript-first workflow, and Hardhat Ignition for declarative deployments. Neither is universally better. They serve different team profiles and many professional teams use both in the same repository."
      }
    },
    {
      "@type": "Question",
      "name": "Is Truffle still used in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. ConsenSys archived Truffle and Ganache on December 20, 2023. The 2025 Solidity Developer Survey found one developer using it as a primary framework. Do not use Truffle for new projects."
      }
    },
    {
      "@type": "Question",
      "name": "Should I use Brownie or Ape for Python EVM development?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use Ape. Brownie is no longer actively maintained and its own maintainers redirect new projects to Ape Framework. Brownie's archived code still executes on Python 3.x but accumulates dependency risk with no active security maintenance."
      }
    },
    {
      "@type": "Question",
      "name": "What is invariant testing in Foundry?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Invariant testing is stateful fuzz testing where Forge generates arbitrary sequences of contract calls and verifies that a defined property holds across all sequences, regardless of order or parameters. For example, token.totalSupply() == vault.totalDeposits() should be true no matter what sequence of deposits, withdrawals, or transfers has occurred. Invariant tests catch logic bugs that only emerge from multi-step interaction sequences, which is a common attack pattern in DeFi exploits."
      }
    },
    {
      "@type": "Question",
      "name": "Can Foundry and Hardhat run in the same repository?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. This is the standard professional setup. One foundry.toml and one hardhat.config.ts coexist in the same repo without interference. Foundry manages dependencies via git submodules in lib/. Hardhat uses npm. They use separate test directories and do not conflict."
      }
    },
    {
      "@type": "Question",
      "name": "What does Hardhat Ignition do differently from deployment scripts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Hardhat Ignition is declarative: you define what to deploy and how dependencies connect, not the imperative sequence of steps. Ignition tracks deployment state in a journal file, so interrupted deployments resume from where they stopped and steps without dependencies can run in parallel. A standard Hardhat script re-deploys from scratch if it fails mid-way. Ignition does not."
      }
    }
  ]
}
</script>
