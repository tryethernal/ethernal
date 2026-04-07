---
title: "The Missing Subscription Primitive: How ERC-8191 Standardizes On-Chain Recurring Payments"
description: "ERC-1337 failed. ERC-5643 is too narrow. ERC-8191 learns from both: a pull-based subscription lifecycle with soft-fail collection and a keeper model."
date: 2026-04-06
tags:
  - ERC-8191
  - Payments
  - Smart Contracts
  - Ethereum
  - DeFi
image: "/blog/images/erc-8191-onchain-recurring-payments.png"
ogImage: "/blog/images/erc-8191-onchain-recurring-payments-og.png"
status: published
readingTime: 8
---

You're building a SaaS-style service on your L2. Users pay 10 USDC monthly. You ship a subscription contract in a weekend. It works. Subscribers pay, you collect, status stays active. Clean.

Six months later you're debugging a user complaint. Their subscription is stuck. Your contract stores state differently from the protocol your payment processor expects. The indexer your dashboard uses emits events with different field names. The wallet integration you added last quarter fires hooks against a different interface. None of it is interoperable because none of it is standardized. Each team in your stack reinvented the wheel independently.

That fragmentation is the actual problem. ERC-1337 tried to fix it in 2018. It failed. ERC-5643 narrowed the scope to NFT memberships and left the rest unsolved. In March 2026, Cadence Protocol's @chasseurmic filed [ERC-8191](https://github.com/ethereum/ERCs/pull/1595), a minimal pull-based subscription interface that learns from both failures.<sup>[1](#fn-1)</sup>

## Why the previous attempts failed

