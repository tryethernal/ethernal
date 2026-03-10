---
title: "Transaction Tracing with Ethernal"
date: 2021-05-26
description: "Easily see which contracts were called or created during the execution of a function. A deep dive into Ethernal's transaction tracing feature."
image: "/blog/images/transaction-tracing-with-ethernal.png"
tags:
  - Ethernal
  - EVM
  - Developer Tools
status: published
readingTime: 4
---

One of the biggest drivers of the popularity of the Ethereum ecosystem is the composability of smart contracts: once you've deployed your SC to a public network, anyone with its ABI and/or source code can build on top of it! The DeFi space, for example, is particularly taking advantage of that.

But along with all the possibilities that this unlocks, it also brings more complexity into smart contracts. It is harder to understand what is going on in a contract when it interacts with dozens of others.

In order to help fixing that, we have released a new transaction tracing feature, that shows you which contracts were called or created during the execution of a function (along with decoded parameters). It is similar to Etherscan's "Internal Txns" tab.

This article will detail how to use it, and how it works.

### Activate transaction tracing

By default, transaction tracing is not activated in any of your workspaces. In order to do that you need to go in the "Settings" page, scroll down to the "Advanced Options" panel, select the tracing mode in the dropdown, and click "Update".

After changing this setting, you'll need to restart the CLI (or the Hardhat node if you are using the plugin).

There are two different modes: "Tracing on a Hardhat network" and "Tracing a non-Hardhat network". This distinction is needed because transaction tracing is handled a bit differently with Hardhat.

### Tracing in action

Once tracing has been activated it will be run for every write transaction, and the trace will be displayed, after processing, on the transaction page.

Here is what you'll see:

- Type of action (CALL, CREATE, etc.)
- Address of the contract called (or created)
- Name of the contract
- Decoded function called with parameters

For the last two, it will be available if Ethernal was able to match it with an existing contract, or able to pull info from Etherscan (see next section for more info on how it's done).

### Processing the trace

The goal behind this feature is to give you more insights in how your contract is interacting with other contracts. So we are only interested in collecting `CALLx` and `CREATEx` steps.

Once all the steps have been collected, we are trying to get as much info as possible from each step:

If it's a `CALLx` step, we try three different strategies, and use the first one that returns the info that we need:

1. We look for the called address in your synchronized contracts, if there is a match, we'll use this info to decode the parameters and display the name along the trace
2. We hash the called bytecode, and compare it to hashes of your other contracts. If there is match, we set the name & the ABI from it
3. We look for an existing address on Etherscan, and if there is a match we pull the name and ABI from there, and associate it with the trace

For `CREATEx` steps, it's only trying strategy #2.

Depending on how big the trace is, and how many requests to Etherscan are made, this process can take a bit of time. However, once it's finished, your trace becomes much easier to understand!

### How does it work?

Transaction tracing is usually done through the `debug_traceTransaction` RPC method. It returns all the assembly steps taken during the execution of a smart contract, along with the stack, the memory and the storage for each of these steps.

Ganache supports this method, and so does Hardhat since v2.3.

The upside of this method is that it is a standard, and it should return data formatted the same way no matter what is running the node.

The main drawback, however, is that it returns all the data at the end of the execution, and this can be a lot depending on the complexity of the executed function.

This causes OOMs to be triggered on Ganache and Hardhat (and probably any JavaScript EVM implementation).

So if you are using Ganache for your local blockchain development, please note that you might not be able to trace large transactions. If your chain crashes, you can disable this feature in the settings, or switch to Hardhat or Geth.

The Geth implementation supports a callback parameter that allows you to filter what info is sent back, reducing considerably the amount of data returned. However, as far as I know neither Hardhat nor Ganache supports it in their implementation.

To learn more about `debug_traceTransaction`, check out the [Geth doc](https://geth.ethereum.org/docs/rpc/ns-debug#debug_tracetransaction).

#### Tracing with Hardhat

While Hardhat supports `debug_traceTransaction`, they also have their own way of letting you look at the stack.

`experimentalAddHardhatNetworkMessageTraceHook` is a function that takes a callback as a parameter, that will be called at each step of the execution, with three parameters, including the trace.

```javascript
experimentalAddHardhatNetworkMessageTraceHook(async (hre, trace, isMessageTraceFromACall) => {
    // Do stuff with the trace here
});
```

Put this code in your config file, or in the index of your plugin, and you'll be able to go through the whole trace without having to worry about its size.

A few things to note about it though:

- At the moment, it's only called for `CALLx` and `CREATEx` opcodes
- It is executed before the transaction is mined, meaning that you won't be able to access its context (hash or block number)

*Ethernal is a block explorer for EVM-based chains. It is compatible with remote and local chains. It integrates with Hardhat, Truffle and Alchemy. If you haven't yet, you can sign up [here](https://app.tryethernal.com/).*
