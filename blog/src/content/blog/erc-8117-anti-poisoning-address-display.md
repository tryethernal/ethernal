---
title: "The Security Bug in Your Font: How ERC-8117 Turns Address Display Into a Defense Layer"
description: "Address poisoning cost the ecosystem $500M+. ERC-8117 fixes the attack at the display layer. Here's what it does and how to implement it."
date: 2026-05-26
tags:
  - Security
  - DeFi
  - EVM
  - Block Explorers
  - ERC
image: "/blog/images/erc-8117-anti-poisoning-address-display.png"
ogImage: "/blog/images/erc-8117-anti-poisoning-address-display-og.png"
status: published
readingTime: 7
---

The attacker didn't exploit a smart contract. They didn't phish a private key. They mined an address.

It started with 14 zeros. A wallet generates them in seconds using CREATE2. The next six characters matched the real protocol address's prefix. The last four matched the suffix. In the transaction history, truncated to `0x000000...A90`, both addresses looked identical.

The user copied the address from their history. They sent the funds. Sixty-eight million dollars, gone. Not because of a smart contract bug or a compromised key. Because of how zeros render in a monospace font.<sup>[1](#fn-1)</sup>

ERC-8117, merged in March 2026, defines a standard to fix this. Not in the EVM. Not in the wallet's transaction logic. In how a 40-character hex string gets rendered on screen.

## Why address poisoning works at scale

Address poisoning is a copy-paste attack. The attacker sends a zero-value transaction from a lookalike address to a potential victim. The lookalike appears in the victim's transaction history. When the victim initiates their next legitimate transfer, they copy the "recent" address instead of the real one. The attacker receives the funds.

The attack has three ingredients:

1. A blockchain history UI that shows recent counterparties
2. Address truncation in that UI (showing `0x000000...A90` instead of the full 40 characters)
3. A victim who spot-checks the first six and last four characters

Leading zeros matter because they compress the visual entropy of the prefix. A prefix like `0x4aB3c1` has six visually distinct characters. A prefix like `0x000000` has six characters that look the same as any other `0x000000`. The eye slides past them. A matching suffix is enough to fool a quick scan.

The scale is significant. Blockaid documented over $500M in aggregate ecosystem losses to address poisoning.<sup>[2](#fn-2)</sup> Trust Wallet detected 225 million attacks across its user base and launched automatic protection across 32 EVM chains in March 2026.<sup>[3](#fn-3)</sup> The $68M single incident cited in the ERC-8117 motivation is not an outlier. It is the upper end of a large distribution.

### The CREATE2 feedback loop

Leading-zero addresses are proliferating for a reason unrelated to attacks.

Protocol developers mine CREATE2 addresses with leading zeros to save gas. Each zero byte in calldata costs 4 gas, versus 16 gas for a non-zero byte.<sup>[4](#fn-4)</sup> The ERC-4337 EntryPoint contract, Uniswap V4, ENS, and Seaport all have addresses with multiple leading zeros, cited in ERC-8117 as examples that require compact notation.

This is the feedback loop: the gas optimization that saves money on every transaction also makes those protocol addresses easier to spoof. The pool of high-risk addresses grows as more deployers mine zero-heavy addresses. Wallets cannot blocklist them all.

## What ERC-8117 actually does

ERC-8117 is a presentation-layer standard.<sup>[1](#fn-1)</sup> It changes nothing about address bytes, storage, RPC calls, or smart contracts. It defines a compressed display format for EVM addresses that have four or more consecutive leading zero nibbles.

The threshold is `n >= 4`. Fewer than four leading zeros are common enough that compressing them would add display noise without meaningful security benefit.

Two display modes:

**Mode A: Unicode subscript notation (for UIs)**

```
Before: 0x000000000004444c5dc75cB358380D2e3dE08A90
After:  0x0₁₁4444c5dc75cB358380D2e3dE08A90
```

The subscript digit represents the count of leading zeros that were compressed. It reads naturally as "0x0, then 11 zeros, then the remaining characters."

**Mode B: ASCII parenthesis notation (for logs and APIs)**

```
Before: 0x000000000004444c5dc75cB358380D2e3dE08A90
After:  0x0(11)4444c5dc75cB358380D2e3dE08A90
```

ASCII-safe, regex-friendly, no special Unicode required. Automated trading bots had already converged on this format independently, which is part of why it was chosen over curly braces (which cause shell expansion issues).

The security benefit becomes clear when you compare the attack scenario:

```
Legitimate: 0x0₁₁4444c5dc75cB358380D2e3dE08A90
Attacker:   0x0₁₀d3F69b0f3a8de4A22c3F0fE5A2F1E0
```

The zero count is immediately visible. A quick scan reveals `₁₁` versus `₁₀`. The mismatch is legible without counting characters.

### The security asymmetry

A protocol developer mining an address with 9 leading zeros: minutes of compute at standard hash rates.

An attacker trying to match those 9 leading zeros AND a specific non-zero suffix: roughly 32 years at equivalent hash rate.

EIP-55 mixed-case checksumming preserves case-sensitive entropy in all non-zero nibbles.<sup>[5](#fn-5)</sup> The remaining visible characters after zero compression carry more entropy than the zeros they replace. Compact notation does not reduce security. It makes the attack-relevant information explicit rather than hidden.

There is also a copy-paste safety property built into the format. Unicode subscript digits (₀ through ₉) are not valid hexadecimal. Any address input field that validates hex will automatically reject pasted compact notation. You cannot accidentally submit a display string as a raw address.

## Implementing ERC-8117 in your stack

The display function is around 20 lines. Here is a JavaScript implementation covering both modes and optional truncation:

```javascript
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

function toSubscript(n) {
  return String(n).split('').map(d => SUBSCRIPT_DIGITS[d]).join('');
}

function formatAddress(address, mode = 'unicode', truncate = false) {
  const body = address.slice(2); // strip 0x prefix
  let n = 0;
  while (n < body.length && body[n] === '0') n++;

  if (n < 4) return address; // below threshold, return unchanged

  const remainder = body.slice(n);
  const prefix = mode === 'unicode'
    ? `0x0${toSubscript(n)}`
    : `0x0(${n})`;

  if (!truncate || remainder.length <= 8) return `${prefix}${remainder}`;
  return `${prefix}${remainder.slice(0, 4)}…${remainder.slice(-4)}`;
}
```

Usage:

```javascript
formatAddress('0x000000000004444c5dc75cB358380D2e3dE08A90')
// → '0x0₁₁4444c5dc75cB358380D2e3dE08A90'

formatAddress('0x000000000004444c5dc75cB358380D2e3dE08A90', 'ascii')
// → '0x0(11)4444c5dc75cB358380D2e3dE08A90'

formatAddress('0x000000000004444c5dc75cB358380D2e3dE08A90', 'unicode', true)
// → '0x0₁₁4444…A90'
```

Addresses below the threshold pass through unchanged:

```javascript
formatAddress('0x4aB3c1d2e5f60789AbCdEf1234567890AbCdEf12')
// → '0x4aB3c1d2e5f60789AbCdEf1234567890AbCdEf12'
```

### Where to apply it in a block explorer

Every component that renders an EVM address to a human is in scope:

- Address cells in transaction tables
- Address headers on contract and wallet pages
- Event log parameter rendering (indexed address parameters)
- Search result previews
- Internal call trace displays

The rule is simple: anywhere a 40-character hex string is shown to a user, the compact format applies when `n >= 4`.

What does not change: address storage (always store raw hex), RPC calls (pass raw addresses), and smart contract interaction (zero impact). The standard is display-only. Do not compress addresses before passing them to `eth_call`, `eth_sendRawTransaction`, or any on-chain context.

### Logging pipelines

For server-side logging, the parenthesis notation is the right choice. ASCII-safe and easily parseable:

```javascript
// Log in compact form, store raw
logger.info({ address: formatAddress(rawAddress, 'ascii') });
db.store({ address: rawAddress }); // always raw in storage
```

Log parsers can detect the `0x0\(\d+\)` pattern and decompress when needed. Display compact, store raw.

### Font rendering

One implementation detail worth testing before shipping: subscript digits (₀ through ₉) must be visually distinct from normal-sized digits in your chosen monospace font. `0x0₇` must not render as `0x07`. Test with at least two system fonts, including the fallback, before deploying.

The standard also notes that block explorers already use subscript for small token amounts (rendering `0.0₆9 USDC` for six-decimal precision). The notation is not new to this context. Users familiar with token amount display will recognize the convention immediately.

## The display security gap DeFi hasn't closed

ERC-8117 is a narrow standard. It solves one specific problem: rendering leading-zero addresses in a way that makes the zero count explicit and makes lookalike addresses distinguishable at a glance.

The broader picture is that display security has been an afterthought in EVM tooling. EIP-55 mixed-case checksum encoding, the last serious display-layer standard, was published in 2016.<sup>[5](#fn-5)</sup> A decade of work followed on smart contract security: static analysis, fuzz testing, formal verification, audit standards. Almost nothing on the 40-character hex string every user has to visually verify before every transaction. That gap is embarrassing given what's at stake.

Trust Wallet's on-device detection across 32 chains is real progress at the wallet layer.<sup>[3](#fn-3)</sup> But wallets can only flag known attack addresses and alert on suspicious patterns. They cannot prevent a user from copy-pasting an address they read from a block explorer, a transaction history in some arbitrary UI, or a screenshot in a group chat.

The display layer is the last visual check before funds move. ERC-8117 does not eliminate address poisoning. It shifts the cognitive burden from "the user must count zeros" to "the UI renders zero count unambiguously." That is the right direction.

What is still missing: a standard for address truncation (how many characters to show, and which), a standard for on-chain address labeling that scales beyond ENS, and a consistent approach to cross-chain address ambiguity. The display security stack has room to grow.

## Shipping it

The address rendering function in a block explorer is called thousands of times per page load. It is also the component that every user trusts when they are about to send funds.

For block explorer operators, adopting ERC-8117 display is a direct security benefit to every user who reads an address from your UI. The implementation cost is a 20-line utility function and a pass through the components that render addresses. The security asymmetry is real: a defender mines their address with leading zeros in minutes; an attacker matching those zeros AND a specific suffix needs decades.

Ethernal is building toward ERC-8117 address display in its explorer. The implementation above follows the standard directly and drops into any EVM-compatible explorer stack.

---

## References

<span id="fn-1">1.</span> "ERC-8117: Anti-Poisoning Compact EVM Address Format." _Ethereum Improvement Proposals_, March 10, 2026. [https://eips.ethereum.org/EIPS/eip-8117](https://eips.ethereum.org/EIPS/eip-8117)

<span id="fn-2">2.</span> Blockaid. "Address Poisoning: The Growing Threat Draining Millions from Crypto Users." _blockaid.io_, 2026. [https://www.blockaid.io/blog/address-poisoning-the-growing-threat-draining-millions-from-crypto-users](https://www.blockaid.io/blog/address-poisoning-the-growing-threat-draining-millions-from-crypto-users)

<span id="fn-3">3.</span> "Trust Wallet Launches Automatic Address Poisoning Protection to Prevent Common Attack." _The Block_, March 2026. [https://www.theblock.co/post/392749/trust-wallet-launches-automatic-address-poisoning-protection-prevent-common-attack](https://www.theblock.co/post/392749/trust-wallet-launches-automatic-address-poisoning-protection-prevent-common-attack)

<span id="fn-4">4.</span> Ethereum Foundation. "Deploying Smart Contracts." _ethereum.org_. [https://ethereum.org/developers/docs/smart-contracts/deploying/](https://ethereum.org/developers/docs/smart-contracts/deploying/)

<span id="fn-5">5.</span> Buterin, V. "EIP-55: Mixed-case checksum address encoding." _Ethereum Improvement Proposals_, 2016. [https://eips.ethereum.org/EIPS/eip-55](https://eips.ethereum.org/EIPS/eip-55)
