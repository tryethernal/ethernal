---
title: "Ethereum's Gas Limit Jumped 5x. Your Keeper Bots Didn't Notice."
description: "New elasticity data shows why EIP-8037's gas pricing barely cuts costs for liquidation bots and keepers, while state-heavy DeFi operations get pricier."
date: 2026-03-18
tags:
  - Ethereum
  - EIP-8037
  - Gas
  - Fee Markets
  - DeFi
  - Mechanism Design
keywords: []
image: "/blog/images/eip-8037-elasticity-keeper-bots.png"
ogImage: "/blog/images/eip-8037-elasticity-keeper-bots-og.png"
status: published
readingTime: 8
---

Gas-limit increases don't make liquidation keepers or other automated bots cheaper to run, even when the limit jumps several multiples higher. A lending protocol's ops team saw this firsthand the week Glamsterdam activated on a public testnet: the gas limit floor moved to 200M, nominally more than three times what mainnet ran a year earlier, and they expected their liquidation keeper, the bot that watches collateral ratios and fires off `liquidate()` calls the moment a position goes underwater, to get cheaper to run. It didn't. Six months of data later, the keeper's per-call cost is flat. Meanwhile, the protocol's "open a new vault" flow, the one that writes a fresh set of storage slots for every new user, got more expensive, not less.

Nobody misconfigured anything. This is what two pieces of 2026 Ethereum research predicted would happen, for reasons that have nothing to do with gas limits and everything to do with who actually changes their behavior when price moves.

## What EIP-8037 changed, briefly

[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) split Ethereum's gas accounting into two pools: execution gas for computation, and state gas for anything that durably grows the state trie (new accounts, new storage slots, new contract code). Each pool prices and validates independently, which is what lets the overall gas limit climb without state growth outrunning what client hardware can handle. We covered the mechanism itself, the CPSB (cost-per-state-byte) constant and the pool-splitting logic, in an [earlier deep dive on the EIP](/blog/eip-8037-multidimensional-gas-metering).

That design was built on a specific assumption: that state demand and execution demand each respond to their own price, the way a normal isoelastic demand curve is supposed to. Two ethresear.ch posts published in February 2026 by independent researcher misilva73 tested that assumption against real mainnet data. The results reframe what "more gas capacity" actually buys a DeFi protocol.

## State and burst demand aren't independent, they're substitutes

