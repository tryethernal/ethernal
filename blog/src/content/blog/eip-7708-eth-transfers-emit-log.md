---
title: "The Transfer Event Ethereum Was Missing: How EIP-7708 Makes ETH Observable"
description: "EIP-7708 makes every native ETH transfer emit a Transfer log in Glamsterdam. Here's what changes for indexers, explorers, and smart contract wallets."
date: 2026-07-04
tags:
  - EIP-7708
  - Ethereum
  - Glamsterdam
  - Indexing
  - L2
keywords: []
image: "/blog/images/eip-7708-eth-transfers-emit-log.png"
ogImage: "/blog/images/eip-7708-eth-transfers-emit-log-og.png"
status: published
readingTime: 7
---

EIP-7708 makes every non-zero ETH transfer emit the same `Transfer(address,address,uint256)` log as ERC-20 tokens, making ETH queryable via `eth_getLogs` for the first time. After it activates, tracking native ETH and ERC-20 tokens requires identical infrastructure: one log filter, no archive node, no trace API.

Here is the problem it solves. You're building a treasury accounting tool. Tracking USDC deposits is one `eth_getLogs` call: filter by the token contract address, pull every `Transfer` event, done. Tracking ETH deposits to a smart contract wallet is a different problem entirely. A contract received 10 ETH across three internal calls. Those calls don't appear in receipts. You need `debug_traceTransaction`, walk the call tree, filter for entries where `value > 0`, account for reverted frames that still show value, and deduplicate. Same asset. Completely different infrastructure.

