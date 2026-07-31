---
title: "The Gas Number That Just Became Two: Inside EIP-8037's Multidimensional Gas Metering"
description: "EIP-8037 finalizes multidimensional gas metering for Ethereum, splitting gas into execution and state pools. What breaks, and what to audit before Glamsterdam."
date: 2026-05-18
tags:
  - Ethereum
  - EIP
  - Gas
  - DeFi
  - L2
keywords: []
image: "/blog/images/eip-8037-multidimensional-gas-metering.png"
ogImage: "/blog/images/eip-8037-multidimensional-gas-metering-og.png"
status: published
readingTime: 7
---

EIP-8037 is a finalized Ethereum protocol upgrade that splits gas accounting into two independent pools, execution gas for computation and state gas for anything that permanently grows the state trie, repricing state creation so the gas limit can keep climbing without overwhelming node storage.

A team redeploys a singleton factory, the kind used for deterministic CREATE2 deployments across dozens of EVM chains, to a fresh Glamsterdam-enabled testnet. Same raw signed transaction that has worked on every other chain for years. It reverts. Not a bug in the contract. The factory hardcodes a gas limit around 100,000, and that number no longer covers the cost of creating an account on this chain. Gas just stopped being one number.

## What is EIP-8037?

[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) is a finalized Ethereum protocol change that repriced state creation and split gas accounting into two independent pools: execution-gas for computation and state-gas for anything that durably grows Ethereum's state trie. It was confirmed finalized during Svalbard interop week, with the fixed-CPSB (cost-per-state-byte) design adopted as part of the Glamsterdam upgrade, according to the Ethereum Foundation's protocol cluster update.<sup>[2](#fn-2)</sup> As the Ethereum Foundation put it: "The core developer gathering occurred in Svalbard, Norway during a week-long interop event," confirming that "EIP-8037 finalized: Fixed cost_per_state_byte adopted."<sup>[2](#fn-2)</sup>

Before this EIP, a single `gas_used` figure described everything a transaction did: computation, calldata, storage writes, contract deployment. EIP-8037 keeps that single figure for reporting, but underneath it, execution and state creation now draw from separate budgets with separate rules.

## What problem does EIP-8037 solve?

State pricing was inconsistent, and the gas-limit roadmap was about to make that inconsistency expensive. Contract deployment cost approximately 200 gas per byte of code, while creating a new storage slot cost approximately 313 gas per byte, two different implicit prices for the same kind of resource: permanent state.

The more urgent driver was throughput. After the December 2025 gas-limit bump from 30M to 60M, daily new state growth roughly tripled, from approximately 105 MiB/day to approximately 326 MiB/day, or approximately 116 GiB/year.<sup>[1](#fn-1)</sup> Extrapolate that growth rate proportionally to Glamsterdam's target 200M gas limit and you get approximately 387 GiB/year of new state. Client teams have flagged 650 GiB as a threshold beyond which state size starts degrading node performance. At that growth rate, the threshold would be breached within about a year of reaching 200M gas.<sup>[1](#fn-1)</sup>

EIP-8037 exists so the gas limit can keep climbing, toward Glamsterdam's "200M gas limit floor," without state growth outrunning what client hardware can handle.<sup>[2](#fn-2)</sup>

## How does multidimensional gas metering work?

The mechanism prices state by its actual on-disk footprint, not by its RLP-encoded length, then charges it from a gas pool that execution can't touch until the pool is exhausted.

**Cost per state byte (CPSB)** is fixed at 1,530, derived from a target growth rate and a reference block gas limit:

```python
total_state_gas_per_year = (gas_limit / 2) × blocks_per_year
CPSB = total_state_gas_per_year / target_state_growth

# reference conditions: 150M block limit, 120 GiB/year target, 50% avg utilization
CPSB = (150,000,000 / 2) × 2,628,000 / 128,849,018,880 ≈ 1,530
```

State byte sizes reflect on-disk footprint, not calldata length:

| State object | Bytes | Composition |
|---|---|---|
| New account | 120 | 32 (hash) + 8 (nonce) + 16 (balance) + 32 (code hash) + 32 (storage root) |
| New storage slot | 64 | 32 (hash) + 32 (value) |
| EIP-7702 delegation | 23 | 3 (`0xef0100` prefix) + 20 (delegate address) |

Multiply bytes by CPSB and you get the new gas costs: `GAS_CREATE` and `GAS_NEW_ACCOUNT` both become `120 × 1,530`, `GAS_STORAGE_SET` becomes `64 × 1,530`, and `GAS_CODE_DEPOSIT` moves from a flat 200 gas/byte to `CPSB` gas/byte.

The pool split happens at transaction validation:

```python
evm_gas = tx.gas - intrinsic_gas
execution_gas_budget = TX_MAX_GAS_LIMIT - intrinsic_gas
gas_left = min(execution_gas_budget, evm_gas)
state_gas_reservoir = evm_gas - gas_left
```

State-gas charges draw from `state_gas_reservoir` first, then from `gas_left` once the reservoir is depleted. Execution-gas charges draw from `gas_left` only, and never touch the reservoir. Refunds follow LIFO order: state-gas refunds credit `gas_left` first, then `state_gas_reservoir`, preventing the two pools from drifting out of sync across a transaction's execution.

At the block level, the two pools are tracked and validated independently:

```python
tx_state_gas = tx_output.evm_state_gas_used
tx_execution_gas = max(tx_gas_used_after_refund - tx_state_gas, calldata_floor_gas_cost)

block_output.block_execution_gas_used += tx_execution_gas
block_output.block_state_gas_used += tx_state_gas

gas_used = max(block_output.block_execution_gas_used, block_output.block_state_gas_used)
# block validity: gas_used <= block.gas_limit
```

This is the detail that matters most in practice: because state-gas and execution-gas no longer compete for the same budget, contracts larger than the informal 7.5kB ceiling that existed under `TX_MAX_GAS_LIMIT` (16.7M) can now deploy. Under the old single-pool model, a large contract's deployment gas and its constructor's execution gas fought over the same number. Now they don't.

## What breaks under EIP-8037?

Three categories of tooling and contracts break under EIP-8037. None of them have bugs. They were built on one assumption, that gas is a single number, and that assumption no longer holds.

**Deterministic deployment factories fail on new chains.** Nick's method, the ERC-2470 singleton factory, and similar deterministic-deployment patterns hardcode gas limits, often around 100,000, calibrated to old account-creation costs. Existing on-chain deployments are unaffected: they already happened, and the state they created already exists. But redeploying that same raw signed transaction to a new Glamsterdam-enabled chain or testnet, the exact scenario that makes these factories useful in the first place, fails, because the hardcoded limit no longer covers the repriced cost.

**Gas estimation needs a second dimension.** Wallets and RPC providers that return a single `eth_estimateGas` number are estimating an artifact that no longer maps cleanly onto how the network prices a transaction. A transaction can run out of `state_gas_reservoir` while `gas_left` sits unused, or vice versa. Tooling that models gas as one scalar will produce estimates that are wrong in ways that don't show up until the transaction reverts on-chain.

**ERC-4337 bundlers relying on `gasleft()` deltas miscount.** The `GAS` opcode returns `gas_left` only; it does not expose `state_gas_reservoir`. Bundler implementations that track consumption by sampling `gasleft()` before and after a call will undercount any transaction that draws from the reservoir, because that consumption is invisible to the opcode. Bundler teams need to explicitly track state-gas charges and refunds rather than inferring them from the delta.

The magnitude is not subtle. EIP-8037 raises costs by approximately 7x for new account creation, approximately 5x for a new storage slot, and approximately 8x for a full 24kB contract deployment.<sup>[1](#fn-1)</sup> At a 0.08 Gwei base fee, creating a new account costs approximately 0.0000147 ETH and a new storage slot costs approximately 0.00000783 ETH, small per-transaction numbers that add up fast for any protocol creating state at volume.

There is one sharper edge case worth naming directly: a plain 21,000-gas ETH transfer to a fresh address still implicitly creates an account, but at a price far below the repriced 183,600 gas (120 bytes × 1,530 CPSB) that account creation is actually supposed to cost. That gap creates an incentive to abuse plain transfers as a cheap account-creation vector. The mitigation, [EIP-2780](https://eips.ethereum.org/EIPS/eip-2780), adds `GAS_NEW_ACCOUNT` to the intrinsic cost of any value transfer to a non-existent account, closing the mispricing rather than leaving it as an exploitable gap.

## Why didn't Ethereum ship a dynamic pricing model instead?

Because the research showed dynamic aggregation only bought modest gains over a simpler fixed design, and the team chose to ship the simpler one. Two ethresear.ch papers by researcher misilva73 explored this question directly. The first modeled elasticities for Ethereum's two resource types using an ARDL model on daily chain data from January 2025 to January 2026: state-creation demand is moderately elastic (ε ≈ 0.3–0.6), while burst compute demand is nearly inelastic (ε ≈ 0.0–0.2), and the two compete for the same block capacity with roughly -0.99 correlation.<sup>[3](#fn-3)</sup>

The second paper used those elasticities to grid-search dynamic aggregation functions, ways of combining state and burst demand into a single per-block price signal, that could theoretically extract more throughput than a fixed multiplier.<sup>[4](#fn-4)</sup> The best asymmetric function reached 1.39x median throughput gain; standard max-based aggregation reached 1.31x; simple summation reached 1.27x. All of these landed far below a theoretical 5x ceiling, because inelastic burst demand doesn't back off much even as its price rises.

EIP-8037 shipped none of that. It adopted a fixed CPSB, with any future repricing handled at fork boundaries rather than computed dynamically per block. The research doesn't claim credit for the final design. Nobody ignored it, either. Protocol design chose a static, auditable mechanism over a more elaborate one, because the elasticity data itself showed the throughput gain was capped well under the theoretical ceiling.

## What should DeFi protocols and tooling builders do now?

Audit hardcoded gas limits in your deployment paths before Glamsterdam activates. Any factory, proxy deployer, or CREATE2 pattern with a fixed gas number calibrated to today's account-creation cost needs re-testing against the repriced values. This is not retroactive: chains that already have your contracts deployed keep working exactly as they do today. It's new deployments, on new Glamsterdam-enabled chains, that hit the wall.

Model the 5-8x multiplier into cost assumptions if your protocol creates state at volume: per-user proxy wallets, factory-deployed pools or vaults, or any pattern where a new position means a new account or a fresh set of storage slots. What used to be a rounding error in gas cost becomes a line item worth budgeting for.

If you run infrastructure that reports gas usage, a single "gas used" column is about to tell less of the story than it used to. Block explorers and trace views that already break gas down by opcode, the way Ethernal's transaction traces do, are positioned to show the execution/state split cleanly once client teams expose both numbers at the RPC layer. Watching that split at the trace level, rather than trusting one aggregate figure, is how you catch a state-gas-heavy transaction before it becomes a deployment failure in production.

Glamsterdam devnets are live as of the Ethereum Foundation's May 2026 update, with no mainnet date confirmed yet.<sup>[2](#fn-2)</sup> That's close enough to test against today, and far enough out that the audit is worth doing before the first "why did my factory revert" surprise shows up in a production deployment. The mental model of gas as one number, where a transfer costs 21,000 and that's the whole story, is already gone for anything that creates state.

## FAQ

### What is CPSB in EIP-8037?

CPSB stands for cost per state byte, fixed at 1,530 gas. It's the single constant EIP-8037 uses to price all state creation, derived from a target state growth rate of 120 GiB/year against a 150M reference block gas limit.

### Does EIP-8037 affect existing deployed contracts?

No. Contracts already deployed on live chains are unaffected, since the state they created already exists. The repricing only applies to new state creation, new accounts, new storage slots, and new contract code, submitted after the fork activates.

### Why can't ERC-4337 bundlers just read `gasleft()` to track state-gas?

The `GAS` opcode returns `gas_left` only. It does not expose `state_gas_reservoir`, so any state-gas consumption drawn from the reservoir is invisible to a bundler sampling `gasleft()` deltas. Bundlers need to explicitly track state-gas charges and refunds separately.

## References

<span id="fn-1">1.</span> Silva, Maria, Carlos Perez, Jochem Brouwer, Ansgar Dietrichs, Łukasz Rozmej, Anders Elowsson, Francesco D'Amato, Dragan Rakita. "EIP-8037: State Creation Gas Cost Increase." _Ethereum Improvement Proposals_. [https://eips.ethereum.org/EIPS/eip-8037](https://eips.ethereum.org/EIPS/eip-8037)

<span id="fn-2">2.</span> "Protocol Cluster Updates, May 2026." _Ethereum Foundation Blog_, May 11, 2026. [https://blog.ethereum.org/2026/05/11/protocol-update-may-26](https://blog.ethereum.org/2026/05/11/protocol-update-may-26)

<span id="fn-3">3.</span> misilva73. "Empirical Analysis of Price Elasticities for Ethereum State and Burst Resources." _ethresear.ch_, February 20, 2026. [https://ethresear.ch/t/empirical-analysis-of-price-elasticities-for-ethereum-state-and-burst-resources/24166](https://ethresear.ch/t/empirical-analysis-of-price-elasticities-for-ethereum-state-and-burst-resources/24166)

<span id="fn-4">4.</span> misilva73. "Optimal Aggregation Functions for EIP-8037 Under Empirical Elasticities." _ethresear.ch_, February 23, 2026. [https://ethresear.ch/t/optimal-aggregation-functions-for-eip-8037-under-empirical-elasticities/24184](https://ethresear.ch/t/optimal-aggregation-functions-for-eip-8037-under-empirical-elasticities/24184)
