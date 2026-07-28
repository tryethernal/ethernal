---
title: "Zero-Capital Bootstrapping: The Stablecoin That Mints Its Own Equity Layer"
description: "A Feb 2026 ethresear.ch proposal co-issues a T-bill stablecoin and equity token, seeding their own Uniswap v4 pool with zero external capital."
date: 2026-07-28
tags:
  - DeFi
  - Stablecoins
  - Research
  - Tokenization
  - AMM
keywords: []
image: "/blog/images/tokenized-t-bill-stablecoin-protocol-equity.png"
ogImage: "/blog/images/tokenized-t-bill-stablecoin-protocol-equity-og.png"
status: published
readingTime: 7
---

Co-minting a stablecoin (STABLE) and an equity token (EQUITY) simultaneously into a protocol-seeded Uniswap v4 pool, with zero external capital, is the core mechanism in a February 2026 ethresear.ch proposal.<sup>[1](#fn-1)</sup> No treasury seed, no controlling private key, and no external liquidity required. Real user demand and T-bill collateral deposits fill in legitimacy afterward. The problem it addresses: if protocol revenue flows to a DAO multisig or founding team, you've recreated the centralization problem; if you issue a governance token separately and seed a pool manually, you need capital you don't have.

## The yield capture problem

The yield capture problem is the structural gap where stablecoin holders receive no exposure to protocol revenue. Tether and Circle collectively earned more than $10B in 2024 from T-bill yield on stablecoin collateral,<sup>[2](#fn-2)</sup> while token holders received nothing.

Yield-passing tokens like BlackRock's BUIDL ($2.4B AUM),<sup>[3](#fn-3)</sup> Ondo's USDY, and Franklin Templeton's BENJI improved on this: they distribute T-bill yield directly to holders. But they only distribute yield. Fees, operational surplus, and other protocol revenue still flow to the issuing company, not to publicly tradeable token holders.

The gap is structural. Owning USDC gives you no exposure to Circle's earnings. The closest traditional analog: owning a bank's deposits rather than its stock. Deposits are stable. Stock is where the upside lives. On-chain, the "stock" equivalent for a stablecoin protocol doesn't exist in publicly tradeable form with verifiable on-chain claims.

The proposal calls this the yield capture problem, and answers it with a specific architecture: a stablecoin and an equity token, co-issued and co-bootstrapped from the same protocol.

## Architecture: four contracts, two tokens

The system has two tokens:

- `STABLE`: redeemable 1:1 against T-bill collateral deposited by users
- `EQUITY`: a pro-rata claim on all future protocol revenue, freely tradeable

And four contracts:

| Contract | Function |
|---|---|
| Core | Minting/redemption, collateral accounting, circuit breakers |
| StakingVault | ERC-4626 vault; equity stakers deposit here to receive distributions |
| LiquidityVault | Protocol-owned position that seeds stablecoin AMM liquidity over time |
| UniswapV4Pool | STABLE/EQUITY pair with protocol-only LP, enforced by a custom hook |

The staking vault follows the [ERC-4626](https://ethereum.org/developers/docs/standards/tokens/erc-4626/) interface, making it composable with existing yield aggregators. Revenue flows to stakers from four sources:

1. T-bill yield, extracted via overcollateralization minting (described below)
2. Uniswap LP trading fees from the protocol-owned LP position
3. Mint and redemption fees paid by users interacting with Core
4. Any other external protocol revenue

Configurable parameters (target collateral ratio, stablecoin burn percentage, liquidity vault allocation, mint/redemption fees, harvest caller reward) are bounded by immutable constraints set at deployment. Governance can tune within those ranges but cannot break core invariants.

## The cold-start trick

The cold-start trick is co-minting both STABLE and EQUITY simultaneously with no external capital, depositing them as a 50/50 Uniswap v4 LP position, and letting real demand validate the price.

Every two-token protocol faces the same problem at launch: the equity token needs liquidity to have price discovery, but nobody provides liquidity without evidence of protocol revenue, and the protocol has no revenue without users. The standard playbook is to seed a pool with treasury capital or raise external funding, which concentrates equity in whoever controls that capital.

The proposal takes a different path. At initialization:

1. Core mints N `STABLE` and N `EQUITY` simultaneously, from nothing. No external capital required.
2. Both are deposited into a Uniswap v4 pool as a 50/50 LP position, which the protocol retains.
3. The pool exists. Price discovery is live. Neither token is backed by anything real yet.

Then real demand does the work:

4. Users who want `STABLE` can buy from the AMM (paying EQUITY or other tokens) or mint directly through Core by depositing tokenized T-bills as collateral.
5. As direct minting grows, real T-bill collateral accumulates in Core. The bootstrap `STABLE` becomes a progressively smaller fraction of total supply.
6. At equilibrium, the bootstrap tokens are negligible against a fully-collateralized supply.

```solidity
// Simplified initialization sequence
function bootstrap(uint256 N) external onlyOwner {
    // Mint N STABLE and N EQUITY from protocol. No external capital.
    stable.mint(address(this), N);
    equity.mint(address(this), N);
    // Seed the Uniswap v4 pool at 1:1 ratio; protocol retains the LP position
    pool.initialize(N, N);
}
```

This is a lazy initialization pattern. The bootstrapped tokens create price discovery infrastructure , a working market , before the protocol has real users. It's mechanically distinct from alternatives:

- **IDO/LBP:** requires external capital to seed one side
- **Airdrop + DEX listing:** equity token launches separately with no co-seeding, creating an orphaned price surface
- **DAO treasury seed:** concentrates initial equity in whoever controls the treasury multisig

The AMM acts as a natural throttle against early attacks. At genesis, when the pool is thin, large purchases face high slippage. That discourages coordinated buys before real collateral arrives. As the protocol matures, the bootstrap tokens represent a smaller share of supply, and the premium fades.

Collateralization is permissionlessly verifiable throughout: anyone can check `totalAssets() / totalSupply()` at any block to track the ratio as real collateral accumulates.

## Overcollateralization minting and MEV keepers

When T-bill collateral appreciates above the target collateral ratio, the protocol can extract the surplus without selling assets:

```solidity
function harvestFees() external {
    uint256 excess = totalAssets() - targetRatio * totalSupply();
    if (excess == 0) revert NoExcessCollateral();

    // Caller earns 50 bps , no keeper subscription required
    uint256 callerReward = excess * 50 / 10_000;
    uint256 remaining = excess - callerReward;

    stable.mint(msg.sender, callerReward);
    _distributeToStakers(remaining * stakerShare / 1e18);
    _seedLiquidityVault(remaining - remaining * stakerShare / 1e18);
}
```

The caller earns 50 basis points of the harvested amount. Anyone can call `harvestFees()` at any time.

The implication for protocol maintenance: this replaces a keeper network. MEV bots will race to call `harvestFees()` the moment T-bill appreciation makes the call profitable. No Chainlink Automation subscription. No Gelato bot to fund. No keeper budget line. Economically-motivated searchers handle harvest timing automatically , more reliably than any single centralized keeper, and with no ongoing operational cost to the protocol.

Newly minted STABLE is split three ways: a fraction is burned (deflationary pressure on stablecoin supply), a fraction goes to the staking vault as yield, and the remainder seeds the liquidity vault to deepen AMM liquidity over time.

Compare this to sDAI/sUSDS or Ethena's sENA. Both route yield to stakers, but protocol revenue still flows to a corporate entity or DAO treasury , not to publicly tradeable on-chain equity. Curve's veCRV routes protocol fees to lockers and is the closest analog, but it was never co-bootstrapped with a stablecoin into a shared pool. None of these have the simultaneous co-minting into a zero-capital seeded pool that makes this proposal structurally distinct.

## Risk surface

The proposal names three risks explicitly, and all three are real.

**Oracle manipulation** is the most critical. `harvestFees()` uses the T-bill price oracle to determine `totalAssets()`. A compromised oracle that inflates the reported T-bill value makes the protocol believe it has excess collateral , and mints unbacked STABLE at scale. This is the same attack vector behind major yield-bearing stablecoin losses. Mitigations: TWAP oracles, multiple independent oracle sources, and circuit breakers on single-block harvest size. The proposal identifies this as "the single most critical dependency."<sup>[1](#fn-1)</sup>

**Regulatory risk** for the equity token is significant. On-chain revenue-sharing tokens have been treated as unregistered securities in SEC enforcement actions against similar structures. The proposal acknowledges this without resolving it. Protocol teams building on this design need jurisdiction-specific legal analysis before launch, particularly given the evolving landscape under the GENIUS Act and MiCA in 2026.

**Bootstrap fragility** is a timing problem. During early protocol life, the synthetic LP position is thin. A coordinated buy of EQUITY from the bootstrap pool could drain it and destabilize price discovery before real users arrive. This risk decreases monotonically as real collateral accumulates , but it's acute in the first weeks of operation when the protocol is most vulnerable to adversarial activity.

## On-chain observability

Every economic event in this protocol leaves a traceable footprint.

Each `harvestFees()` call is a transaction: timestamp, caller address, amount minted, distribution split. An unusual harvest , large amount, off-cycle timing, unexpected caller , is an oracle manipulation signal before the damage compounds. The collateralization ratio is readable at any block height via `totalAssets() / totalSupply()` without running a simulation.

The STABLE/EQUITY pair on Uniswap v4 generates swap events that express market sentiment toward protocol revenue. When the equity token price drops relative to the stablecoin, the pool is pricing in skepticism about future yield. The ERC-4626 staking vault emits standard `Deposit` and `Withdraw` events for every distribution , stakers can verify their pro-rata share was correctly calculated without trusting the team.

This is the kind of DeFi primitive where block explorer tooling becomes the audit control panel, not just a transaction lookup. [Ethernal](https://tryethernal.com) connects to any EVM node and decodes these events in context , internal calls, event logs, and storage reads at any historical block height , giving protocol operators and auditors a live view of the economic state machine as it runs.

## Where this stands

The proposal is a design spec, not a deployed protocol. The reference implementation uses Solidity 0.8.28, Uniswap v4, and OpenZeppelin, but the repository was not yet public as of the proposal date in February 2026.

The market it targets is real. Uniswap v4's permissioned pool support , custom hooks enabling KYC gates and institutional whitelisting , provides the infrastructure the protocol needs for regulatory-compliant collateral access on the same venue.<sup>[4](#fn-4)</sup>

The cold-start trick is the reusable piece. Any two-token system with revenue-sharing equity faces the same bootstrap problem. Co-minting with no external capital, permissionlessly verifiable collateralization, and MEV bots as natural keepers is a design pattern worth understanding regardless of whether this specific implementation ships.

If it does ship, the oracle setup and the bootstrap timing window are the security-critical phases , and they're also the phases most legible through on-chain event logs.

---

## References

<span id="fn-1">1.</span> "A tokenized-T-bill-backed stablecoin with publicly tradeable protocol equity: Mechanism design and reference implementation." _Ethereum Research_, February 18, 2026. [https://ethresear.ch/t/a-tokenized-t-bill-backed-stablecoin-with-publicly-tradeable-protocol-equity-mechanism-design-and-reference-implementation/24154](https://ethresear.ch/t/a-tokenized-t-bill-backed-stablecoin-with-publicly-tradeable-protocol-equity-mechanism-design-and-reference-implementation/24154)

<span id="fn-2">2.</span> Tether. "Consolidated Reserves Report Q4 2024." _tether.to_, 2025. [https://tether.to/en/transparency/#reports](https://tether.to/en/transparency/#reports) (Tether reported approximately $13B net profit for 2024, predominantly from U.S. Treasury holdings); Circle. "Circle 2024 Annual Report." _circle.com_, 2025. (Circle reported $1.7B in 2024 revenue, primarily from interest on USDC reserves.) Combined T-bill yield across both issuers exceeded $10B for 2024.

<span id="fn-3">3.</span> RWA.xyz. "BlackRock USD Institutional Digital Liquidity Fund (BUIDL)." _rwa.xyz_, accessed 2026. [https://app.rwa.xyz/](https://app.rwa.xyz/)

<span id="fn-4">4.</span> CoinDesk. "Uniswap Pushes Deeper Into Tokenized Assets With Permissioned Trading Pools." _coindesk.com_, July 22, 2026. [https://www.coindesk.com/business/2026/07/22/uniswap-pushes-deeper-into-tokenized-assets-with-permissioned-trading-pools](https://www.coindesk.com/business/2026/07/22/uniswap-pushes-deeper-into-tokenized-assets-with-permissioned-trading-pools)