ERC-1337, submitted by Austin Griffith in 2018, required off-chain relayers to replay subscriber-signed message hashes on-chain at each billing interval.<sup>[2](#fn-2)</sup> That architecture centralized trust in whoever operated the relayer. If the relayer went down, subscriptions stopped collecting. No test suite shipped with the spec. It sat in Draft status until 2021, where it remains stagnant.

ERC-5643, finalized in 2023, introduced subscription lifecycle management for NFTs: `renewSubscription()`, `cancelSubscription()`, `expiresAt()`, `isRenewable()`.<sup>[3](#fn-3)</sup> That scope works for "renew my ENS name." It does not work for "bill my user 15 USDC every 30 days in a pull-based model." ERC-5643 has no pull mechanism, no pause/resume lifecycle, no generic ERC-20 support, and no keeper compatibility.

Production protocols like Superfluid and Sablier solved streaming and vesting in their own ways. Superfluid's Super Token model computes real-time balances from flow rates without per-second transactions. Zero gas while streaming.<sup>[4](#fn-4)</sup> Sablier v4 represents every stream as an ERC-721 NFT inside a singleton `SablierLockup` contract with configurable curves and Chainlink oracle-gated unlocks.<sup>[5](#fn-5)</sup> Both are full protocols with their own event schemas, deployment addresses, and SDKs. Neither is a composable interface that a third-party wallet, indexer, or payment processor can target without integration work specific to each one.

The result is a fragmented ecosystem. Every team building recurring billing writes their own subscription contract with incompatible events, incompatible state machines, and no shared vocabulary.

ERC-8191 is the shared vocabulary.

## What the interface actually specifies

ERC-8191 defines a subscription as a relationship between a subscriber, a merchant, and a keeper, mediated by a standardized lifecycle interface.

The core data structure:

```solidity
struct SubscriptionTerms {
    address token;        // ERC-20 token, or address(0) for native ETH
    uint256 amount;       // payment per interval
    uint48  interval;     // seconds between payments
    uint48  trialPeriod;  // free trial duration in seconds
    uint256 maxPayments;  // 0 = unlimited
    uint256 originChainId;
    uint256 paymentChainId;
}

enum Status { Active, Paused, Cancelled, Expired, PastDue }
```

Two storage decisions are baked into this struct. `uint48` for interval and trialPeriod fits both fields into a single slot alongside other packed data, and the type supports values representing approximately 8.9 million years. No subscription will exceed that range. `address(0)` for ETH aligns with the convention used by Uniswap and 1inch, avoiding the friction of requiring WETH wrapping for native-currency subscriptions.

The primary interface:

```solidity
interface ISubscription {
    function subscribe(address merchant, SubscriptionTerms calldata terms)
        external returns (bytes32 subId);
    function collectPayment(bytes32 subId) external returns (bool);
    function cancelSubscription(bytes32 subId) external;
    function pauseSubscription(bytes32 subId) external;
    function resumeSubscription(bytes32 subId) external;
    function getStatus(bytes32 subId) external view returns (Status);
    function nextPaymentDue(bytes32 subId) external view returns (uint256);
    function getTerms(bytes32 subId) external view returns (SubscriptionTerms memory);
    function getSubscriber(bytes32 subId) external view returns (address);
    function getMerchant(bytes32 subId) external view returns (address);
    function getPaymentCount(bytes32 subId) external view returns (uint256);
}
```

Subscription IDs are `bytes32` values derived from `keccak256(subscriber, merchant, block.timestamp, chainId, nonce)`. The derivation is deterministic, collision-resistant, and cross-chain portable. The same subscription can be referenced consistently across chains using the `originChainId` and `paymentChainId` fields in `SubscriptionTerms`.

The `PastDue` status deserves specific attention. It is not stored on-chain. It is computed dynamically: an `Active` subscription with `block.timestamp > nextPaymentAt` is `PastDue` in the view layer, without any keeper needing to write a state change to storage. This eliminates an entire class of keeper work. Without dynamic computation, every missed payment would require a separate transaction just to flip a status flag, burning gas to move bits with no economic value. Dynamic computation lets the chain self-describe subscription health at query time.

## Soft-fail collection and the keeper model

The most important design decision in ERC-8191 is how `collectPayment()` handles failure. It does not revert.

If the subscriber's allowance is insufficient or their balance is too low, `collectPayment()` emits a `PaymentFailed` event and the subscription enters `PastDue`. The keeper receives no payment but the call succeeds at the EVM level. This is deliberate.

Consider the alternative. A reverting `collectPayment()` gives keepers no information about which subscriptions have problems. Soft-fail lets keepers retry at configurable intervals, emit dunning events for off-chain automation, and trigger `ISubscriptionHook` callbacks when a merchant wants to take action on payment failure: suspend service, send a notification, initiate a grace period. The dunning lifecycle is on-chain: every retry is a queryable `collectPayment()` call, every failure is a queryable `PaymentFailed` event.

The keeper model uses a two-tier architecture. Global keepers are set by the contract owner and can collect any subscription; they are intended for protocol-level keeper networks. Per-merchant keepers are set by individual merchants and can only collect payments from that merchant's subscribers.

This is a real decentralization tradeoff, and I think the two-tier approach gets it right. Purely decentralized keeper selection makes keeper economics difficult to design: anyone can be a keeper, which means no one has an incentive to be reliable. Purely centralized keepers create single points of failure. The two-tier model bounds the damage from a compromised keeper: a compromised per-merchant keeper can only collect due subscriptions for that merchant, once per interval. The time-lock built into collection (only callable when a payment is actually due) limits the attack surface without requiring complex staking or slashing mechanisms.

The optional merchant callback interface:

```solidity
interface ISubscriptionReceiver {
    function onPaymentCollected(bytes32 subId, uint256 amount, address token)
        external returns (bytes4);
    function onSubscriptionCancelled(bytes32 subId)
        external returns (bytes4);
}
```

Callbacks execute in `try/catch`. A reverting merchant callback cannot block payment collection. The core lifecycle is protected from merchant-side failure.

## Extensions without bloat

ERC-8191 keeps the core minimal and pushes optional functionality into ERC-165-discoverable extensions. A frontend can probe for what a given subscription contract supports before rendering UI.

Five optional extensions are defined:

| Extension | What it enables |
|-----------|-----------------|
| `ISubscriptionTrial` | Trial period introspection; merchant-controlled extension |
| `ISubscriptionTiered` | Named pricing tiers with upgrade/downgrade paths |
| `ISubscriptionDiscovery` | Merchant registry with metadata URI for frontends and indexers |
| `ISubscriptionHook` | Dunning callbacks on payment failure |
| `ISubscriptionGenericPayment` | Arbitrary payment schemas: ERC-1155, bundles, multi-currency |

The generic payment extension came directly from community feedback on Ethereum Magicians. Forum member mlegls proposed replacing the fixed `(token, amount)` pair in `SubscriptionTerms` with a schema-driven model to support AI-negotiated multi-currency deals:<sup>[6](#fn-6)</sup>

```solidity
interface ISubscriptionGenericPayment {
    function subscribeGeneric(
        address merchant,
        bytes32 paymentSchema,
        bytes calldata paymentData,
        uint48 interval,
        uint48 trialPeriod,
        uint256 maxPayments
    ) external payable returns (bytes32 subId);
}

bytes32 constant SCHEMA_ERC20   = keccak256("ERC-20");
bytes32 constant SCHEMA_ERC1155 = keccak256("ERC-1155");
bytes32 constant SCHEMA_BUNDLE  = keccak256("BUNDLE");
```

The core interface stays simple. Applications that need ERC-1155 bundle payments or AI-negotiated pricing adopt the generic extension. Applications that need only USDC billing never touch it.

## How ERC-8191 composes with the broader payment stack

ERC-8191 is one layer of a three-layer payment stack that emerged from three independent ERCs filed within four days of each other in March 2026. That's not a coincidence. There's clearly a vacuum in this area.

[ERC-8187](https://github.com/ethereum/ERCs/pull/1587), filed by Guillermo Narvaja (@gnarvaja) and reviewed by Amxx of OpenZeppelin, introduces a Token Puller interface: a spending authorization layer that decouples where funds come from from how they are spent.<sup>[7](#fn-7)</sup> A subscriber can authorize an `AavePuller` contract once, and subsequent `collectPayment()` calls on their ERC-8191 subscription pull from their Aave yield position without the subscriber maintaining liquid reserves.

[ERC-8190](https://github.com/ethereum/ERCs/pull/1592), filed by @kimbo128, defines payment channels with signed vouchers for high-frequency micropayments: unlimited off-chain service requests settled with only two on-chain transactions.<sup>[8](#fn-8)</sup> A production reference deployment (DrainChannelV2, contract `0x0C2B3aA1e80629D572b1f200e6DF3586B3946A8A` on Polygon Mainnet) supports minimum payments of $0.0001 with channel open costs of roughly $0.02, more than 200 times smaller than Stripe's minimum transaction.

The three standards address three distinct questions:

```
ERC-8187 (WHERE funds come from: yield positions, vaults, liquid balance)
    +
ERC-8190 (HOW micropayments flow: channel-based, off-chain vouchers)
    +
ERC-8191 (WHEN recurring billing triggers: subscription lifecycle, keepers)
```

ERC-8191 also composes with [ERC-8183](https://tryethernal.com/blog/the-commerce-layer-erc-8183), which this blog covered earlier. Community member miratisu proposed that ERC-8191 subscription hooks could auto-create ERC-8183 jobs when a payment is collected, connecting recurring billing to discrete agentic deliverables in a single triggered workflow.<sup>[6](#fn-6)</sup>

## Open questions in the spec

ERC-8191 is an open draft. Three genuine engineering tradeoffs remain unresolved.

### Keeper authorization scope

The current spec leaves keeper authorization to implementations. This might fragment the keeper ecosystem: if every deployment uses a different authorization mechanism, cross-protocol keeper networks become harder to build. The alternative (normative keeper authorization) constrains implementation flexibility. Neither choice is obviously correct, and I suspect this will be the most debated point as the spec matures.

### Cross-chain fields in the core struct

`originChainId` and `paymentChainId` in `SubscriptionTerms` reference ERC-7683's cross-chain intent layer for execution.<sup>[9](#fn-9)</sup> Whether these fields belong in the core struct or a separate cross-chain extension is unresolved. They create implicit coupling to the intent layer even for subscriptions that never cross chains.

### Non-stored `PastDue` compatibility

Some indexers and frontend data pipelines expect status flags to be storage-backed. Dynamic `PastDue` computation is more gas-efficient, but it requires indexers to implement the same computation logic client-side. Whether that creates a practical fragmentation problem depends on how widely the standard is adopted before tooling standardizes around it.

## What this looks like in a block explorer

Every ERC-8191 subscription lifecycle is on-chain. Every `subscribe()` call, every `collectPayment()` success or failure, every `pauseSubscription()`, every keeper address that triggered collection: all of it is in the transaction log.

In a block explorer like [Ethernal](https://tryethernal.com), you can trace the full history of a subscription by ID: the initial `SubscriptionCreated` event showing terms and parties, the sequence of `PaymentCollected` and `PaymentFailed` events with their timestamps, the keeper address responsible for each collection, the transition from `Active` to `PastDue` when a payment fails, and the eventual `SubscriptionCancelled` or `SubscriptionResumed` depending on what the subscriber does next.

This is why standardized event schemas matter. Without a shared `ISubscription` interface, a block explorer has no shared vocabulary for surfacing subscription state. With it, any subscription contract implementing ERC-8191 is immediately legible: same event names, same field types, same lifecycle states. The indexing and display logic writes once, works everywhere.

If you are debugging at 2am why a subscriber's `PastDue` flag never cleared after they refilled their allowance: whether the keeper retried, whether the `PaymentFailed` event was emitted, whether the subscription contract received the `resumeSubscription()` call. Decoded event logs are the answer. Ethernal connects to your RPC and surfaces ERC-8191 state and event history without configuration.

ERC-8191 is still a draft. File a comment on [Ethereum Magicians](https://ethereum-magicians.org/t/erc-8191-onchain-recurring-payments/27946) if the keeper authorization scope or cross-chain field placement matters to what you're building. The spec is actively taking feedback, and the design decisions being made now will shape how on-chain recurring billing works for years.

---

## References

<span id="fn-1">1.</span> @chasseurmic (Cadence Protocol). "Add ERC: Onchain Recurring Payments." _GitHub ERCs_, March 10, 2026. [https://github.com/ethereum/ERCs/pull/1595](https://github.com/ethereum/ERCs/pull/1595)

<span id="fn-2">2.</span> Griffith, A. "ERC-1337: Subscription Standard." _Ethereum Improvement Proposals_, 2018. [https://eips.ethereum.org/EIPS/eip-1337](https://eips.ethereum.org/EIPS/eip-1337)

<span id="fn-3">3.</span> Dawson, C., Quirynen, J. "ERC-5643: Subscription NFTs." _Ethereum Improvement Proposals_, 2022. [https://eips.ethereum.org/EIPS/eip-5643](https://eips.ethereum.org/EIPS/eip-5643)

<span id="fn-4">4.</span> Superfluid. "Concepts: Superfluid Overview." _Superfluid Documentation_, 2025. [https://docs.superfluid.org/docs/concepts/superfluid](https://docs.superfluid.org/docs/concepts/superfluid)

<span id="fn-5">5.</span> Sablier. "Introducing Sablier V2." _Sablier Blog_, 2023. [https://blog.sablier.com/introducing-sablier-v2/](https://blog.sablier.com/introducing-sablier-v2/)

<span id="fn-6">6.</span> miratisu, mlegls. "ERC-8191: Onchain Recurring Payments." _Ethereum Magicians_, March 2026. [https://ethereum-magicians.org/t/erc-8191-onchain-recurring-payments/27946](https://ethereum-magicians.org/t/erc-8191-onchain-recurring-payments/27946)

<span id="fn-7">7.</span> Narvaja, G. (@gnarvaja). "Add ERC: Token Puller Interface." _GitHub ERCs_, March 6, 2026. [https://github.com/ethereum/ERCs/pull/1587](https://github.com/ethereum/ERCs/pull/1587)

<span id="fn-8">8.</span> @kimbo128. "Add ERC: Payment Channels with Signed Vouchers." _GitHub ERCs_, March 10, 2026. [https://github.com/ethereum/ERCs/pull/1592](https://github.com/ethereum/ERCs/pull/1592)

<span id="fn-9">9.</span> Ethereum Foundation. "ERC-7683: Cross Chain Intents." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7683](https://eips.ethereum.org/EIPS/eip-7683)
