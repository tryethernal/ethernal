---
title: "The 2x Mint: When Wrapping a Token Creates Its Own Liquidity"
description: "The 2x mint collapses wrapping and liquidity provision into one transaction. How it works, why deposits can't move prices, and what's unresolved."
date: 2026-07-12
tags:
  - DeFi
  - AMM
  - Ethereum
  - Liquidity
  - Research
keywords: []
image: "/blog/images/liquid-amm-2x-mint-defi-primitive.png"
ogImage: "/blog/images/liquid-amm-2x-mint-defi-primitive-og.png"
status: published
readingTime: 8
---

The 2x mint is a wrapping operation that simultaneously seeds a liquidity pool: deposit one token, and the protocol mints twice the supply, splitting it equally between you and the pool. No separate LP step. No reward token. No two-sided seeding requirement. The wrapping is the liquidity provision.

The problem this solves is familiar. A protocol launches a new token. Before users can trade it, it needs liquidity. Before liquidity arrives, it needs users. The standard solution is liquidity mining: seed a Uniswap pool with two-sided capital (your token plus ETH or USDC), then pay ongoing rewards to attract LPs. Mercenary capital exits the moment rewards stop. Reward emissions add sell pressure. Two-sided seeding requires upfront capital in a second asset most protocols don't have at launch.