The first paper<sup>[1](#fn-1)</sup> ran an ARDL regression on daily Ethereum mainnet data from January 2025 to January 2026, using three real gas-limit increases (30M→36M, 36M→45M, 45M→60M) as natural experiments. The headline number: state-resource usage and burst-resource usage move with a correlation of approximately −0.99.<sup>[1](#fn-1)</sup>

That's not noise. It's the signature of two things competing for one shared budget rather than two independent markets. Most multidimensional fee-market designs, EIP-8037 included, model state demand and burst demand as separate isoelastic curves: `S(p) = A_s · p^(-ε_s)` for state, `B(p) = A_b · p^(-ε_b)` for burst. The data fits a capacity-constrained model better, where total demand hits a fixed block capacity and the *allocation* between state and burst shifts with relative price, rather than each resource having its own independent appetite.

Think of it less as two faucets and more as two taps on one pipe. Lowering the price on one tap doesn't create water, it just changes which tap people reach for.

The paper backs out structural, per-resource elasticities from the easier-to-measure aggregate elasticity using a simple identity:

```
ε_b = ε_agg − q₀·η
ε_s = ε_agg + (1−q₀)·η
```

where `q₀ ≈ 0.23` is the baseline state share of gas and `η ≈ 0.43` is the long-run elasticity of that share with respect to relative price. Plugging in the measured aggregate elasticity gives state demand elasticity ε_s ≈ 0.51 and burst demand elasticity ε_b ≈ 0.08.<sup>[1](#fn-1)</sup> State creation responds to price, modestly. Burst compute, the category covering most ordinary contract calls, barely does.

## Keeper bots are the least price-sensitive demand of all

A separate study answers a question the ethresear.ch post doesn't: *who* makes up that near-inelastic burst demand. Pranay Anchuri and Akaki Mamageishvili used instrumental-variable panel regression, a method designed to strip out the confound where price and demand move together because of congestion, to estimate causal gas elasticity on Ethereum L1 and Arbitrum L2.<sup>[2](#fn-2)</sup>

| Chain | Pooled causal elasticity | Reading |
|---|---|---|
| Ethereum L1 | −0.006 | A 10% fee increase cuts gas demand by about 0.06% |
| Arbitrum L2 | −0.036 | More responsive than L1, still near-inelastic |

Both numbers are close to zero. But the more useful finding, for anyone running DeFi infrastructure, is the breakdown by wallet behavior. The study separates "always-on protocol wallets," keeper bots, liquidation engines, oracle updaters, arbitrage bots, from a second cluster the paper labels high-volume operators, and finds the always-on cohort is the *most* price-insensitive segment measured. Anchuri and Mamageishvili describe the contrast directly: their "behavioral clustering identifies always-on protocol wallets as near-inelastic and high-volume operators as substantially more responsive, with cluster-level elasticities up to roughly 6x the pooled estimate."<sup>[2](#fn-2)</sup>

That is a precise, uncomfortable finding for protocol teams: the actors least likely to change behavior when gas prices move are exactly the automated infrastructure DeFi protocols depend on to keep positions solvent. Your liquidation bot was never going to back off because gas got cheaper. It also was never going to back off because gas got more expensive, which is the good half of this. But it means a gas-limit increase aimed at "more capacity for everyone" doesn't translate into "cheaper keeper operations," because keeper operations were never the part of demand that was price-constrained in the first place.

## What this does to the aggregation function, and the real throughput number

Here's the number that matters: modeled against the elasticities above, a 5x nominal gas-limit increase delivers only 1.27x to 1.39x more actual throughput, not 5x, no matter which gas-pricing formula EIP-8037 uses.<sup>[3](#fn-3)</sup> The second misilva73 paper<sup>[3](#fn-3)</sup> arrives at that number by asking a mechanism-design question: given that burst demand barely moves with price, which formula for combining state-gas price and burst-gas price into one blended signal actually delivers on EIP-8037's throughput promise? Four candidates were tested:

| Aggregation function | Design |
|---|---|
| Sum | Resources share block space additively, no differentiation |
| Max | The more congested resource alone sets the price |
| Asymmetric Max | Adds a tunable state weight to de-emphasize state's pull on price |
| Asymmetric Euclidean | Smooth L2-norm blend, avoids the kinks of max-based functions |

The equilibrium condition for the asymmetric max function illustrates the shape of the problem:

```
max(w_s · s · m^(1-ε_s) · r^(-ε_s), w_r · (1-s) · r^(-ε_b)) = n
```

where `m` is the repricing multiplier, `r` the relative price ratio, `s` state's baseline share of demand, and `n` normalized total demand. Solving that condition for all four candidates, calibrated to the real elasticities measured above, is what produces the 1.27x-1.39x median throughput figure above.<sup>[3](#fn-3)</sup> A robustness sweep across 25 elasticity-pair combinations held state growth at or below the 100 GiB/year design target in every case, but throughput gains never approached the nominal number in any of them.<sup>[3](#fn-3)</sup>

The equilibrium price shifts explain why. Under the calibrated repricing multipliers (m=25 for sum, m=30 for max, m=45 for the asymmetric functions), burst-gas operations settle at roughly 4-9% of their current baseline price, while state-gas operations rise 1.6x to 2.3x above baseline.<sup>[3](#fn-3)</sup> Burst gas gets dramatically cheaper on paper. Almost none of that shows up as more usable burst throughput, because the demand that would need to respond to the lower price doesn't respond to price at all. EIP-8037 ultimately shipped a fixed CPSB constant rather than any of these dynamic functions, precisely because the measured gains were this capped.

## What protocol teams should actually do with this

Stop treating a gas-limit increase as a blanket discount. Split your own cost model the way the protocol now splits gas: state-light, execution-heavy operations (price checks, liquidation triggers, oracle pushes, most keeper loops) get cheaper roughly in line with burst-gas repricing, landing near 4-9% of today's baseline at equilibrium. State-heavy operations (new vault positions, new user onboarding, factory-deployed proxy wallets) get more expensive, potentially 1.6-2.3x baseline, not less.

Budget for state cost at the per-feature level, not the per-protocol level. A protocol with both a state-light keeper layer and a state-heavy onboarding flow will see those two cost lines move in opposite directions under the same upgrade. Modeling them as one blended "gas cost" line will hide that.

Don't expect lower aggregate gas prices to change keeper behavior, and don't design incentive mechanisms that assume it will. The elasticity data says your automated infrastructure's gas usage is a function of how many trigger conditions fire, not of the prevailing price. If you want to change keeper gas spend, change the trigger logic or the polling frequency, not the fee market.

This is also a visibility problem before it's a budgeting problem. A single "gas used" figure per transaction doesn't tell you which side of the split a given call landed on. Tooling that breaks gas down by execution versus state at the trace level, which is the direction transaction tracing in block explorers is headed as clients start exposing both numbers, is what makes this kind of per-feature budgeting possible instead of theoretical.

## Is this settled, or early research?

Early. Both ethresear.ch posts were published in February 2026 with minimal public engagement so far, one brief supportive comment on the aggregation-function post, no substantive rebuttal yet.<sup>[3](#fn-3)</sup> That's worth stating plainly: this is the first empirical test of a theoretical claim, not a settled result. The theoretical claim being tested, from Angeris, Diamandis, and Moallemi, is that a simple EIP-1559-style update rule applied per-resource achieves near-optimal welfare against an oracle with perfect foresight, and the paper states that bound holds regardless of demand elasticity, even against an adversarial demand process.<sup>[4](#fn-4)</sup> The empirical finding doesn't contradict that proof; it just shows what the bound is worth in practice when burst demand is this inelastic. Being close to optimal welfare and delivering a large real-world throughput gain are not the same promise, and Ethereum's measured elasticities are why the gap between them shows up here. Optimal theory and underwhelming real-world throughput are not a contradiction. They're a reminder that a welfare bound and a throughput target answer different questions.

The open question is whether this is Ethereum-specific. Mainnet's demand mix, heavy with keeper bots, arbitrage searchers, and liquidation engines, may simply be more automated and less price-sensitive than a typical L2's or app-chain's. As more chains adopt multi-pool gas designs similar to EIP-8037, the elasticity numbers reported here are a baseline worth re-measuring rather than assuming hold everywhere.

## FAQ

### Does EIP-8037 make gas cheaper for DeFi protocols?

Not uniformly. Equilibrium modeling puts burst-gas operations (most keeper and execution-heavy calls) at roughly 4-9% of their current baseline price, while state-gas operations (new accounts, new storage slots, new contract deployments) rise 1.6x to 2.3x above baseline.<sup>[3](#fn-3)</sup> Whether a given protocol gets cheaper or more expensive depends on its mix of state-heavy versus execution-heavy operations.

### Why don't keeper bots and liquidation engines respond to lower gas prices?

Measured elasticity for burst/execution demand is approximately 0.08, close to zero, meaning usage barely changes even when price falls substantially.<sup>[1](#fn-1)</sup> A separate causal study found "always-on protocol wallets," the category covering keeper bots, liquidation engines, and oracle updaters, are the single least price-sensitive wallet cohort measured on both Ethereum L1 and Arbitrum L2.<sup>[2](#fn-2)</sup>

### Why did a 5x nominal gas-limit increase only deliver 1.3x more throughput?

Because the achievable throughput gain from any gas-pricing mechanism is capped by how much demand actually shifts when price changes, and burst demand shifts very little. Modeling across four aggregation functions and 25 elasticity-pair combinations found median throughput gains of 1.27x to 1.39x, versus a theoretical 5x ceiling implied by the nominal gas-limit multiplier.<sup>[3](#fn-3)</sup>

## References

<span id="fn-1">1.</span> misilva73. "Empirical Analysis of Price Elasticities for Ethereum State and Burst Resources." _ethresear.ch_, February 20, 2026. [https://ethresear.ch/t/empirical-analysis-of-price-elasticities-for-ethereum-state-and-burst-resources/24166](https://ethresear.ch/t/empirical-analysis-of-price-elasticities-for-ethereum-state-and-burst-resources/24166)

<span id="fn-2">2.</span> Anchuri, Pranay, and Akaki Mamageishvili. "Price Elasticity of Gas Demand on L1 and L2: Evidence from Ethereum and Arbitrum." _arXiv_, 2026. [https://arxiv.org/abs/2606.13555](https://arxiv.org/abs/2606.13555)

<span id="fn-3">3.</span> misilva73. "Optimal Aggregation Functions for EIP-8037 Under Empirical Elasticities." _ethresear.ch_, February 23, 2026. [https://ethresear.ch/t/optimal-aggregation-functions-for-eip-8037-under-empirical-elasticities/24184](https://ethresear.ch/t/optimal-aggregation-functions-for-eip-8037-under-empirical-elasticities/24184)

<span id="fn-4">4.</span> Angeris, Guillermo, Theo Diamandis, and Ciamac Moallemi. "Multidimensional Blockchain Fees are (Essentially) Optimal." _arXiv_, February 2024 (revised May 2024). [https://arxiv.org/html/2402.08661](https://arxiv.org/html/2402.08661)
