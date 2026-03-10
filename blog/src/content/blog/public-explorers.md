---
title: "Public EVM Block Explorers"
date: 2023-12-19
description: "You can now spin up public explorers for your public chains. Host them on your own domains with contract verification, token transfers, Metamask integration, and more."
tags:
  - Ethernal
  - Infrastructure
status: published
readingTime: 4
---

*tldr; You can now spin-up public explorers for your public chains. You can host them on your own domains, and it includes everything an explorer needs such as contract verification, token transfers parsing, Metamask integration, etc. Get started here quickly: [https://app.tryethernal.com/demo](https://app.tryethernal.com/demo)*

We just launched a new feature that allows you to generate an explorer for any EVM-based chain in a few clicks, just from a RPC. You can customize it to match your branding and parameters:

- Colors / font
- Native token symbol
- Total supply display
- Domain name
- Logo / favicon
- Custom links / banner

The explorer will then be available to anyone with the URL.

If you already have an account on Ethernal, you can start your 7 days free trial [here](https://app.tryethernal.com/explorers).

And if you want to see a demo before signing up, you can connect your RPC [here](https://app.tryethernal.com/demo) and it will generate a demo that will stay up for 24 hours.

Here are three use cases that show how an explorer could be useful for you or your team.

### 1. Launching a L1/L2

Launching a new production blockchain comes with a lot of requirements, on the ops side (reliability, decentralization, ...), but also on the user experience side: if you want to onboard more users, you need to make their experience as smooth as possible. Being able to see the status of their transaction, or inspect more in depth what happened in one, is one of the most basic action in blockchain.

If you don't want to spend time worrying about building/hosting/maintaining your own explorer, Ethernal is a good option. In a few minutes, you'll get your explorer up and running with everything that you need:

- Branding
- Contract verification through UI/CLI/API
- Automatically generated interface to interact with contracts through Metamask
- Contract parsing (ERCs detection)
- Transaction analysis with token transfers & balance changes
- Internal transactions display
- Custom non EVM-standard fields

You might also be thinking about building your own explorer. However, it is not that easy, there are a lot of things to take into consideration:

- **Setting up a database**: computing everything on the fly by querying the chain directly is going to be very heavy. You'll need to query the chain for transactions, receipts, contract info, balance changes, etc. Caching info such as transactions, contracts, token data is necessary to provide a reliable service.
- **Contract interaction**: your users will want an easy way to interact with contracts that they deploy. That means a Metamask integration and a convenient UI for them to input values.
- **Contract verification**: when your chain grows, you'll need to let users verify their contracts, so providing and maintaining a UI for that will be needed.
- **Analytics**: daily transactions, token holders, token transfers, etc.
- **NFT support**: gallery display, metadata parsing, transfers.

It quickly adds up and you might find yourself dedicating more resources than originally planned, resources that could have been allocated to improve your actual product.

### 2. Setting up your own private testnet

When your team starts to grow, and you need better collaboration tools, having a local chain on your laptop might not be enough anymore. You need a place where all of you can collaborate, see transactions, errors, interact with contracts, etc.

The most obvious choice is often to use public testnets such as Sepolia or Goerli. The main upside is that they come with an Etherscan instance, so you get a complete testing interface.

However, you need to deal with faucets, block time, bloat from other users, you don't have any control over the chain, can't reset it, jump in time, etc. And less privacy.

An alternative is to host your own Hardhat/Anvil node forking mainnet. This way, you have complete control over the chain, with access to all the utilities you need (like changing storage slots), no faucet issues, contract addresses are consistent with mainnet, and you are the only ones using it.

However, there is no default UI coming with it, making it harder to have your contracts easily tested by less technical users (ie your PM or beta-testers).

Using Ethernal, you can get the best of both worlds: once your node is setup, just connect it and your own explorer instance will be up and running in no time. You'll find all the features that you need to test your contracts, without wasting time building or maintaining extra tooling.

Convergence wrote a great article on how they set up their private testnet with Ethernal: [Testing Sagittarius 0x](https://medium.com/cvgfinance/testing-sagittarius-0x-7b9265dc66d6)

### 3. Integrating transaction data into your own software

Ethernal is an API first product. That means that everything that you see in the dashboard, can be retrieved from the API.

If you are building a tool that needs to integrate data from an EVM chain that is not supported by the usual API providers (Alchemy, etc.), you can use Ethernal for that.

Let's say you launched your own chain, and want to integrate a simple analytics tool for your users, so that they can see directly in your app the history of their transactions, and of their token transfers.

You can't query the chain to ask for transactions for a specific address directly, you need to store every transaction, so you can look them up by recipient/sender later.

You will also need to process logs, to detect token transfers, and process contracts to fetch symbols & decimals in order to display readable information.

Once you've connected Ethernal to your chain, you get access to a set of REST endpoints that let you query any processed data from your chain:

- Fetch all transactions for this address
- Fetch all token transfers for this address

As another example, let's say you are building a CI tool for web3 developers. Your users are pushing their code, and you are automatically starting a node and running their test suite against it.

Now, you'd like to display some information about what happened in the transactions. Querying the chain directly might be complicated as you might not want to keep it running forever.

With Ethernal, the workflow would look like this:

1. Spin up the node
2. API call to create the explorer, indexing starts
3. Send your transactions
4. Stop the explorer, it becomes "read-only," indexing is stopped, but you can still access its data
5. Fetch transaction data, token transfers or anything else through a REST API

That way, you only need to interact with one API, making development faster and eventually providing a better experience for your users.

There are lot more use cases than the 3 above. Block explorers are a critical part of web3 infrastructure, and with more and more rollups, testnets, etc. being launched, tools will be needed to manage them easily.

If you already have a RPC endpoint ready, you can generate a demo explorer for it [here](https://app.tryethernal.com/demo).