A proposal deployed to Ethereum mainnet in March 2026 approaches this differently.<sup>[1](#fn-1)</sup> In the Liquid AMM design by Reinholdtsen, wrapping a token simultaneously provides liquidity to a pool.

## The 2x mint: deposit once, provide liquidity automatically

The core operation is called "heat." When you deposit `n` backing tokens (say, 100 USDC), two things happen in the same transaction:

1. You receive `n` wrapped tokens (100 wUSDC) in your wallet.
2. The pool receives `n` wrapped tokens (100 wUSDC) automatically.

Total minted: `2n`. The pool gets half. You get the other half. This is the 2x mint.

```solidity
// Pseudocode: "heat" (deposit/wrap)
function heat(uint n) external {
    // Pull n backing tokens from caller
    backing.transferFrom(msg.sender, address(this), n);
    // Mint 2n wrapped tokens: n to pool, n to depositor
    wrappedToken.mint(address(pool), n);
    wrappedToken.mint(msg.sender, n);
}
```

The inverse is "cool" (unwrap). When you call cool, the system burns proportionally from both your wallet and the pool, then returns backing tokens based on the current redemption ratio. At equilibrium (the pool holds 50% of total wrapped supply), unwrapping 10 wUSDC burns 5 from you and 5 from the pool, returning 5 USDC.

What you never receive is an LP share token. There are no liquidity provider receipts and no separate LP position to track. The pool gains liquidity as a mechanical byproduct of wrapping.

Compare this to the standard ERC-20 wrap:

```solidity
// Standard wrap: 1:1, no pool involvement
function wrap(uint n) external {
    backing.transferFrom(msg.sender, address(this), n);
    wrappedToken.mint(msg.sender, n); // n to depositor only
}
```

And to Uniswap V2 LP provisioning: deposit both tokens in proportion to the current pool ratio, receive LP tokens in return. Two transactions, two-sided capital, explicit LP position. The 2x mint collapses this into one transaction with one asset.

## Why deposits can't move prices

The result that makes this mechanism work is a property described in the proposal: a 2x mint or 2x burn preserves the ratio of pooled tokens to total supply, regardless of system state.<sup>[1](#fn-1)</sup>

Walk through the numbers.

Starting state:
- Pool holds 50 wUSDC
- Lake (total wrapped supply outside pool) holds 50 wUSDC
- Constant-product invariant: `pool × lake = 50 × 50 = 2500`
- Ratio: pool / total supply = 50 / 100 = 50%

Deposit 10 USDC (heat):
- Pool receives 10 wUSDC: pool = 60
- Depositor receives 10 wUSDC: lake = 60
- New invariant: `60 × 60 = 3600`
- Ratio: 60 / 120 = 50%

The ratio is unchanged. The price implied by the constant-product formula is unchanged. Liquidity depth increased (k went from 2500 to 3600), but the exchange rate between wUSDC and any other asset did not move.

The corollary is what the author calls orthogonality: deposits and withdrawals are in a different dimension from trades. Deposits change liquidity depth without moving price. Trades move price without changing depth. The two operations do not interfere.

This is different from Uniswap V2 LP provisioning. Adding liquidity to a Uniswap V2 pool requires depositing both tokens in exact proportion to current reserves. If you deposit off-ratio (because the ratio shifted between your quote and your transaction, or because you only have one asset), the pool either rejects the transaction or you're left exposed to price movement between block times. At scale, Uniswap V2 LP is a two-sided coordination problem that requires either oracle-priced deposits or careful timing.

The 2x mint bypasses this. You bring one asset. The ratio preservation math guarantees the deposit cannot move the price.

On impermanent loss: because deposits don't move the price, the deposit operation itself does not trigger IL. Impermanent loss can only accumulate from subsequent trades that shift the pool's price away from your deposit price. The source of IL is the same as any AMM, but the deposit is not one of those sources.

## Star topology: n pools instead of n²

All Liquid AMM pools connect through a single Hub contract. To trade wrapped-A for wrapped-B, you route through two hops:

1. Swap wrapped-A for Hub tokens in Pool A
2. Swap Hub tokens for wrapped-B in Pool B

This is a star (hub-and-spoke) topology: `n` pools for `n` assets, instead of `n × (n-1) / 2` pools for pairwise coverage. Adding a new token requires deploying one pool to connect to the Hub, not one pool for every existing token.

| Property | Liquid AMM (star) | Uniswap V2 (pairwise) |
|---|---|---|
| Pool count for n assets | n | n × (n-1) / 2 |
| Hops per trade | 2 | 1 |
| Slippage | Compounds across 2 hops | Direct |
| Adding 1 new token | 1 pool | n-1 new pools |

The slippage trade-off is real. A trade that would move price by 1% on a direct pair compounds through two pools in Liquid AMM. For large trades, two-hop compounding is a meaningful cost. For small trades or thinly traded assets where pairwise pools would be illiquid anyway, the consolidated depth of the Hub may offset the extra hop.

The Hub contract also introduces concentration risk. A bug in the Hub affects every pool in the system simultaneously. In a pairwise model, pools fail independently. This is a known trade-off in hub-and-spoke network design: lower link count, single point of failure. The design accepts it explicitly in exchange for operational simplicity.

The Hub is deployed on Ethereum mainnet at `0x429a58602817Fa79Bbdcf56d8986Fa66CFC44F8a`.

## Zero fees: what actually compensates liquidity providers?

In Liquid AMM, LP compensation comes from the 2x mint itself: depositing 100 USDC yields 100 wUSDC in your wallet and 100 wUSDC in the pool, giving you 2x economic value upfront rather than ongoing swap fees. As Reinholdtsen states in the proposal, "there is no fee parameter, no fee switch, and no governance mechanism to introduce one."<sup>[1](#fn-1)</sup>

Traditional AMMs pay LPs a per-swap fee. Uniswap V2 charges 0.3%<sup>[2](#fn-2)</sup>. Uniswap V3 offers tiers from 0.01% to 1%<sup>[4](#fn-4)</sup>. Curve charges 0.04% on stable pools<sup>[3](#fn-3)</sup>. These fees accumulate in the pool and are claimable proportionally by LP position holders as long as capital is deployed.

When you deposit 100 USDC, you receive 100 wUSDC while contributing 100 wUSDC to a pool you have a pro-rata claim on. You received 200 wUSDC worth of economic value from 100 USDC of backing. If wUSDC trades at a premium to its backing-implied price, that premium is the implicit LP payment.

The self-correcting mechanism:

- When the pool drops below 50% of total wrapped supply, wUSDC trades at a discount. Wrapping USDC to collect the 2x mint bonus becomes profitable. Arbitrageurs wrap, refilling the pool.
- When the pool exceeds 50%, wUSDC trades at a premium. Unwrapping becomes profitable. Arbitrageurs unwrap, draining the pool back toward equilibrium.

No active LP incentives required. Arbitrage enforces equilibrium.

Reinholdtsen explicitly raises the open question: is a one-time deposit bonus equivalent to ongoing fee income?<sup>[1](#fn-1)</sup> A traditional LP earns fees continuously as long as capital stays deployed. The 2x mint pays the bonus once at deposit time. If that bonus is fully priced in immediately by arbitrage (the rational expectation in an efficient market), what incentive does the initial depositor have to remain LP rather than withdrawing their position?

This is unresolved, and I think it's the most interesting open problem in the design. Curve's 0.04% fee on a $100M stablecoin pool generates meaningful daily yield for patient LPs. Whether the 2x mint deposit premium produces equivalent retention is an empirical question that has not been tested at scale.

## Open engineering questions

The Hub is on mainnet, but Reinholdtsen marks the design as unaudited and experimental. The open questions are substantial enough to hold production deployment decisions.

The reentrancy question is non-trivial. "Heat" mints tokens to both the depositor and the pool in one transaction. Whether an attacker can interrupt between those two mints, leaving the pool with one side credited and the other pending, requires analysis specific to this dual-mint pattern. Checks-effects-interactions and a reentrancy guard are the standard answer, but standard ERC-20 analysis wasn't written for this.

Two-hop slippage compounds. That 1% price impact on a direct pair becomes worse across two hops in Liquid AMM. For small trades or thinly traded assets, the Hub's consolidated depth probably compensates. For large treasury rebalances, it may not. The slippage ceiling depends on Hub liquidity depth, which depends on depositor behavior, which circles back to the LP retention question.

A Hub bug means every pool fails at once. Pairwise AMMs fail independently, which limits blast radius. This isn't a reason to dismiss the design, but it means the Hub's audit scope is the entire system's critical path, not just one component.

LP retention without ongoing fees is the hardest question to answer without live data. If depositors withdraw after collecting their 2x bonus and the premium normalizes, pool depth declines. Protocol-owned liquidity (a DAO locking treasury assets permanently) sidesteps this cleanly: the DAO does not exit. Retail LP participation reintroduces the standard liquidity mining exit dynamic, just delayed by one mechanism step.

Where the design is genuinely useful if those questions resolve:

- Protocol-owned liquidity at launch, without two-sided seeding or ongoing reward emissions
- Token pairs that would otherwise require n-1 pool deployments per new asset
- Fee-free trading surfaces where extractable MEV from LP fee distribution is an active concern

## Inspecting the primitive on-chain

The Hub contract is live and inspectable at `0x429a58602817Fa79Bbdcf56d8986Fa66CFC44F8a` on Ethereum mainnet. You can verify the structural claims without trusting the documentation.

With a block explorer connected to mainnet you can:

- Read pool state to confirm `pool × lake = k` holds across current deployed pools, checking the ratio preservation theorem against live contract storage
- Trace any "heat" transaction through its event logs to verify the 2x mint: two token mint events in a single transaction, one to the depositor's address, one to the pool address
- Follow a two-hop swap (A to Hub to B) through its call tree to see both legs execute and the Hub token mint and burn in the middle

This is what block explorers are suited for: reading contract storage at any block height, following token flows across internal calls, verifying that math in a proposal matches code on-chain. The ratio preservation theorem is checkable directly from storage state without running a simulation. [Ethernal](https://tryethernal.com) connects to any EVM-compatible node including Ethereum mainnet, and gives you the storage reader, call tracer, and event log decoder to run this check without a local node setup.

The Liquid AMM is not production-ready. The open questions above are real, and unaudited means exactly that. But the mechanism is deployed and inspectable, which is better than a whitepaper. The ratio preservation math holds for the cases described, and the orthogonality of deposits and trades is a structural property worth understanding as a DeFi engineer regardless of whether this specific implementation matures.

---

## References

<span id="fn-1">1.</span> Reinholdtsen. "Liquid AMM introduction: 2x mint, star topology, zero fees." _Ethereum Magicians_, March 8, 2026. [https://ethereum-magicians.org/t/liquid-amm-introduction-2x-mint-star-topology-zero-fees/27916](https://ethereum-magicians.org/t/liquid-amm-introduction-2x-mint-star-topology-zero-fees/27916)

<span id="fn-2">2.</span> Uniswap. "How Uniswap Works." _Uniswap V2 Docs_, 2020. [https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/how-uniswap-works](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/how-uniswap-works)

<span id="fn-3">3.</span> Curve Finance. "Understanding Curve Fees." _resources.curve.fi_. [https://resources.curve.fi/base-features/understanding-fees/](https://resources.curve.fi/base-features/understanding-fees/)

<span id="fn-4">4.</span> Uniswap. "Fee Tiers." _Uniswap V3 Docs_. [https://docs.uniswap.org/concepts/protocol/fees](https://docs.uniswap.org/concepts/protocol/fees)
