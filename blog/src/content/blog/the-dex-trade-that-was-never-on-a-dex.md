---
title: "The DEX Trade That Was Never on a DEX"
description: "Most 'DEX aggregator' swaps now settle against off-chain market maker quotes, not AMM pools. Here's what RFQ liquidity means for on-chain trust."
date: 2026-08-23
tags:
  - DeFi
  - RFQ
  - Market Makers
  - AMM
  - DEX Aggregators
keywords: []
image: "/blog/images/the-dex-trade-that-was-never-on-a-dex.png"
ogImage: "/blog/images/the-dex-trade-that-was-never-on-a-dex-og.png"
status: published
readingTime: 7
---

You swap 50 ETH for USDC on a mainstream DEX aggregator. The quote shows zero slippage. The trade fills in under a second. You assume it routed through a Uniswap or Curve pool, the way DEX trades have worked since 2020.

It didn't. A market maker looked at its Binance order book, signed a price, and your transaction settled that signature on-chain. No AMM curve moved. No pool reserves changed. The "decentralized exchange" you traded on sourced its price from a centralized one.

This isn't a bug or an edge case. For a growing share of DEX volume, it's the default. The question worth asking is what "decentralized" actually means when the price behind your trade came from an off-chain signature, and what you can verify about that signature after the fact.

## What actually happens when you swap on a DEX now

A modern DEX aggregator doesn't just route across AMM pools anymore. It exposes the union of every on-chain pool it can reach, plus a network of professional market makers (PMMs) like Wintermute, GSR, Amber, and B2C2 who quote prices against inventory they hold on centralized exchanges. This is the Request-for-Quote (RFQ) model, and it settles on-chain even though the price discovery happens off it.

Hashflow's RFQ flow is a clean example of the mechanics. When you request a quote, the market maker returns a signed struct:

```json
{
  "messageType": "quote",
  "rfqId": "string",
  "pool": "string",
  "baseToken": "string",
  "quoteToken": "string",
  "baseTokenAmount": "string",
  "quoteTokenAmount": "string",
  "fees": "string",
  "quoteExpiry": "number"
}
```

If you accept, your wallet signs a matching request and the market maker's signature settles the trade:

```json
{
  "quoteData": {
    "txid": "string",
    "pool": "string",
    "baseToken": "string",
    "quoteToken": "string",
    "baseTokenAmount": "string",
    "quoteTokenAmount": "string",
    "quoteExpiry": "number",
    "trader": "string",
    "nonce": "number"
  }
}
```