[EIP-7708](https://eips.ethereum.org/EIPS/eip-7708), authored by Vitalik Buterin and proposed for the upcoming Glamsterdam hard fork, closes this gap.<sup>[1](#fn-1)</sup> After it activates, every non-zero ETH transfer emits the exact same `Transfer(address,address,uint256)` event that ERC-20 tokens do.

## Why ETH has no Transfer event today

ETH has no Transfer event because the CALL opcode predates Ethereum's log system, and connecting the two required a consensus change that was never prioritized. ERC-20's `Transfer` event was specified in 2015, years after the CALL opcode existed. The opcode moves ETH, but it was never connected to the log system. There was no mechanism to intercept value-bearing CALLs and emit a log without modifying the EVM.

The result is a tracking asymmetry that has persisted for a decade:

| Operation | Where it appears | Queryable with `eth_getLogs`? |
|---|---|---|
| ERC-20 token transfer | Transaction receipt as a `Transfer` log | Yes |
| Direct ETH send (EOA → EOA) | Transaction `value` field | No (parse txs manually) |
| Internal ETH transfer (CALL with value) | Nowhere in receipts | No |
| ETH via `CREATE` endowment | Nowhere in receipts | No |

The only options today for tracking internal ETH transfers:

1. `debug_traceTransaction` (Geth) or `trace_transaction` (Erigon/Parity): parse the call tree, filter for value-carrying frames, handle reverts. Requires an archive node. Trace format is not standardized across clients.
2. Pre-computed "internal transactions": block explorers run this offline, store the results, and surface them as a separate tab. You depend on the explorer's indexer, not the RPC.
3. Third-party providers: Alchemy, Infura, and others offer trace endpoints on paid tiers. Self-hosting an archive node costs roughly $300-1,000/month or more, depending on provider, chain size, and hardware, making this approach cost-prohibitive at scale.

The absence of a standardized log for ETH transfers also explains an entire category of historical exchange bugs. Early exchanges that accepted smart contract wallet deposits indexed ERC-20 Transfer events but had no parallel mechanism for native ETH. Contracts sent ETH via internal calls. The credits never posted.

L2 operators face the same infrastructure overhead. Orbit and OP Stack chains that accept native ETH deposits run the same two-track setup: receipts for tokens, trace API for ETH.

## What EIP-7708 adds

EIP-7708 hooks four execution paths into the log system: value-transferring transactions, value-transferring CALL opcodes, CREATE and CREATE2 with an endowment, and SELFDESTRUCT with a non-self beneficiary (post-[EIP-8246](https://eips.ethereum.org/EIPS/eip-8246)).<sup>[1](#fn-1)</sup>

For each, the EVM emits a LOG3 equivalent with this structure:

```
address: 0xfffffffffffffffffffffffffffffffffffffffe   (SYSTEM_ADDRESS, from EIP-4788)
topics[0]: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef  (keccak256("Transfer(address,address,uint256)"))
topics[1]: from   (zero-padded to 32 bytes)
topics[2]: to     (zero-padded to 32 bytes)
data:       amount in Wei (big-endian uint256)
```

This is **identical to the ERC-20 Transfer event signature** , same keccak, same indexed parameters, same data encoding.<sup>[2](#fn-2)</sup> The only difference is the emitting address. ERC-20 tokens emit from the token contract address. EIP-7708 ETH transfers emit from `SYSTEM_ADDRESS` (`0xffff...fffe`), a reserved system precompile address that no user contract can occupy.

That distinction matters for filtering. You can query `address = SYSTEM_ADDRESS AND topics[0] = Transfer keccak` and get exactly the protocol-emitted ETH transfer logs, with no false positives from tokens using the same signature.

### Log ordering

The transaction-level transfer log emits **before** any EVM-generated logs. Nested CALL logs emit in call order, interleaved with other EVM events. This means if you process logs in receipt order, you see the top-level ETH transfer first, then any token events from the called contract.

### Gas cost

The EIP specifies the LOG3 opcode cost as 1,500 gas.<sup>[1](#fn-1)</sup> A plain ETH transfer via CALL already costs at minimum 6,700 gas (the cost for a value-bearing call to an existing account). The log adds 1,500 gas to transfers that currently cost 6,700+. An analysis by community member metony estimated an average daily gas increase across Ethereum of approximately 1.6%.<sup>[3](#fn-3)</sup> The worst-case block log capacity does not increase , ETH transfers were already accounted for in the gas model.

## What doesn't emit a log, and why

The exclusions are deliberate.<sup>[1](#fn-1)</sup>

Zero-value transfers produce no log. Nothing changed, consistent with "event means something happened" semantics.

Reverted calls produce no log. Standard EVM behavior: if a transaction reverts, its logs are discarded. ETH transfer logs follow the same rule.

Fee payments to coinbase are excluded. Including them would emit a log on every single transaction, a substantial volume increase for data already derivable from block headers (coinbase address, effective gas price, and gas used are all in the header).

Base fee burns are excluded for the same reason. Derivable from headers, and the volume would be enormous.

EIP-4895 withdrawals are excluded. These aren't attached to transactions; they're consensus-layer events applied at the block level. The companion [EIP-7799](https://eips.ethereum.org/EIPS/eip-7799) handles these via a separate system logs mechanism.<sup>[4](#fn-4)</sup>

SELFDESTRUCT to self is impossible after EIP-8246 removes that path.

The fee and withdrawal exclusions are the most interesting design choice. They push those events into EIP-7799's "system logs" model , a separate root added to block headers, covering protocol-level ETH movements that aren't attached to individual transactions. Together, EIP-7708 and EIP-7799 cover all ETH flows. Their combination means wallets can reconstruct an account's exact ETH balance from logs alone, without downloading every block header and processing the withdrawal list.

## Before and after: the code change

Here's the current approach for tracking ETH received by a smart contract wallet:

```js
// Today: tracking internal ETH transfers requires trace API
const trace = await provider.send('debug_traceTransaction', [txHash, {
  tracer: 'callTracer',
  tracerConfig: { withLog: true }
}]);

function extractEthTransfers(call, result = []) {
  if (call.value && BigInt(call.value) > 0n && call.to !== call.from) {
    result.push({ from: call.from, to: call.to, value: call.value });
  }
  (call.calls || []).forEach(child => extractEthTransfers(child, result));
  return result;
}

const transfers = extractEthTransfers(trace);
// Requires archive node. Trace format varies by client (Geth vs Erigon).
// Not available on light nodes or most public endpoints.
```

After EIP-7708 activates:

```js
// After EIP-7708: ETH transfers appear as logs in receipts
const SYSTEM_ADDRESS = '0xfffffffffffffffffffffffffffffffffffffffe';
const TRANSFER_SIG   = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const logs = await provider.getLogs({
  address: SYSTEM_ADDRESS,
  topics:  [TRANSFER_SIG],
  fromBlock: startBlock,
  toBlock:   endBlock,
});

// No archive node required. Same call pattern as ERC-20 tracking.
```

You can also query ETH and token transfers in a single call:

```js
// Unified query: all value transfers (ETH + any ERC-20)
const allTransfers = await provider.getLogs({
  topics:    [TRANSFER_SIG],   // matches ERC-20 events AND EIP-7708 ETH logs
  fromBlock: startBlock,
  toBlock:   endBlock,
});

const ethTransfers   = allTransfers.filter(l => l.address === SYSTEM_ADDRESS);
const tokenTransfers = allTransfers.filter(l => l.address !== SYSTEM_ADDRESS);
```

One pipeline handles both.

## What this means for block explorers

After EIP-7708, block explorers can replace two separate indexing pipelines with one. Today, the receipts pipeline handles token events (fast, standardized, no special infrastructure) while the trace pipeline handles internal ETH transfers separately (archive node, client-specific trace API, custom call tree walker, separate database table, separate UI tab). Running two entirely different pipelines for the same asset is a real engineering burden, not a minor inconvenience.

After EIP-7708, ETH transfers are logs. They appear in transaction receipts alongside token events. `eth_getLogs` covers them. The "Internal Transactions" tab in block explorers , currently populated by offline trace processing , becomes reconstructable from the receipt log stream.

A few concrete implications:

A contract receiving ETH via an internal CALL will now produce a log entry in the receipt. No trace query required.

Balance reconstruction becomes log-based. Paired with EIP-7799 (which covers fee burns, coinbase tips, and withdrawals), a client can derive an account's full ETH balance history from logs alone. That's the same approach wallets already use for ERC-20 balances.

L2 nodes need no extra trace infrastructure for native token transfers. Orbit and OP Stack chains using native ETH get `eth_getLogs` observability without running a separate archive tier.

At Ethernal, we currently surface internal ETH transfers through the transaction trace view , the same offline trace processing every other explorer runs. After Glamsterdam activates, ETH transfers will appear as log entries in the receipt, visible in the Logs tab alongside token events, with no separate trace infrastructure required.

## Community discussion highlights

The main objection raised in the Ethereum Magicians thread came from 0xInuarashi, who flagged the gas overhead. In their words: "1700 is obscene."<sup>[3](#fn-3)</sup> The EIP specifies the LOG3 cost as 1,500 gas, which adds roughly 7% to the 21,000-gas base cost of a direct ETH transfer. The counter-argument is that the 21,000 base cost covers the state change, not just the transfer, and most value-bearing calls already cost significantly more than 21,000 gas. The 1.6% average daily gas increase estimate from metony reflects real-world usage patterns rather than the worst-case single-transfer scenario.

An alternative approach from z0r0z suggested progressive wrappers like wETH or paymaster mechanisms. That was rejected because it changes user behavior and doesn't cover EOA-to-EOA transfers, which remain a large share of ETH movement.

MicahZoltu made the case for matching the ERC-20 signature precisely: "Following ERC20 `Transfer` log makes it so anything that parses ERC20 transfer logs can also parse ETH logs without any additional work."<sup>[3](#fn-3)</sup> EIP-7708 uses `SYSTEM_ADDRESS` (`0xffff...fffe`) rather than the simulation address (`0xEeeee...eEEeE`) that `eth_simulateV1` already uses, to distinguish protocol-level logs from simulation artifacts.

The backfilling question , whether to retroactively produce ETH transfer logs for historical blocks , was debated but deferred. Current consensus is forward-looking only. Backfilling is treated as separate future work.

## Status and timeline

EIP-7708 was created on 2024-05-17 by Vitalik Buterin with status Draft, Standards Track, Core.<sup>[1](#fn-1)</sup> It is proposed for the Glamsterdam fork set, with devnet coordination ongoing as of mid-2026.<sup>[5](#fn-5)</sup> Mainnet activation is expected in the second half of 2026, subject to final fork inclusion decisions by All Core Developers.

Glamsterdam is shaping up as a fork focused as much on infrastructure observability as raw throughput. Alongside EIP-7708, the fork includes EIP-7799 (system logs for fee burns and withdrawals), [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) (block-level access lists for parallel execution and state healing), and EIP-8037 (state creation pricing). The common thread: making Ethereum's state transitions legible to the software layer without requiring special infrastructure.

ETH joining tokens as a first-class observable asset is a decade overdue. The engineering workaround , two pipelines, archive nodes, custom trace parsers , wasn't a deliberate choice. It was the result of the CALL opcode predating the event system. EIP-7708 fixes it structurally, at the protocol layer, with zero change to how you query the RPC.

---

## References

<span id="fn-1">1.</span> Vitalik Buterin. "EIP-7708: ETH transfers emit a log." _Ethereum Improvement Proposals_, 2024-05-17. [https://eips.ethereum.org/EIPS/eip-7708](https://eips.ethereum.org/EIPS/eip-7708)

<span id="fn-2">2.</span> Fabian Vogelsteller, Vitalik Buterin. "ERC-20: Token Standard." _Ethereum Improvement Proposals_, 2015-11-19. [https://eips.ethereum.org/EIPS/eip-20](https://eips.ethereum.org/EIPS/eip-20)

<span id="fn-3">3.</span> Various contributors. "EIP-7708: ETH transfers emit a log (Ethereum Magicians discussion)." _Ethereum Magicians_, 2024. [https://ethereum-magicians.org/t/eip-7708-eth-transfers-emit-a-log/20034](https://ethereum-magicians.org/t/eip-7708-eth-transfers-emit-a-log/20034)

<span id="fn-4">4.</span> Various contributors. "EIP-7799: System logs." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7799](https://eips.ethereum.org/EIPS/eip-7799)

<span id="fn-5">5.</span> Ethereum All Core Developers. "Glamsterdam fork coordination and devnet progress." _ethereum/pm_, 2026. [https://github.com/ethereum/pm](https://github.com/ethereum/pm) See ACD meeting notes and the ethereum/pm repository for current Glamsterdam fork inclusion status.