Because the market maker signs an exact price before you submit the transaction, whatever amount was quoted is what settles.<sup>[1](#fn-1)</sup> There's no slippage tolerance to set because there's no price movement between quote and fill to protect against. That's structurally the opposite of an AMM, where the price is on-chain state you can recompute yourself from pool reserves at any block. In RFQ, the price is a signature you take on faith, then verify the signer address and expiry after the fact.

1inch's Fusion mode runs the same pattern under different vocabulary. Instead of "market makers," 1inch calls them resolvers, who compete in a Dutch auction to fill your order and "may pull liquidity from DEXs, CEXs, and private pools."<sup>[2](#fn-2)</sup> On illiquid pairs, the auction surfaces market makers who hold no on-chain pool at all, producing fills a pure AMM router could never find.

## How much of "DeFi" is actually this

A March 2025 empirical study, "Execution Welfare Across Solver-based DEXes," quantifies how much solver and RFQ platforms actually improve on AMM routing, and where that improvement comes from.<sup>[3](#fn-3)</sup> The authors define execution welfare as the percentage of additional output a trade gets from a solver-based DEX compared to routing the same trade through a single AMM pool, net of gas.

The results split sharply by asset type and by liquidity source:

| Metric | CoWSwap | UniswapX |
|---|---|---|
| Liquidity source | 85%+ AMM-sourced | 85%+ PMM-sourced |
| Short-tail (USDC-WETH) vs. Uniswap V2 | 500+ bps improvement on large trades | Improves with trade size |
| Vs. Uniswap V3 | Marginal to zero | Marginal to zero |
| Vs. trading directly on Binance | Still underperforms | Still underperforms |

Two platforms both marketed as "DEX aggregators" source their liquidity in structurally opposite ways: CoWSwap fills mostly from on-chain AMM pools, UniswapX fills mostly from off-chain market makers. The label doesn't tell you which one you're getting.

The paper's most important finding sits underneath the headline numbers: even the best solver-based execution studied still underperforms trading directly on Binance, showing "predominantly negative markout" across venues, most pronounced on smaller trades.<sup>[3](#fn-3)</sup> The market maker backing your fill is, by definition, pricing in a margin for taking the other side of your trade. You're not beating the CEX price. You're paying a spread to access it without leaving your wallet.

There's a concentration fact in the data that matters for anyone treating RFQ liquidity as a resilient primitive: two solvers, SCP and Wintermute, account for more than 90% of UniswapX's volume.<sup>[3](#fn-3)</sup> A UI that looks like it's routing across a decentralized field of market makers is, in practice, routing through two counterparties most of the time.

One catch for anyone reading the paper's headline numbers uncritically: the dataset only includes filled orders, which introduces a selection bias if sophisticated solvers decline unfavorable flow before it's recorded, and neither the welfare metric nor the fee comparison nets out token incentive programs like CoWSwap's roughly 16 million $COW paid annually or 1inch's roughly 10 million $1INCH, which subsidize execution quality in ways that don't show up in a spread calculation.<sup>[3](#fn-3)</sup>

## The pattern is spreading downmarket

RFQ-against-CEX-inventory isn't limited to the top three or four aggregators anymore. YAKZ, a small independent project unaffiliated with any major aggregator, launched a public testnet on BSC on March 4, 2026, built on exactly this mechanism: it captures CEX prices via Fill-or-Kill orders rather than a price oracle, and executes the DEX side with slippage-based routing.<sup>[4](#fn-4)</sup> The team, affiliated with Dalos Network, reports order fill times of 850 to 1000 milliseconds and an 82% success rate in testing, with a single WETH-USDT pair live on testnet.<sup>[5](#fn-5)</sup>

Treat those numbers as an early, unaudited, single-pair signal, not a product recommendation. There are no published smart contract interfaces, no audits, and no settlement spec beyond the gitbook description. But that's exactly what makes YAKZ useful as evidence: the RFQ-against-CEX pattern is now simple enough for a small team to ship on a testnet in weeks. When the primitive is "get a signed price, settle a transfer," expect more entrants building versions of it, and expect the question "is this actually decentralized liquidity" to matter more, not less, as it spreads to teams without Wintermute's compliance and inventory management infrastructure behind them.

## What's actually verifiable on-chain

An AMM swap leaves a complete, self-contained audit trail. Reserves before and after are on-chain state. Anyone can recompute the execution price independently from the pool's constant-product or concentrated-liquidity formula at the block in question. If the price looks wrong, you can prove it wrong from public data alone.

An RFQ fill leaves a thinner trail: signer address, input and output amounts, an expiry, and a nonce. A trace can confirm the signature is valid, the nonce wasn't reused, and the transaction executed before expiry. It cannot tell you whether the quoted price was fair relative to what the market maker could see on Binance at the moment of signing, or whether the market maker actually held or hedged the inventory it was quoting against. That information exists, if it exists at all, in a system you can't query from a block explorer.

This is a different observability gap than the one created by oracle-style execution gateways for programmable trading, where the challenge is correlating an on-chain request with an off-chain proof-backed callback across blocks.<sup>[6](#fn-6)</sup> Here, the settlement transaction looks identical to an ordinary token transfer. There's no proof bundle to check, no callback to correlate. The gap isn't in tracing the transaction. It's in the transaction not carrying evidence of the one thing that actually determined your outcome: whether the price was fair when it was signed.

The trader who got a zero-slippage fill from a "DEX" today likely got a genuinely good outcome. The execution welfare data backs that up for short-tail assets. But they had no on-chain way to check it, and neither did anyone auditing the transaction after the fact. As RFQ and PMM liquidity keep growing as a default DeFi primitive rather than a niche route, that's the gap tooling needs to close: not just decoding what a signed-quote settlement did, but giving traders and auditors a way to check what it should have done.

## References

<span id="fn-1">1.</span> LogRocket. "How to Market Make and Transact with Hashflow." _blog.logrocket.com_, 2026. [https://blog.logrocket.com/how-to-market-make-transact-hashflow/](https://blog.logrocket.com/how-to-market-make-transact-hashflow/)

<span id="fn-2">2.</span> Eco.com. "Best DEX Aggregators in 2026: 1inch, Jupiter, ParaSwap, and More." _eco.com/support_, 2026. [https://eco.com/support/en/articles/13314092-best-dex-aggregators-in-2026-1inch-jupiter-paraswap-and-more](https://eco.com/support/en/articles/13314092-best-dex-aggregators-in-2026-1inch-jupiter-paraswap-and-more)

<span id="fn-3">3.</span> Yuminaga, Yuki, Dex Chen, and Danning Sui. "Execution Welfare Across Solver-based DEXes." _arXiv:2503.00738_, March 2, 2025. [https://arxiv.org/abs/2503.00738](https://arxiv.org/abs/2503.00738)

<span id="fn-4">4.</span> alibertay. "DEX - CEX Aggregator: YAKZ." _Ethereum Magicians_, March 4, 2026. [https://ethereum-magicians.org/t/dex-cex-aggregator-yakz/27897](https://ethereum-magicians.org/t/dex-cex-aggregator-yakz/27897)

<span id="fn-5">5.</span> Dalos Network. "YAKZ Documentation." _dalos-network.gitbook.io_, 2026. [https://dalos-network.gitbook.io/yakz/](https://dalos-network.gitbook.io/yakz/)

<span id="fn-6">6.</span> 0x1cc. "What If Smart Contracts Could Trade on Binance? Introducing the DeCeFi Paradigm." _Ethereum Research_, February 11, 2026. [https://ethresear.ch/t/what-if-smart-contracts-could-trade-on-binance-introducing-the-decefi-paradigm/24102](https://ethresear.ch/t/what-if-smart-contracts-could-trade-on-binance-introducing-the-decefi-paradigm/24102)
