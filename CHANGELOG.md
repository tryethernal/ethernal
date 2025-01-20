# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.4] - 2025-01-20
### Fixed
- Build time env variables

## [4.0.4] - 2025-01-20
### Fixed
- Netlify files

## [4.0.3] - 2025-01-20
### Fixed
- Custom sidebar links

## [4.0.2] - 2025-01-20
### Fixed
- Contract edit modal
- App initialization

### Changed
- Use envStore instead of userStore for admin checks

## [4.0.1] - 2025-01-20
### Fixed
- Backend build process

## [4.0.0] - 2025-01-18
### Changed
- Upgraded Vue2 => Vue3

## [3.51.7] - 2025-01-07
### Fixed
- Workspace reset job tests

## [3.51.6] - 2025-01-07
### Fixed
- Workspace reset job

## [3.51.5] - 2024-12-20
### Fixed
- Trace processing error handling

## [3.51.4] - 2024-12-18
### Fixed
- Bug preventing block deletion when including token balance changes

## [3.51.3] - 2024-12-18
### Fixed
- Bug prenveting block deletion when including token balance changes

## [3.51.2] - 2024-12-18
### Fixed
- Bug prenveting block deletion when including token balance changes

## [3.51.1] - 2024-12-18
### Fixed
- Bug prenveting block deletion when including token transfers

## [3.51.0] - 2024-12-17
### Changed
- Deletion mechanism

## [3.50.4] - 2024-12-17
### Fixed
- Transaction deletion bug

## [3.50.3] - 2024-12-16
### Fixed
- Tests

## [3.50.2] - 2024-12-16
### Changed
- Cache provider instances

## [3.50.1] - 2024-12-12
### Changed
- More accurate expiration date calculation

## [3.50.0] - 2024-12-12
### Added
- Auto removal of explorers based on plan property

## [3.49.12] - 2024-12-10
### Fixed
- Tests

## [3.49.11] - 2024-12-10
### Changed
- Monitor queues for processes that are within quota

## [3.49.10] - 2024-12-10
### Changed
- Stricter integrity check starter

## [3.49.9] - 2024-12-10
### Fixed
- Previous release

## [3.49.8] - 2024-12-10
### Added
- Monitoring on block sync lag

## [3.49.7] - 2024-12-10
### Added
- Queue monitoring if blocks stop being enqueued

## [3.49.6] - 2024-12-09
### Fixed
- OpsGenie integration

## [3.49.5] - 2024-12-04
### Fixed
- Queue monitoring issue

## [3.49.4] - 2024-12-04
### Changed
- Less verbose queue monitoring logs

## [3.49.3] - 2024-12-04
### Fixed
- Contract verification duplication bug
- Queue monitoring

## [3.49.2] - 2024-11-30
### Changed
- Upgraded integrity check mechanism

## [3.49.1] - 2024-11-28
### Changed
- Queue monitoring interval

## [3.49.0] - 2024-11-28
### Added
- Queue monitoring

## [3.48.14] - 2024-11-27
### Changed
- Changed stalled block job priority

## [3.48.13] - 2024-11-26
### Fixed
- Real time block UI update

## [3.48.12] - 2024-11-26
### Fixed
- Bug when trying to inserting duplicate row

## [3.48.11] - 2024-11-26
### Changed
- Stopped using individual hooks for batch inserts (otherwise sequelize doesn't use generate the correct sql statements + better performances)

## [3.48.10] - 2024-11-24
### Changed
- More efficient token balance change deduplication
- Fix bug when inserting duplicate token balance changes

## [3.48.9] - 2024-11-24
### Added
- Add unique constraint on token balance changes
- Token balance change deduplication job

## [3.48.8] - 2024-11-23
### Changed
- Improve token transfer processing performances

## [3.48.7] - 2024-11-22
### Fixed
- Bug prevening contract deletion with multiple verifications

## [3.48.6] - 2024-11-22
### Fixed
- Bug when trying to delete the transaction that deployed a contract

## [3.48.5] - 2024-11-21
### Fixed
- Bug with workspace reset parameters
- Handle issues with Ghost API

## [3.48.4] - 2024-11-21
### Fixed
- Tests

## [3.48.3] - 2024-11-21
### Fixed
- Typo
- Transaction error processing when receipt is missing

## [3.48.2] - 2024-11-21
### Fixed
- Issue when contract metadata endpoint is not available

## [3.48.1] - 2024-11-21
### Fixed
- Issue when contract metadata endpoint is not available

## [3.48.0] - 2024-11-21
### Changed
- Improve performances of transaction trace processing

## [3.47.6] - 2024-11-21
### Fixed
- Better trace error handling

## [3.47.5] - 2024-11-21
### Fixed
- Failed transaction tracing doesn't throw error if there is an issue with the rpc

## [3.47.4] - 2024-11-20
### Added
- Integrity check skipping

## [3.47.3] - 2024-11-13
### Fixed
- Chain ids list

## [3.47.2] - 2024-11-07
### Changed
- More fields available in custom transaction fields

## [3.47.1] - 2024-11-07
### Fixed
- Contract processing bug

## [3.47.0] - 2024-11-07
### Added
- Explorer volume pricing

## [3.46.0] - 2024-11-05
### Added
- Contract post-processing

## [3.45.22] - 2024-11-01
### Fixed
- Contract processing

## [3.45.21] - 2024-10-31
### Fixed
- Possible Big Number overflow

## [3.45.20] - 2024-10-31
### Fixed
- Bug when accessing explorer through a custom domain

## [3.45.19] - 2024-10-31
### Fixed
- Bug in native balance endpoint

### Changed
- Do not handled errors to Sentry

## [3.45.18] - 2024-10-31
### Fixed
- Bug in native balance endpoint

## [3.45.17] - 2024-10-31
### Fixed
- Tests

## [3.45.16] - 2024-10-31
### Fixed
- Bug when address balance is not fetched

### Changed
- Upsert contracts for better performance

## [3.45.15] - 2024-10-31
### Changed
- Handle timeout in background job

## [3.45.14] - 2024-10-31
### Changed
- Handle timeout when fetching balance

## [3.45.13] - 2024-10-31
### Changed
- Bette timeout handling

## [3.45.12] - 2024-10-31
### Fixed
- Missing extra parameter

## [3.45.11] - 2024-10-31
### Changed
- Limit tracked Sentry errors

## [3.45.10] - 2024-10-31
### Fixed
- Bug preventing explorer creation without a plan

## [3.45.9] - 2024-10-29
### Added
- Logs to debug BB integration

## [3.45.8] - 2024-10-29
### Fixed
- Log headers when using Etherscan API mode

## [3.45.7] - 2024-10-29
### Fixed
- Explorer params from ethernal-host header

## [3.45.6] - 2024-10-29
### Removed
- Sentry releases during deploy as it's causing issues

## [3.45.5] - 2024-10-29
### Fixed
- Explorer params from ethernal-host header

## [3.45.4] - 2024-10-29
### Added
- Get explorer params from ethernal-host header

## [3.45.3] - 2024-10-29
### Fixed
- Logger level

## [3.45.2] - 2024-10-29
### Added
- Headers logging

## [3.45.1] - 2024-10-29
### Added
- Netlify redirects

### Fixed
- Bug when trying to get abi from a contract through Etherscan's API

## [3.45.0] - 2024-10-29
### Added
- Etherscan endpoint API to support forge contract verification

## [3.44.0] - 2024-10-24
### Added
- Scanner contract verification now pulls up source code, compilation info, etc... and marks the contract as verified
- Buildbear scanner

## [3.43.1] - 2024-10-23
### Changed
- Add message when trace is not available in embedded component

### Fixed
- Bug preventing message from being displayed when transaction does not exist

## [3.43.0] - 2024-10-23
### Added
- Better tracing option for geth-based chains

### Fixed
- Issue with trace step display

## [3.42.31] - 2024-10-20
### Fixed
- Make sure jobs reenqueued because of rate limiting have unique ids

## [3.42.30] - 2024-10-16
### Fixed
- Bug when explorer are created from a workspace

## [3.42.29] - 2024-10-16
### Fixed
- Add not null constraint on transactions("blockId")
- Do not delete contracts when deployment transaction is deleted

## [3.42.28] - 2024-10-14
### Fixed
- Transaction safe deletion

## [3.42.27] - 2024-10-14
### Fixed
- Receipt create hooks were not triggered
- Migration to defer some fk checks at the end of the transaction

## [3.42.26] - 2024-10-14
### Fixed
- Transaction typo

## [3.42.25] - 2024-10-14
### Fixed
- Delete deployed contract when transaction is deleted

## [3.42.24] - 2024-10-14
### Fixed
- Defer foreign key constraints on delete

## [3.42.23] - 2024-10-10
### Added
- Fly deployment files

### Fixed
- Race condition when adding domains during explorer creations through the API

## [3.42.22] - 2024-10-07
### Fixed
- Allow non public plan subscription

## [3.42.21] - 2024-10-04
### Fixed
- Allow non public plan setup

## [3.42.20] - 2024-10-04
### Fixed
- 24h tx count

## [3.42.19] - 2024-10-04
### Fixed
- 24h tx count

## [3.42.18] - 2024-10-04
### Fixed
- 24h tx count

## [3.42.17] - 2024-10-04
### Fixed
- Integrity check start block number

## [3.42.16] - 2024-10-03
### Changed
- HP worker settings

## [3.42.15] - 2024-10-03
### Changed
- HP worker settings

## [3.42.14] - 2024-10-03
### Removed
- Debugging log

## [3.42.13] - 2024-10-03
### Changed
- Debuug redis

## [3.42.12] - 2024-10-03
### Changed
- Worker lock duration

## [3.42.11] - 2024-10-03
### Fixed
- Better receipt processing

## [3.42.10] - 2024-10-03
### Added
- Block processing job

## [3.42.9] - 2024-10-02
### Changed
- Run individual hooks on block/transaction creation

## [3.42.8] - 2024-10-02
### Changed
- Better raw log storing

## [3.42.7] - 2024-10-02
### Changed
- Faster receipt sync

## [3.42.6] - 2024-10-02
### Changed
- Faster block sync

## [3.42.5] - 2024-10-02
### Changed
- Adjust lock duration for high priority workers

## [3.42.4] - 2024-10-02
### Changed
- Increase lock duration for high priority workers

## [3.42.3] - 2024-10-02
### Fixed
- Client side contract processing

## [3.42.2] - 2024-10-01
### Added
- Redis connection family option

## [3.42.1] - 2024-09-26
### Fixed
- Bug in env lib

## [3.42.0] - 2024-09-26
### Changed
- Use a connection string to connect to Redis to prepare for hosting provider change (DO => upstash)

## [3.41.0] - 2024-09-23
### Added
- fromBlock parameter to the explorer creation endpoint (available on request)
- Explorer cancelation / subscription endpoints
- Embedded transaction trace endpoint

## [3.40.12] - 2024-09-19
### Fixed
- Bug with some blocks when tracing is activated

## [3.40.11] - 2024-09-17
### Changed
- Optimization when inserting blocks with a lot of transactions

## [3.40.10] - 2024-09-17
### Fixed
- Bug when calling getContractByHashedBytecode

## [3.40.9] - 2024-09-17
### Changed
- DB optimization when finding contract by hashed bytecode

## [3.40.8] - 2024-09-16
### Changed
- Better Sentry worker instrumentation

## [3.40.7] - 2024-09-14
### Changed
- Make sure rate limited receipt syncs are not duplicated

## [3.40.6] - 2024-09-14
### Changed
- More thorough payment source check

## [3.40.5] - 2024-09-12
### Fixed
- Bug preventing proper error propagation

## [3.40.4] - 2024-09-11
### Changed
- Updated UI in workspace list

## [3.40.3] - 2024-09-10
### Fixed
- Bug preventing contract verification error messages from being propagated properly to the frontend

## [3.40.2] - 2024-09-04
### Fixed
- Bug with scientific notation conversion in latest chrome/firefox versions

## [3.40.1] - 2024-09-04
### Fixed
- Bug preventing autocomplete component from refreshing properly
- Bug preventing some components from refreshing properly

## [3.40.0] - 2024-09-04
### Changed
- Optimize storage of transactions/receipts/logs

## [3.39.19] - 2024-09-03
### Fixed
- Faucet bug

## [3.39.18] - 2024-09-03
### Changed
- Reactivate Sentry PG instrumentation

## [3.39.17] - 2024-09-03
### Fixed
- Tests

## [3.39.16] - 2024-09-03
### Fixed
- Bug when trying to insert duplicate receipt
- Bug when erc721 token does not exist

## [3.39.15] - 2024-09-03
### Fixed
- Bug when user doesn't exist when checking if user can sync contract

## [3.39.14] - 2024-09-03
### Fixed
- Fix header with banner

## [3.39.13] - 2024-09-03
### Fixed
- Bug on a contract endpoint if workspace is wrong

## [3.39.12] - 2024-09-03
### Fixed
- Unit tests

## [3.39.11] - 2024-09-03
### Fixed
- Fixed height of RpcConnector component
- Fixed bug with default hidden imported libraries on verification info page

## [3.39.10] - 2024-09-02
### Fixed
- Handle requests to non-existing contracts
- Handle requests to invalid addresses for erc721 transfers

## [3.39.9] - 2024-09-02
### Fixed
- Bug on block page when block does not exist

## [3.39.8] - 2024-08-31
### Changed
- Do not throw error if block sync returns null, it means the block already exists

## [3.39.7] - 2024-08-31
### Changed
- Ignore all types of duplicate when inserting blocks

## [3.39.5] - 2024-08-31
### Fixed
- Fix bug when logs not formatted properly

## [3.39.4] - 2024-08-31
### Fixed
- Concurrency issue with block sync

## [3.39.3] - 2024-08-26
- Add instrumentation file to Dockerfile

## [3.39.2] - 2024-08-26
- Sentry API/worker instrumentation cleanup

## [3.39.1] - 2024-08-26
### Changed
- Handle worker errors with Sentry

## [3.39.0] - 2024-08-26
### Changed
- Integrate Sentry with all API endpoints to catch errors

## [3.38.40] - 2024-08-23
### Changed
- Harmonize versioning

## [3.38.39] - 2024-08-23
### Changed
- Versioning (hopefully everything works this time)

## [3.38.38] - 2024-08-23
### Removed
- Debugging flag

## [3.38.37] - 2024-08-23
### Fixed
- Env var name for release version in frontend

## [3.38.36] - 2024-08-23
### Changed
- Use artifact to pass around deploy id because GA is stupid

## [3.38.35] - 2024-08-23
### Fixed
- YAML syntax

## [3.38.34] - 2024-08-23
### Fixed
- Netlify deploy id
- Frontend release version

## [3.38.33] - 2024-08-23
### Fixed
- Release name

## [3.38.32] - 2024-08-23
### Fixed
- More debug logs

## [3.38.31] - 2024-08-23
### Fixed
- Another typo in release name

## [3.38.30] - 2024-08-23
### Added
- Debugging logs

## [3.38.29] - 2024-08-23
### Fixed
- Typo in release name variable in deploy file

## [3.38.28] - 2024-08-23
### Fixed
- Release name
- Deploy URL

## [3.38.27] - 2024-08-23
### Fixed
- Deploy to Netlify in deploy file

## [3.38.26] - 2024-08-23
### Fixed
- Actually set release name

## [3.38.25] - 2024-08-23
### Fixed
- Typo in deploy file
- Github Actions decided to not pass around a variable anymore (???), so here is a tentative to fix that

## [3.38.24] - 2024-08-23
### Changed
- Better release name setup

## [3.38.23] - 2024-08-23
### Added
- _headers file for Netli

## [3.38.22] - 2024-08-23
### Added
- _headers file for Netlify

## [3.38.21] - 2024-08-23
### Fixed
- Deploy file. Setup Sentry DSN properly

## [3.38.20] - 2024-08-23
### Added
- Shadow proxying Sentry requests

### Changed
- Global app loader to avoid white screen

## [3.38.19] - 2024-08-22
### Removed
- Logrocket

## [3.38.18] - 2024-08-22
### Removed
- Logrocket

## [3.38.17] - 2024-08-22
### Fixed
- Sourcemap release

## [3.38.16] - 2024-08-22
### Fixed
- Remove duplicate key

## [3.38.15] - 2024-08-22
### Fixed
- Tests

## [3.38.14] - 2024-08-22
### Fixed
- Bug with version tagging in Sentry

### Added
- Sentry init is now tag with release on frontend/backend

## [3.38.13] - 2024-08-22
### Changed
- Tag Sentry releases with semver

## [3.38.12] - 2024-08-22
### Fixed
- Github action deploy file syntax

## [3.38.11] - 2024-08-22
### Added
- Sentry release integration

### Removed
- Newrelic integration

## [3.38.10] - 2024-08-22
### Fixed
- Sentry sourcemap upload

## [3.38.9] - 2024-08-22
### Fixed
- Deploy file (env variables)

## [3.38.8] - 2024-08-22
### Fixed
- Sourcemap setup

## [3.38.7] - 2024-08-22
### Fixed
- Bug preventing receipt sync

## [3.38.6] - 2024-08-22
### Changed
- Stricter rules for receipt sync

## [3.38.5] - 2024-08-22
### Changed
- No integrity checks for demo explorers
- Start setting up releases on sentry

## [3.38.4] - 2024-08-22
### Changed
- Switched to self-hosted Sentry
- Integrate sourcemap upload

## [3.38.3] - 2024-08-20
### Added
- List of forbidden demo networks. Main reason is that most of the time, people are using public rpc that can't support the load of all the request, it can result in backend issues and/or malfunctioning explorers.

## [3.38.2] - 2024-08-20
### Fixed
- Bug preventing verified contract tick to appear in transaction lists

## [3.38.1] - 2024-08-20
### Added
- Convert # to 'tab' query parameter equivalent (Etherscan API compatibility)

## [3.38.0] - 2024-08-20
### Changed
- /contract/:address => /address/:address
- Better tabs for Address, ERC20Contract, ERC721Collection components

## [3.37.10] - 2024-08-19
### Added
- Small delay if indexing is late for contract verification

## [3.37.9] - 2024-08-19
### Fixed
- Etherscan API redirect

## [3.37.8] - 2024-08-19
### Added
- Added Etherscan compatible endpoint for compatibility with hardhat verify standalone plugin

## [3.37.7] - 2024-08-18
### Changed
- Re-enqueuned blocks for rate limiting uses job uniqueness to avoid overloading worker

## [3.37.6] - 2024-08-18
### Fixed
- Integrity check bug

## [3.37.5] - 2024-08-18
### Changed
- Allow for deeper nesting in FormattedSolVar component

## [3.37.4] - 2024-08-18
### Changed
- Fixed small UI bug

## [3.37.3] - 2024-08-18
### Changed
- Improved transaction lists UI

## [3.37.2] - 2024-08-18
### Changed
- Demos now comes with a faucet 

## [3.37.1] - 2024-08-18
### Fixed
- Dex tokens loading

## [3.37.0] - 2024-08-18
### Added
- Dex for public explorers. In the explorer's settings, you can create a Dex UI
from just a UniswapV2Router & wrapped native token address. Users will have access to
a fully featured DEX UI, with all the pools automatically setup, right from their browsers.

## [3.36.46] - 2024-08-17
### Fixed
- Bug locking indefinitely contract verification when trying to reverify a contract

## [3.36.45] - 2024-08-17
### Fixed
- Netlify redirect file (again)

## [3.36.44] - 2024-08-17
### Fixed
- Netlify redirect file

## [3.36.43] - 2024-08-17
### Added
- Etherscan API compatibility for contract verification - now works with Hardhat
- Multi-file contract verification through the UI

## [3.36.42] - 2024-08-16
### Fixed
- Bug preventing workspace reset

## [3.36.41] - 2024-08-15
### Added
- Small helper

## [3.36.40] - 2024-08-15
### Fixed
- Query params for Netlify rewriting

### Added
- Support for etherscan style contract verification status endpoint

## [3.36.39] - 2024-08-15
### Changed
- Better handling of etherscan endpoint rewrite

## [3.36.38] - 2024-08-15
### Added
- Etherscan like contract verification api preparation

## [3.36.37] - 2024-08-15
### Fixed
- Various contract sorting bugs

### Changed
- Reduced mpworker concurrency

## [3.36.35] - 2024-08-15
### Fixed
- Tests

## [3.36.34] - 2024-08-14
### Removed
- Cumulative wallet count for now, as it's taking too long to load

## [3.36.33] - 2024-08-14
### Changed
- Contract transaction creation backfilled process

## [3.36.32] - 2024-08-14
### Fixed
- Bug preventing proper insertion of contract transaction creation id

## [3.36.31] - 2024-08-14
### Changed
- Use fk for contract transaction creation handling

## [3.36.30] - 2024-^08-14
### Fixed
- Typo causing contract creation transaction hash not registering properly

## [3.36.29] - 2024-08-14
### Changed
- Faster explorer load

## [3.36.28] - 2024-08-14
### Changed
- Improve performances for explorer search

## [3.36.27] - 2024-08-14
### Added
- Job to insert hashes

## [3.36.26] - 2024-08-13
### Added
- Contract creation transaction hash on contract table

## [3.36.25] - 2024-08-13
### Changed
- Make jobs unique when batch enqueued

## [3.36.24] - 2024-08-13
### Changed
- Split stat loading on overview

## [3.36.23] - 2024-08-13
### Changed
- Updated tests

## [3.36.22] - 2024-08-13
### Changed
- Reduce sent requests

## [3.36.21] - 2024-08-13
### Fixed
- Typo

## [3.36.20] - 2024-08-13
### Changed
- Instrument Sentry differently

## [3.36.19] - 2024-08-13
### Fixed
- Tests

## [3.36.18] - 2024-08-13
### Changed
- Fix instrument.js

## [3.36.17] - 2024-08-13
### Changed
- Update deploy workflow

## [3.36.16] - 2024-08-13
### Added
- Sentry

## [3.36.15] - 2024-08-13
### Changed
- Reduce amount of data logged when there is an error

## [3.36.14] - 2024-08-13
### Changed
- Do not display contract storage if not available

## [3.36.13] - 2024-08-13
### Changed
- Optimizing unique wallet count query

## [3.36.12] - 2024-08-13
### Fixed
- Tests

## [3.36.11] - 2024-08-13
### Changed
- Improve homepage analytics (more to follow)

## [3.36.10] - 2024-08-08
### Changed
- Do not throw when missing parameter in removeStalledBlock job

## [3.36.9] - 2024-06-25
### Changed
- Creating an explorer is now fully transactional, it either creates the workspace, the explorer and all optional services at the same time, or everything fails
- It's possible to create an explorer with all options, allowing one API call only to setup branding, domains, etc...

## [3.36.8] - 2024-06-22
### Changed
- Return domain id on domain creation
- Slugify new explorer slug on update

## [3.36.7] - 2024-06-19
### Added
- Compilation with viaIR option in contract verification

### Fixed
- Bug with constructors in contract verification

## [3.36.6] - 2024-06-16
### Fixed
- More faucet cooldown frontend issues
- Related tests

## [3.36.5] - 2024-06-16
### Fixed
- Bug preventing faucet balance to be updated in real-time in some cases

## [3.36.4] - 2024-06-16
### Fixed
- Bug when editing/deleting a faucet from a different workspace
- Bug preventing faucet cooldown to be properly displayed

## [3.36.3] - 2024-06-14
### Changed
- Default rate limiting for new explorer
- If less than 1000 blocks, automatically set integrity check start block number to 0

## [3.36.2] - 2024-06-14
### Fixed
- Bug preventing real-time refresh on public explorers
- Bug preventing some events to be inserted in tsdb

## [3.36.1] - 2024-06-12
### Fixed
- Bug preventing explorer from loading when using a custom domain
- Bug with custom domains status request

## [3.36.0] - 2024-06-12
### Added
- Faucet: explorers can integrate a faucet for their users. Enter the request interval & the drip amount, fill your assigned address with your tokens, and your faucet is ready! It comes with analytics, transaction history, address history.

## [3.35.6] - 2024-06-05
### Fixed
- Bug preventing transaction rollback if an event is not inserted properly

## [3.35.5] - 2024-05-21
### Fixed
- Receipt re-enqueing bug

## [3.35.4] - 2024-05-28
### Changed
- Cleaner skeleton loading

### Fixed
- Typo

## [3.35.3] - 2024-05-28
### Fixed
- Transaction page when syncing receipt

## [3.35.2] - 2024-05-28
### Changed
- Do not fail if no block is returned from provider
- More reliable receipt sync

## [3.35.1] - 2024-05-27
### Fixed
- Priority for blockSync / receiptSync jobs

## [3.35.0] - 2024-05-27
### Added
- Introduce Rate Limiter

### Chnaged
- Receipt processing is queued in the block processing job, not anymore in the Block mode afterCommit hook

## [3.34.9] - 2024-05-22
### Removed
- Skipping some tests

## [3.34.8] - 2024-05-22
### Changed
- Deactivate filtering on some columns where it wasn't useful and causing display issues on mobile
- Add to Metamask button will now use a custom domain if available (first one in the list)

## [3.34.7] - 2024-05-20
### Changed
- Do not try to remove expired blocks on integrity checks

## [3.34.6] - 2024-05-20
### Fixed
- Git commits were messed up, this releases previous changelog

## [3.34.5] - 2024-05-20
### Changed
- Optimized expired blocks fetching
- Better development Dockerfile
- Better handling of env variables in frontend

## [3.34.4] - 2024-05-20
### Fixed
- NFT gallery image display

## [3.34.3] - 2024-04-30
### Changed
- Better block/tx loading screens

## [3.34.2] - 2024-04-29
### Added
- Feedback widget

## [3.34.1] - 2024-04-27
### Changed
- Check RPC server side for public explorer creation/update (avoid CORS issues)

## [3.34.0] - 2024-04-27
### Added
- Explorers list on billing page
- Explaination between private/public explorers on billing page

## [3.33.3] - 2024-04-25
### Fixed
- Bug preventing integrityCheckStartBlockNumber to be 0
- Better handling of data retention limit

## [3.33.2] - 2024-04-25
### Fixed
- shouldEnforceQuota flag should be checked

## [3.33.1] - 2024-04-12
### Fixed
- Infinite loading in NFT gallery if not possible to load NFT

## [3.33.0] - 2024-04-12
### Changed
- Better NFT gallery. Proxied via server when possible to avoid cors issues

## [3.32.0] - 2024-04-11
### Added
- Transaction quota management system: it is now possible to buy transactions if you need to go over the plan transaction limit

## [3.31.7] - 2024-04-10
### Changed
- Always display imported contracts last

## [3.31.6] - 2024-04-10
### Fixed
- Contract creation transaction retrieval

## [3.31.5] - 2024-04-10
### Changed
- Integrity check is now automatically set for all explorers when a block is synced

## [3.31.4] - 2024-03-25
### Fixed
- IPFS axios fetch

## [3.31.3] - 2024-03-15
### Changed
- Changed BullMQ parameters to retry stalled jobs

### Added
- Backend tests for log pagination

## [3.31.2] - 2024-03-14
### Changed
- Paginate logs on transaction pages

## [3.31.1] - 2024-03-14
### Fixed
- Bug making frontend crash when units were returned with scientific notation

## [3.31.0] - 2024-03-12
### Added
- It's now possible to display L1 explorer links for public explorers

### Changed
- Block links styling
- Large numbers formatting on charts

## [3.30.4] - 2024-03-11
### Changed
- Allow invalid RPC for Quicknode addons testing

## [3.30.3] - 2024-03-11
### Changed
- Debug realtime

## [3.30.2] - 2024-03-11
### Changed
- Parse Soketi port

## [3.30.1] - 2024-03-11
### Added
- CI env variables for front build

## [3.30.0] - 2024-03-10
### Changed
- Replace Pusher by Soketi (https://soketi.app/)

## [3.29.2] - 2024-03-09
### Changed
- More efficient hypertable querying

### Removed
- Duplicate migrations

## [3.29.1] - 2024-03-08
### Fixed
- Typo

## [3.29.0] - 2024-03-08
### Added
- Quicknode marketplace integration

## [3.28.8] - 2024-03-01
### Fixed
- Actually release latest release

## [3.28.7] - 2024-03-01
### Fixed
- Bug when block timestamp is in ms
- Bug when value field is converted to scientific notation

## [3.28.6] - 2024-02-27
### Changed
- Better analytics timeline

### Fixed
- Analytics typo

## [3.28.5] - 2024-02-23
### Changed
- Demo banner text

### Fixed
- Graphs not loading when no data available

## [3.28.4] - 2024-02-22
### Changed
- Better error message when trying to use unavailable subdomain

## [3.28.3] - 2024-02-22
### Changed
- Display analytics up to current day

## [3.28.2] - 2024-02-22
### Removed
- Materialized views (replaced by tsdb)

## [3.28.1] - 2024-02-22
### Changed
- Do no take into account blocks with timestamp = 0 in analytics

## [3.28.0] - 2024-02-22
### Added
- Analytics page
- Token analytics

## [3.27.7] - 2024-02-21
### Fixed
- Contract verification bug

## [3.27.6] - 2024-02-20
### Fixed
- Receipt fails to be inserted if gas price wasn't present

## [3.27.5] - 2024-02-17
### Fixed
- Token balance change event insertion

## [3.27.4] - 2024-02-17
### Fixed
- Missing explorer function

## [3.27.3] - 2024-02-17
### Fixed
- Background workspace reset bug

## [3.27.2] - 2024-02-16
### Fixed
- Another workspace reset bug

## [3.27.1] - 2024-02-16
### Fixed
- Bug preventing workspace from being reset properly

## [3.27.0] - 2024-02-16
### Added
- Start inserting analytics events in tsdb

## [3.26.11] - 2024-02-16
### Fixed
- Gas limit bug

## [3.26.10] - 2024-02-15
### Added
- Background job to clean dangling token transfers
- Migration to add missing foreign keys on token_transfers

## [3.26.9] - 2024-02-06
### Fixed
- Bug that prevented blocks from being reverted if not synced properly

## [3.26.8] - 2024-01-29
### Fixed
- Undefined posthog instance

## [3.26.7] - 2024-01-19
### Added
- Raw ERC721 metadata display

### Changed
- Display ERC721 gallery if circulating supply > total supply

## [3.26.6] - 2024-01-17
### Added
- More configuration options for backend sync: skipFirstBlock & emitMissedBlocks

## [3.26.5] - 2024-01-16
### Changed
- When a contract matches bytecode, only copy abi

## [3.26.4] - 2024-01-16
### Changed
- Make polling interval configurable

## [3.26.3] - 2024-01-16
### Fixed
- Tests

## [3.26.2] - 2024-01-16
### Fixed
- Bug when processing ERC721 contracts

## [3.26.1] - 2024-01-10
### Fixed
- Reset process when migrating demo

### Changed
- Set up integrity check on demo from latest block

## [3.26.0] - 2024-01-04
### Changed
- Use materialized views for token analytics

## [3.25.18] - 2024-01-02
### Changed
- Update Worker option to fix lock issue

## [3.25.17] - 2024-01-02
### Changed
- Update Worker option to fix lock issue
- Happy New Year 🎆!

## [3.25.16] - 2023-12-31
### Changed
- Refresh materialized views concurrently

## [3.25.15] - 2023-12-31
### Changed
- Bull + Bullboard packages upgrade

## [3.25.14] - 2023-12-29
### Changed
- Different queue for MV refresh

## [3.25.13] - 2023-12-29
### Fixed
- Case when attributes doesn't have a filter function

## [3.25.12] - 2023-12-29
### Manage
- Use managed transactions
- Update Sequelize pool settings

## [3.25.11] - 2023-12-28
### Fixed
- Transactional deletions

## [3.25.10] - 2023-12-27
### Changed
- Use managed sequelize transactions

## [3.25.9] - 2023-12-27
### Changed
- Improve background workspace deletion

## [3.25.8] - 2023-12-27
### Changed
- Batch contract deletion when resetting workspace

## [3.25.7] - 2023-12-27
### Fixed
- Return something after sequelize transaction

## [3.25.6] - 2023-12-27
### Fixed
- Demo explorer deletion interval

### Changed
- Remove deferrable when batch deleting blocks & contracts

## [3.25.5] - 2023-12-27
### Fixed
- Do not throw error if workspace does not exist when doing healthchecks

## [3.25.4] - 2023-12-27
### Fixed
- Typo

## [3.25.3] - 2023-12-27
### Fixed
- Demo explorer deletion interval

## [3.25.2] - 2023-12-27
### Fixed
- Check subscription exists before making operations

## [3.25.1] - 2023-12-27
### Changed
- RPC healtcheck interval 1 minute > 5 minutes

### Fixed
- Demo explorer deletin

### Removed
- Marketing job

## [3.25.0] - 2023-12-27
### Changed
- Improved explorer cleanup
- Improved RPC healthcheck (better workspace filtering)
- ERC721 loading is not cached anymore by default

### Fixed
- Trying to delete a non existent pm2 process doesn't error anymore

## [3.24.3] - 2023-12-23
### Changed
- Improved block sync

## [3.24.2] - 2023-12-23
### Fixed
- Use stripe id

## [3.24.1] - 2023-12-23
### Changed
- Use shouldSync flag

## [3.24.0] - 2023-12-23
### Changed
- Demo explorers are stopped after 24 hours
- Sync is stopped if no active subscription

## [3.23.5] - 2023-12-20
### Changed
- Remove border on logo

## [3.23.4] - 2023-12-18
### Fixed
- Use node 18 for pm2

## [3.23.3] - 2023-12-18
### Fixed
- Specs

## [3.23.2] - 2023-12-18
### Changed
- Wording

## [3.23.1] - 2023-12-18
### Changed
- Wording

## [3.23.0] - 2023-12-16
### Changed
- Deletion is done in a background jobs if lot of blocks
- Data retention enforcement has now separate jobs for each workspace

## [3.22.4] - 2023-12-12
### Changed
- More efficient error processing (do not call rpc if receipt.status != 0)

## [3.22.3] - 2023-12-12
### Fixed
- Transaction error processing

### Added
- Admin endpoint to reprocess all transaction errors of a workspace

## [3.22.2] - 2023-12-09
### Added
- Metered billing

## [3.22.1] - 2023-12-06
### Fixed
- Transaction fee calculation
- Transaction tracing when memory is not available
- Transaction tracing UI
- Hash display component bug
- Search bug

## [3.22.0] - 2023-12-04
### Changed
- Transaction quota is handled better, actually counted now

## [3.21.24] - 2023-11-29
### Fixed
- Admin endpoint was deleted by mistake

## [3.21.23] - 2023-11-29
### Added
- Display ABI for verified contracts

### Fixed
- Copy bytecode button
- Display of raw/formatted constructor arguments for verified contracts

## [3.21.22] - 2023-11-28
### Fixed
- Contract verification bug
- Solidity formatter component bug

## [3.21.21] - 2023-11-23
### Fixed
- More frontend bug fix

## [3.21.20] - 2023-11-23
### Fixed
- Minor frontend bugs

## [3.21.19] - 2023-11-23
### Changed
- Use effective gas price if available

## [3.21.18] - 2023-11-22
### Added
- Embeddable demo explorer setup for landing page

## [3.21.17] - 2023-11-20
### Added
- Inapp chatbox for support

## [3.21.16] - 2023-11-20
### Changed
- Better contract verification

## [3.21.15] - 2023-11-18
### Fixed
- Bug when storing transactions if index field is named differently

## [3.21.14] - 2023-11-16
### Changed
- Better handling of different syncing states in the UI

## [3.21.13] - 2023-11-15
### Fixed
- Bug when changing ethernal subdomain on explorer
- Transaction quota wasn't incrementing anymore

### Changed
- Only allow one explorer per workspace

## [3.21.12] - 2023-11-15
### Fixed
- Healthcheck bug

## [3.21.11] - 2023-11-15
### Fixed
- Integrity check bug

## [3.21.10] - 2023-11-15
### Fixed
- Bug in subscription management, especially regarding demo conversion

## [3.21.9] - 2023-11-15
### Changed
- Ingest endpoint

## [3.21.8] - 2023-11-15
### Changed
- Better handling of Posthog variables

## [3.21.7] - 2023-11-15
### Changed
- Added redirect for Posthog reverse proxy

## [3.21.6] - 2023-11-03
### Changed
- Trial is now started without going through Stripe hosted page
- Better plan selector across the app

## [3.21.5] - 2023-11-01
### Changed
- Improved in-app explorer plans display

## [3.21.4] - 2023-10-31
### Changed
- Add https on generated demo link

## [3.21.3] - 2023-10-31
### Changed
- Updated demo setup process

### Added
- "Custom fields" in plan display
- Handling of "Enterprise" plan option

## [3.21.2] - 2023-10-26
### Fixed
- Tests

## [3.21.1] - 2023-10-26
### Changed
- Temporary hotfix

## [3.21.0] - 2023-10-18
### Added
- Demo app

## [3.20.3] - 2023-10-05
### Changed
- Wording update

## [3.20.2] - 2023-10-04
### Fixed
- Update networkId/chainId on workspaces/explorers table when updating rpc server

## [3.20.1] - 2023-10-01
### Fixed
- Fix enqueue/bulk priorities

## [3.20.0] - 2023-09-29
### Added
- [Public Explorer] Ability to stop/start sync from explorer settings
- [Public Explorer] After 3 failed RPC requests attempts, jobs will start failing gracefully until RPC is back up

## [3.19.8] - 2023-09-15
### Changed
- [Public Explorer] Changing RPC check for reachability & restarts the PM2 process

## [3.19.7] - 2023-09-12
### Fixed
- Variable decoder

## [3.19.6] - 2023-09-06
### Added
- Link to external domain on explorer settings page

## [3.19.5] - 2023-09-01
### Fixed
- Forgot to rebase. This will actually deploy the previous release

## [3.19.4] - 2023-09-01
### Fixed
- Token processing for private workspaces

## [3.19.3] - 2023-09-01
### Fixed
- Previous fix was wrong

### Changed
- Faster block height loading on overview


## [3.19.2] - 2023-09-01
### Fixed
- Block count parameter on blocks components

## [3.19.1] - 2023-09-01
### Fixed
- API login error on some endpoints

## [3.19.0] - 2023-09-01
### Removed
- Block counter & transaction counter on /blocks & /transactions page. Counting everything was really slowing down loading speed. Next step will be to replace with an approximate counting.

## [3.18.27] - 2023-08-30
### Fixed
- Delete everything when resetting db (not using pg cascade constraint anymore)

## [3.18.26] - 2023-08-29
### Fixed
- Defer constraints when reseting workspace on delete

## [3.18.25] - 2023-08-29
### Fixed
- Deleting workspace was spiking db CPU

## [3.18.24] - 2023-08-27
### Fixed
- [Public Explorer] Bug when falling to raw request during block fetching

## [3.18.23] - 2023-08-27
### Fixed
- [Public Explorer] Bug preventing creating new explorer from new workspace

## [3.18.22] - 2023-08-27
### Changed
- [Public Explorer] Do not allow sync without an active subscription

## [3.18.21] - 2023-08-27
### Changed
- [Public Explorer] Check for flag before processing ERC721 tokens

## [3.18.20] - 2023-08-27
### Changed
- [Public Explorer] Fail receipt sync gracefully

## [3.18.19] - 2023-08-27
### Fixed
- [Public Explorer] Bug preventing receipt processing queuing happening when tracing is enabled

## [3.18.18] - 2023-08-27
### Fixed
- [Public Explorer] Enqueue receipt processing after commit

## [3.18.17] - 2023-08-27
### Fixed
- Tests

## [3.18.16] - 2023-08-27
### Changed
- Fail on bad receipt processing

## [3.18.15] - 2023-08-27
### Fixed
- Bug in receipt processing

## [3.18.14] - 2023-08-25
### Added
- Possibility to delete a workspace
### Changed
- Block sync won't work anymore for users on a free plan with multiple workspaces. They will either have to upgrade or delete their workspace.

## [3.18.13] - 2023-08-24
### Fixed
- [Public Explorer] More performante mv refresh

## [3.18.12] - 2023-08-23
### Fixed
- [Public Explorer] Discover network id

## [3.18.10] - 2023-08-23
### Fixed
- [Public Explorer] Check if rpc is publicly accessible before creating explorer

## [3.18.9] - 2023-08-23
### Fixed
- [Public Explorer] Demo account flag

## [3.18.8] - 2023-08-22
### Fixed
- [Public Explorer] Hooks and logs

## [3.18.7] - 2023-08-19
### Fixed
- [Public Explorer] Modal was showing wrong DNS setup info

## [3.18.6] - 2023-08-19
### Fixed
- [Public Explorer] Bug in case no workspace for transaction

## [3.18.5] - 2023-08-19
### Fixed
- UI race condition on block page
- [Public Explorer] Prevent processing receipts twice

## [3.18.4] - 2023-08-19
### Changed
- Reduced concurrency for high priority jobs

## [3.18.3] - 2023-08-19
### Changed
- [Public Explorer] Fix typo

## [3.18.2] - 2023-08-19
### Changed
- [Public Explorer] Better naming for receipt jobs

## [3.18.1] - 2023-08-19
### Changed
- [Public Explorer] Fix events emitting related to transactions

## [3.18.0] - 2023-08-19
### Changed
- [Public Explorer] Updated backend sync system to better handle high loads

## [3.17.20] - 2023-08-19
### Changed
- More flexible data structure

## [3.17.19] - 2023-08-19
### Fixed
- [Public Explorer] Display more info regarding DNS setup

## [3.17.18] - 2023-08-19
### Fixed
- [Public Explorer] Fix susbcription checking for trials

## [3.17.17] - 2023-08-19
### Fixed
- [Public Explorer] Do not show contract limit warning

## [3.17.16] - 2023-08-18
### Fixed
- [Public Explorer] Fix ordering for overview stats

## [3.17.15] - 2023-08-18
### Changed
- [Public Explorer] Overview stats are now in materialized views (refreshed daily), which should significantly improve loading time 🚀

## [3.17.14] - 2023-08-17
### Fixed
- Tests

## [3.17.13] - 2023-08-17
### Fixed
- PM2 process starter

## [3.17.12] - 2023-08-17
### Changed
- [Public Explorer] Improved how pm2 process creation/deletions are done
- [Public Explorer] Use ethernal-light to synchronize blocks

## [3.17.11] - 2023-08-15
### Added
- [Public Explorer] Add a 7 days free trial for all plans
- [Public Explorer] Add explainer
- Happy Assumption of Mary ✨

## [3.17.10] - 2023-08-10
### Fixed
- Activate explorers UI (see release 3.17.0 for details)

## [3.17.9] - 2023-08-10
### Fixed
- Domain name discovery

### Added
- Introduced an env lib, cleaner + more testable

## [3.17.8] - 2023-08-10
### Fixed
- PM2 server release workflow typo

## [3.17.7] - 2023-08-10
### Fixed
- PM2 server release workflow

## [3.17.6] - 2023-08-10
### Fixed
- PM2 process not starting if workspace has spaces in its name

## [3.17.5] - 2023-08-10
### Fixed
- Infinite reload

## [3.17.4] - 2023-08-10
### Added
- Relisten on ipv6

## [3.17.3] - 2023-08-10
### Changed
- Listen on all interfaces

## [3.17.2] - 2023-08-10
### Added
- Also listen on ipv6

## [3.17.1] - 2023-08-10
### Fixed
- Bug when google auth json file is missing

## [3.17.0] - 2023-08-10
### Added
- Anyone can now spin up a public explorer
  - UI that lists all your explorers
  - Possibility to create an explorer from an existing workspace or a new one
  - 3 different plans are available, depending on the level of customization you need
  - From the UI, you can customize:
    - Native token
    - Domain names (you can add as many as you want)
    - Colors / Font / Logo / Favicon / Banner / Custom links
  - Once you start an explorer, blocks will start syncing automatically
  - For current explorers, you don't need to take any actions, but you are now able to manage your subscription and explorer settings directly.
  - For self-hosting: docker-compose.prod.yml is not ready yet. However, the code already works in this mode (that mostly means that you don't need to integrate Stripe). So if you want to run it already, you should just need to add the pm2-server service to it from docker-compose.yml
  - This is just a first version, there will be more regular & incremental improvements from here.

## [3.16.1] - 2023-07-05
### Fixed
- Token holders & circulating supply calculations

### Changed
- Reduce workers concurrency for lighter db load

## [3.16.0] - 2023-07-04
### Changed
- Updated code runner API to be able to override native transaction fields + added quorum library

### Fixed
- Bug on the token transfer API

## [3.15.8] - 2023-07-02
### Fixed
- Previous release had a test that was not passing

## [3.15.7] - 2023-07-02
### Added
- [Public Explorer] Added "fromBlock" parameter to the token transfers API, that only returns transfers made after the specified block number. Thanks @lgalant for the PR

## [3.15.6] - 2023-07-01
### Added
- [Public Explorer] Different user facing rpc

## [3.15.5] - 2023-07-01
### Fixed
- Bug preventing partial block revertion

## [3.15.4] - 2023-06-29
### Removed
- Bun. Makes too many things break (bunner...). Not enough of a priority.

## [3.15.3] - 2023-06-29
### Fixed
- Block syncing could fail if the miner field is not an address because ethers.js doesn't handle this case even so this appears to be standard. This can happen for example when using Polygon POA chains.

## [3.15.2] - 2023-06-29
### Changed
- [Public Explorer] Optimized processing for erc721 tokens

### Fixed
- [Public Explorer] Bug preventing token from being processed if the contract wasn't in the db before

## [3.15.1] - 2023-06-29
### Removed
- Backend processing for transaction errors on private workspaces

### Fixed
- Error when trying to process a failed transaction that got removed already

## [3.15.0] - 2023-06-29
### Changed
- More efficient contract processing, especially for public explorer instances

## [3.14.5] - 2023-06-28
### Changed
- [Public Explorer] Better handling of syncing/expired block in integrity checks

## [3.14.4] - 2023-06-28
### Added
- [Public Explorer] Fix reverting pending block when including transaction

## [3.14.3] - 2023-06-28
### Added
- [Public Explorer] Integrity check is now handling expired pending blocks

### Changed
- [Public Explorer] Block sync should revert pending blocks better

## [3.14.2] - 2023-06-27
### Fixed
- If code retrieval during tracing fails, the whole tracing fails. Fixes this.

## [3.14.1] - 2023-06-26
### Changed
- Improve case when balance change request fails

## [3.14.0] - 2023-06-26
### Changed
- Transactions are now processed in the creation job, if it fails, then all is reverted. Only operations that require a request to the node are processed separately (processing errors & traces)
- Error processing & trace processing now have their own dedicated jobs, for better error isolation and debugging

### Added
- Job & endpoint to reprocess all traces for a given workspace

## [3.13.31] - 2023-06-17
### Fixed
- Tentative fix for stalled jobs

## [3.13.30] - 2023-06-17
### Changed
- Optimize returned token transfer object for processing

## [3.13.29] - 2023-06-17
### Changed
- Optimize returned transaction object for processing

## [3.13.28] - 2023-06-17
### Changed
- Start cleaning transaction processing

## [3.13.27] - 2023-06-17
### Fixed
- Hanging transaction processing

## [3.13.26] - 2023-06-16
### Changed
- Stop block syncing process job if the block already exists, to avoid relying on lower level constraints (more annoying to check)

## [3.13.25] - 2023-06-16
### Fixed
- Bad code throwing an error where it shouldn't, in case Pusher fails

## [3.13.24] - 2023-06-16
### Fixed
- Prevent duplicated transaction trace steps if reprocessed

## [3.13.23] - 2023-06-16
### Fixed
- Infinite transaction processing

## [3.13.22] - 2023-06-16
### Fixed
- Logger loading

## [3.13.21] - 2023-06-16
### Changed
- Batching size for reprocessing transactions

## [3.13.20] - 2023-06-16
### Added
- Jobs to force reprocessing all txs for one workspace

## [3.13.19] - 2023-06-16
### Fixed
- Transaction tracing when no memory available is now handled
- Bug preventing from interacting with contracts using loaded accounts

## [3.13.18] - 2023-06-10
### Fixed
- Bulk enqueuing jobId

## [3.13.17] - 2023-06-08
### Changed
- Queues settings

## [3.13.16] - 2023-06-08
### Fixed
- bulkEnqueue logic for jobId

## [3.13.15] - 2023-06-08
### Changed
- Changed bulkEnqueue uniqueness

## [3.13.14] - 2023-06-08
### Changed
- Queues tuning

## [3.13.13] - 2023-06-07
### Added
- Timeout chain request in integrityCheck
- Queue all block gaps

## [3.13.12] - 2023-06-07
### Changed
- Fixed block sync

## [3.13.11] - 2023-06-07
### Changed
- Improve integrity checks enqueuing

## [3.13.10] - 2023-06-07
### Changed
- Improve integrity checks batching

## [3.13.9] - 2023-06-07
### Fixed
- Test

## [3.13.8] - 2023-06-07
### Changed
- Improve integrity checks batching

## [3.13.7] - 2023-06-07
### Changed
- Remove uniqueness for repeatable queues

## [3.13.6] - 2023-06-06
### Changed
- Improved enqueuing system

## [3.13.5] - 2023-06-06
### Changed
- Improved block batching for large ranges

## [3.13.4] - 2023-06-06
### Changed
- Improved block batching for large ranges

## [3.13.3] - 2023-06-06
### Changed
- Improved block batching for large ranges

## [3.13.2] - 2023-05-24
### Fixed
- Deployment issue

## [3.13.1] - 2023-05-24
### Fixed
- Deployment issue

## [3.13.0] - 2023-05-24
### Added
- [Public Explorer] When a contract is verified, it will show source code, compiler info, constructor arguments and linked libraries. Note that existing contracts will need to be reverified.

## [3.12.8] - 2023-05-11
### Added
- Timeout for workspace processing

## [3.12.7] - 2023-05-02
### Added
- Endpoint to reprocess deployment txs

## [3.12.6] - 2023-05-02
### Added
- Endpoint to reprocess deployment txs

## [3.12.5] - 2023-05-02
### Changed
- Performance improvement by sending way less requests to the backend

## [3.12.4] - 2023-04-26
### Fixed
- Dev Dockerfile package issue

### Changed
- Integrity checks work as expected when updating the start block number
- [Public Explorer] Now possible to host on more than one subdomain level deep (ex sub.sub.app.com)

## [3.12.3] - 2023-04-21
### Changed
- Return instead of throwing error in some jobs if parameters are missing

## [3.12.2] - 2023-04-21
### Changed
- Scheduler intervals to prod values

### Removed
- Status link in private explorers

## [3.12.1] - 2023-04-21
### Fixed
- Tentative performance fix for long running blockSync jobs

## [3.12.0] - 2023-04-21
### Added
- [Public Explorer] Integrity checks: a background process makes sure no blocks are missing, blocks are now guaranteed to be fully synced (block/txs/logs) or not at all
- [Public Explorer] Status page showing the integrity of the explorer, and the health of the RPC (both can be displayed or not to the end user)

## [3.11.9] - 2023-04-07
### Changed
- Add CORS warning in case the app can't connect to the remote RPC when creating a workspace

## [3.11.8] - 2023-04-04
### Changed
- Force uniqueness in job names (to avoid completed jobs to block new ones)

## [3.11.7] - 2023-04-03
### Fixed
- Bug preventing some RPC endpoints (include Alchemy ones) to be checked properly when creating a workspace

## [3.11.6] - 2023-04-01
### Fixed
- ERC721 token transfer processing bug for private explorers

## [3.11.5] - 2023-03-31
### Fixed
- Contract storage was not available if contract doesn't have dependencies

### Added
- Logging

## [3.11.4] - 2023-03-30
### Fixed
- [Public Explorer] Pusher bug preventing real time updates

### Changed
- Docker images tagging

## [3.11.3] - 2023-03-30
### Changed
- Prod Dockerfile image now default to https on the frontend

## [3.11.2] - 2023-03-28
### Added
- Dockerfile for self-hosted production environment - It will be pushed to Docker Hub @antoinedc44/ethernal for each release.
- API endpoint to create explorers

### Fixed
- Encryption when creating user without Firebase auth enabled

## [3.11.1] - 2023-03-28
### Fixed
- Display Public Explore prompt

## [3.11.0] - 2023-03-23
### Added
- Browser sync as default for new workspaces. Workspaces will start syncing as soon as they are created. This will make onboarding *much* easier! Browser sync will automatically be deactivated when blocks will be synced from one of the plugins.

## [3.10.7] - 2023-03-21
### Fixed
- Bug causing accounts not being synced properly

## [3.10.6] - 2023-03-18
### Changed
- Upgraded bullboard for bug fixes

## [3.10.5] - 2023-03-17
### Fixed
- Tests

## [3.10.4] - 2023-03-17
### Fixed
- Fix API token display

## [3.10.3] - 2023-03-16
### Fixed
- Fix import contract UI button
- Fix account unlock with private key

## [3.10.2] - 2023-03-15
### Fixed
- Logrocket analytics

## [3.10.1] - 2023-03-13
### Fixed
- [Firebase Auth Migration] Firebase mem cost parameter

## [3.10.0] - 2023-03-13
### Changed
- [Firebase Auth Migration] Auth is now done by the backend, not by Firebase. We still need to create a Firebase user. This will be removed after a while once most clients (Hardhat plugins & CLI) will have upgraded.

## [3.9.5] - 2023-03-10
### Fixed
- Token transfers display wasn't showing token type/formatting

## [3.9.4] - 2023-03-09
### Fixed
- Token transfers could be returned duplicated by the API

## [3.9.3] - 2023-03-02
### Fixed
- ERC-721 Token transfers views were _always_ displaying ALL tokens transfers. It is now filterable by tokenId

## [3.9.2] - 2023-03-02
### Fixed
- [Public Explorer] Fix bug preventing gallery from being displayed

## [3.9.1] - 2023-03-02
### Fixed
- [Public Explorer] Code typo causing a bug in custom fields display

## [3.9.0] - 2023-03-01
### Added
- [Public Explorer] Customizable transaction fields
- [Firebase Auth Migration] Logging to figure out what's wrong during signup

## [3.8.8] - 2023-02-28
### Fixed
- Accidentally disabled billing in prod

## [3.8.7] - 2023-02-27
### Changed
- Temporarily allow null password hash/salt

## [3.8.6] - 2023-02-27
### Added
- Ability to convert raw transaction hex data to utf8

## [3.8.5] - 2023-02-27
### Fixed
- [Firebase Auth Migration] Track jobs with ids

## [3.8.4] - 2023-02-27
### Fixed
- [Firebase Auth Migration] Await script

## [3.8.3] - 2023-02-27
### Fixed
- Frontend build

## [3.8.2] - 2023-02-27
### Added
- [Firebase Auth Migration] Store Firebase encrypted hashes on signup
- [Firebase Auth Migration] Script to migrate existing hashes

## [3.8.1] - 2023-02-24
### Changed
- Flagged some feature to make it easier to self host

## [3.8.0] - 2023-02-23
### Changed
- Allow non standard data to be stored. JSON formatted event logs will be displayed if they are not EVM compliant instead of erroring

### Fixed
- Only display workspace logs

## [3.7.12] - 2021-02-23
## Fixed
- Node version for CI process

## [3.7.11] - 2021-02-23
## Fixed
- Connection to authenticated provider

## [3.7.10] - 2021-02-16
## Fixed
- Performance improvement on token holder history

## [3.7.9] - 2021-02-16
## Fixed
- Typo
- Cumulative token supply query

## [3.7.8] - 2021-02-16
### Fixed
- Bug preventing some trace steps from being displayed
- Bug preventing from updating tracing option

## [3.7.7] - 2021-02-10
### Changed
- Batch token processing

## [3.7.6] - 2021-02-10
### Changed
- Updated token processing script for more reliable balance change tracking

## [3.7.5] - 2021-02-07
### Changed
- Show full total supply on overview

## [3.7.4] - 2021-02-07
### Fixed
- Total Supply

## [3.7.3] - 2021-02-07
### Fixed
- Case insensitive addresses

## [3.7.2] - 2021-02-02
### Fixed
- Tests

## [3.7.1] - 2021-02-02
### Changed
- Hiding token analytics for now as it's buggy

## [3.7.0] - 2021-02-02
### Changed
- Major overhaul of the token page, added token stats. Feel free to give feedback on Discord

## [3.6.16] - 2023-01-31
### Changed
- Optimize migration script for speed

## [3.6.15] - 2023-01-31
### Fixed
- Private key bug

## [3.6.14] - 2023-01-31
### Fixed
- Bug preventing from creating workspace with RPC including Basic auth

## [3.6.13] - 2023-01-27$
### Fixed
- Logger

## [3.6.12] - 2023-01-27
### Fixed
- Logger

## [3.6.11] - 2023-01-27
### Fixed
- Catch transaction sync error

## [3.6.10] - 2023-01-27
### Fixed
- Better queuing tracking

## [3.6.9] - 2023-01-27
### Fixed
- Bug preventing some balance changes to be created in some cases

## [3.6.8] - 2023-01-26
### Fixed
- Bug preventing some balance changes to be created in some cases

## [3.6.7] - 2023-01-18
### Fixed
- Tests

## [3.6.6] - 2023-01-18
### Fixed
- [Public Explorer] Contract Verification

## [3.6.5] - 2023-01-15
### Fixed
- Token balance change calculation

## [3.6.4] - 2023-01-14
### Fixed
- Token balance change calculation wasn't correct if transfers happened in the token creation tx

## [3.6.3] - 2023-01-13
### Changed
- Auto reenqueue migration

## [3.6.2] - 2023-01-13
### Changed
- Changed how to migrate transfers & balance changes

## [3.6.1] - 2023-01-12
### Added
- Same than before but I tagged too quickly...

## [3.6.0] - 2023-01-12
### Added
- Prepare token_transfers & token_balance_changes migration

## [3.5.7] - 2023-01-12
### Fixed
- Double token transfer processing

## [3.5.6] - 2023-01-11
### Fixed
- Gas limit issue

## [3.5.5] - 2023-01-11
### Fixed
- Issue with gas set when calling Metamask

## [3.5.4] - 2023-01-11
### Fixed
- Onboarding when RPC doesn't support eth_getAccounts

## [3.5.3] - 2023-01-11
### Changed
- Reset workspace more gradually

## [3.5.2] - 2023-01-10
### Fixed
- CI

## [3.5.1] - 2023-01-10
### Fixed
- Bug triggering validation error when processing some token transfers

## [3.5.0] - 2023-01-10
### Added
- Added ids to token transfers & balance changes for better data reliability

## [3.4.6] - 2023-01-04
### Fixed
- [Public Explorer] Remove Authorization header when authenticating with Pusher

## [3.4.5] - 2023-01-04
### Fixed
- Re-enable analytics

## [3.4.4] - 2023-01-03
### Fixed
- [Public Explorer] Contract verification was not working if constructor deployed a new contract
- Happy new year 🍾!

## [3.4.3] - 2022-12-30
### Fixed
- Tests

## [3.4.2] - 2022-12-30
### Changed
- Improved CI/CD process to include everything

### Added
- Newrelic monitoring

## [3.4.1] - 2022-12-29
### Fixed
- Frontend auth

## [3.4.0] - 2022-12-27
### Changed
- Frontend auth is now done with the api token instead of firebase id

## [3.3.2] - 2022-12-21
### Fixed
- Bug preventing plans upgrade/downgrade

## [3.3.1] - 2022-12-20
### Changed
- Restrict server side sync to public workspaces (ie public explorer plans).

## [3.3.0] - 2022-12-20
### Added
- Contract logs endpoint

## [3.2.0] - 2022-12-14
### Changed
- Improve frontend id token management

## [3.1.6] - 2022-12-13
### Changed
- Keep Logrocket for frontend monitoring
- Better backend logging (avoid OOM due to circular JSON dependency)
- Fix ERC-721 reloading bugs

## [3.1.5] - 2022-12-13
### Added
- Datadog monitoring (back + front)

## [3.1.4] - 2022-12-07
### Added
- [Public Explorer] ERC-721 autoloading is now configurable

### Fixed
- Fixed ERC-721 infinite autoloading

## [3.1.3] - 2022-12-06
### Changed
- Display transaction gas limit instead of block gas limit
- Better transaction status detection

## [3.1.2] - 2022-12-05
### Changed
- Transaction status now handles cases with no status field

## [3.1.1] - 2022-12-04
### Fixed
- API for contract storage
- Contract storage loading

## [3.1.0] - 2022-12-04
### Changed
- [Public Explorer] Make storage tab activable

## [3.0.2] - 2022-12-03
### Changed
- [Public Explorer] Better banner display

## [3.0.1] - 2022-12-03
### Changed
- [Public Explorer] Better custom logo display
- Postgres connection config in dev mode

## [3.0.0] - 2022-11-30
### Added
- Docker files + docker compose

### Changed
- Apps is now hosted on [Fly.io](https://fly.io) instaed of GCP

### Removed
- All Google Cloud dependencies except Firebase Auth & Cloud Logging (optional)

## [2.14.1] - 2022-11-23
### Fixed
- Bug that caused read method calls to be called on the Metamask network when calling with loaded accounts

## [2.14.0] - 2022-11-22
### Fixed
- Bug that prevented contract call if the explorer is public and Metamask is not installed

### Added
- Shortcut to add network to Metamask

## [2.13.0] - 2022-11-15
### Added
- Bytecode & Assembly version are now displayed on contracts pages under the "Code" tab

### Fixed
- Bug preventing from reading storage

## [2.12.1] - 2022-11-14
### Added
- On subscription, add email to Ghost blog (if env variable is set)
- User processing task

### Changed
- Backend user analytics setup is done on the new user processing background task

## [2.12.0] - 2022-11-04
### Changed
- AST is now uploaded to Postgres. Make sure to update the CLI to 2.0.0 and the Hardhat plugin to 3.0.0 so that variable reading keeps working.

## [2.11.4] - 2022-11-01
### Fixed
- Infinite loading for call options if no ABI uploaded

## [2.11.3] - 2022-10-24
### Fixed
- Bug preventing call options to be changed

## [2.11.2] - 2022-10-24
### Fixed
- Fixed bug that prevented proxied erc20 contracts from being correctly processed

## [2.11.1] - 2022-10-23
### Fixed
- Fixed bug that prevented new blocks from being detected during onboarding

## [2.11.0] - 2022-10-22
### Added
- Arbiscan support for contract import (you can update your chain in the "Settings" tab)

## [2.10.1] - 2022-10-19
### Fixed
- [Public Explorer] Overview stats display bug

## [2.10.0] - 2022-10-18
### Added
- [Public Explorer] Possibility to interact with contracts using loaded accounts
- Added Metamask integration in private explorer

## [2.9.4] - 2022-10-13
### Changed
- [Public Explorer] Removed symbol display on total supply

## [2.9.3] - 2022-10-13
### Added
- [Public Explorer] Total supply option

## [2.9.2] - 2022-10-01
### Changed
- Data retention policy for free plan users. [Read More](https://blog.tryethernal.com)

## [2.9.1] - 2022-09-28
### Fixed
- Account unlocking using private keys
- Resetting a workspace now also clears accounts

## [2.9.0] - 2022-09-26
### Removed
- Firebase Functions dependencies. Should make the app faster overall 🚀
- Alchemy integration frontend (not Alchemy webhooks + unused + deprecated token auth)

## [2.8.6] - 2022-09-25
### Fixed
- Unit tests

## [2.8.5] - 2022-09-25
### Fixed
- Settings update (again)
- Contract importing

## [2.8.4] - 2022-09-25
### Fixed
- Settings update was broken

### Changed
- Batch syncing is now done in a separate queue to avoid slowing down normal syncing

## [2.8.3] - 2022-09-22
### Added
- [Public Explorer] Support of custom icons for external links

## [2.8.2] - 2022-09-22
### Changed
- [Public Explorer] Better support of custom logo

## [2.8.1] - 2022-09-21
### Added
- Spinning wheel when web app is loading

### Removed
- Some firebase dependencies, making startup time faster, especially when registering

## [2.8.0] - 2022-09-21
### Changed
- Api token authentication is now done at the user account level, not the workspace

## [2.7.3] - 2022-09-17
### Added
- [Public Explorer] "Powered By Ethernal" link

## [2.7.2] - 2022-09-17
### Fixed
- Bug preventing from interacting with contracts from app.tryethernal.com if the workspace is public

## [2.7.1] - 2022-09-14
### Changed
- Updated onboarding modal wording (previous update didn't actually include that)

## [2.7.0] - 2022-09-14
### Added
- Cloud Run endpoints to sync block range

### Changed
- Updated onboarding modal wording

## [2.6.2] - 2022-09-09
### Added
- ERC-721 tokens tab on each address page

### Fixed
- Retroactive token transfer detection during contract processing

## [2.6.1] - 2022-09-09
### Changed
- Updated error messaging for easier troubleshooting when connecting a new chain

## [2.6.0] - 2022-09-09
### Added
- ERC-721 Support

## [2.5.4] - 2022-09-01
### Fixed
- Timestamp was displayed incorrectly on block page

## [2.5.3] - 2022-08-30
### Fixed
- Boolean inputs are properly handled in contract interactions now (only supports 'true' and 'false').

## [2.5.2] - 2022-08-23
### Added
- Display modal for workspaces connected to a remote rpc to present public explorer offering.

## [2.5.1] - 2022-08-22
### Added
- If ABI is not available, function calls & events are going to be tried to be matched with an ERC-20 ABI. If there is a match it will be decoded.

## [2.5.0] - 2022-08-19
### Added
- [Public Explorer] Added UI for contract verification. Note that import support is limited for now (it will only work if imported files are in the same directory than contract file), but will be improved in the future.

## [2.4.4] - 2022-08-18
### Changed
- [Public Explorer] Contract verification is now done with partial matches (ie metadata are stripped before checking)

## [2.4.3] - 2022-08-17
### Fixed
- Actually fixed bug

## [2.4.2] - 2022-08-17
### Changed
- Fix feedback collector bug

## [2.4.1] - 2022-08-17
### Added
- Re-introduced feedback collector (new one is open-source). Data collected: message, domain, page, email if you are logged in. This data is stored in Firestore and will only be used internally.

## [2.4.0] - 2022-08-16
### Changed
- [Public Explorer] Improved contract verification mechanism (add support for evm version, optimizer, runs number)

### Fixed
- [Public Explorer] Fixed preventing from p calling contract methods

## [2.3.1] - 2022-08-15
### Changed
- Improved test coverage
- Factorized stat component

## [2.3.0] - 2022-08-14
### Added
- [Public Explorer] Added an overview page with analytics: Total tx count, 24h tx count, active wallets count, 14 days tx count graph, 14 days active wallet count

## [2.2.1] - 2022-08-13
### Changed
- Timestamps are now stored as timestamp with time zone instead of strings

## [2.2.0] - 2022-08-08
### Added
- ERC-20 token balances are displayed on the address pages

### Changed
- On token balances/transfers sections, symbols are now always displayed when available
- Small amounts that were previously displayed as 0 are now entirely displayed

### Fixed
- Amount formatted with decimals were not always correct 

## [2.1.4] - 2022-08-03
### Fixed
- Bug preventing from calling read methods

### Changed
- Better display of transactions function calls

### Added
- Contract creation data is now displayed
- Events emitted during contract creation are now displayed

## [2.1.3] - 2022-08-03
### Fixed
- From addresses couldn't be changed in contract pages

## [2.1.2] - 2022-08-03
### Fixed
- JSON parameters were not properly handled in contract call methods

## [2.1.1] - 2022-08-01
### Changed
- Better UI on mobile
- Import contract modal address field & message is now cleared when closing it
- Removed some messages that didn't make sense for the public explorer
- When ABI is not available, display function sig hash & data, and events emitter, topics and data

## [2.1.0] - 2022-08-01
### Added
- Search by address, contract name, token name & symbol, transaction hash, block number & hash

## [2.0.2] - 2022-07-28
### Fixed
- Error was thrown when loading contract page with no accounts available
- Contract verification was not shown in UI

## [2.0.1] - 2022-07-27
### Fixed
- Default contract call options

## [2.0.0] - 2022-07-26
### Changed
- Postgres replaces Firestore as the main datastore. RTDB is still kept for now to store contracts AST, but will be removed evenutally.
- Pusher is used for realtime updates. That means that you'll need to create an account if you want to self-host

## [1.12.3] - 2022-06-07
### Changed
- Updated ethers.js to 5.6.8

## [1.12.2] - 2022-05-17
### Fixed
- Check if error field is present before accessing it when write call fails

## [1.12.1] - 2022-05-06
- Removing total count in pagination for blocks & transactions (Firestore optimization)
- [Public Explorer] Improve favicon customization

## [1.12.0] - 2022-05-02
### Added
- [Public Explorer] Customization of favicon & page title
- [Public Explorer] Fixed theming issue on buttons

## [1.11.12] - 2022-04-16
### Fixed
- Unit tests

## [1.11.11] - 2022-04-15
### Fixed
- Aray parsing for fixed sized array parameters in functions

## [1.11.10] - 2022-04-06
### Fixed
- Transaction error formatting

## [1.11.9] - 2022-04-05
### Fixed
- [Public Explorer] Performance issue on address pages

## [1.11.8] - 2022-04-05
### Fixed
- Pagination with server-side syncing

## [1.11.7] - 2022-04-04
### Added
- Batch server side syncing, for more reliable historical block syncing

## [1.11.6] - 2022-04-04
### Added
- Server side sync: blocks & txs can now be fetched by the server, in background tasks for better reliability

## [1.11.5] - 2022-04-04
### Changed
- Stop automatically adding new detected contracts in the list for every transfers (except for public explorers)

## [1.11.4] - 2022-03-31
### Added
- [Public Explorer] Add custom banner option

## [1.11.3] - 2022-03-31
### Fixed
- Only record session with LR for logged in users on app.tryethernal.com

### Added
- [Public Explorer] More UI customization options: logo, extra links, font, colors

## [1.11.2] - 2022-03-31
### Fixed
- Fix LR session recording

## [1.11.1] - 2022-03-31
### Changed
- Only record sessions on Logrocket on app.tryethernal.com

## [1.11.0] - 2022-03-30
### Added
- Display error message for failed transactions

## [1.10.0] - 2022-03-29
### Changed
- Balance changes amounts & token transfers amounts are now formatted according to the number of decimals `decimals()` return, if this method doesn't esists, it is not formatted.
- Tokens detected during `Transfer`events processing are added to the list of tokens/contracts

## [1.9.1] - 2022-03-27
### Changed
- Updated wording on storage section

## [1.9.0] - 2022-03-21
### Added
- [Public Explorer] Add server side contract verification, see doc for more info
- [Public Explorer] Add billing for explorer plan

## [1.8.1] - 2022-03-20
### Changed
- [Public Explorer] Do not display metadata upload field unless you're logged in as an admin
- [Public Explorer] Do not display "Token" tab on the contract's page

## [1.8.0] - 2022-03-19
### Fixed
- Pagination was off if a tx or block was synced multiple times

### Added
- Logic to bill transactions & empty blocks for public explorer plans (an empty block is billed, a block including at least one transaction is not billed, all transactions are billed)

## [1.7.2] - 2022-03-14
### Changed
- Blocks & txs synced are now batched with counter increments for more accuracy

## [1.7.1] - 2022-03-14
### Changed
- Display trace step even if there isn't an input

## [1.7.0] - 2022-03-14
### Changed
- Tracing is now proccessed server side for public explorers
- Tracing steps are now formatted as others variables
- Read functions results have a more consistent display with the rest of the UI

## [1.6.3] - 2022-03-11
### Changed
- Balance changes is now processed server side for public explorers

### Removed
- Transaction top right menu for public explorers

## [1.6.2] - 2022-03-10
### Added
- Support for custom domains for public explorers

## [1.6.1] - 2022-03-09
### Fixed
- Bug that prevented storage from being displayed

## [1.6.0] - 2022-03-08
### Changed
- Token transfers are now processed server side & stored - they will be displayed even if there is no ABI associated to the contract
- Balance changes are now stored server side
- uint256 are not formatted anymore, too many use cases for this type to be able to infer how to process it automatically
- Arrays are better displayed now (in functions call parameters & in return values)

### Added
- "Reprocessing" option on a menu on the top right of the transaction page, that will reprocess token transfers & balance changes in case the automatic processing failed for some reason

## [1.5.6] - 2022-03-08
### Fixed
- Onboarding bug that prevented workspace creation
- Alchemy integration bug that prevented activation if url wasn't alchemy.io

## [1.5.5] - 2022-03-03
### Fixed
- Checksumed addresses now works for addresses pages

## [1.5.4] - 2022-03-03
### Changed
- Add /tx/:hash and /token/:hash routes for better Metamask integration

## [1.5.3] - 2022-03-03
### Changed
- Public explorer parameters are now loaded directly from Firestore for faster initial loading

## [1.5.2] - 2022-03-03
### Fixed
- Server side contract processing (token & proxy detection) in public explorer mode

## [1.5.1] - 2022-03-03
### Fixed
- When sending a transaction with Metamask, the value passed was wrong
- Display error messages when using Metamask

## [1.5.0] - 2022-02-28
### Changed
- README updated

### Added
- It's now possible to make your workspace public and accessible through an url like http://wagmi.tryethernal.com, turning it into a public explorer, it can't be activated through the interface yet, but if you are interested in setting this up for you, reach out to Antoine | Ethernal on the Discord server or by email.

## [1.4.2] - 2022-02-23
### Removed
- Accounts are not fetched anymore on workspace creation. This was preventing from connecting to chain without the eth_accounts endpoint

## [1.4.1] - 2022-02-22
### Changed
- Onboarding text when there are issues connecting on remote servers

## [1.4.0] - 2022-02-22
### Changed
- Pagination for blocks & transactions is now done server side

## [1.3.6] - 2022-02-15
### Fixed
- Function calls from proxied contracts are now properly decoded in tracing steps

## [1.3.5] - 2022-02-14
### Fixed
- All parameters were displayed in all inputs on the contract interaction page

## [1.3.4] - 2022-02-14
### Changed
- Better tuples handling on the contract interaction page, they can be entered like this `(param1,param2)`, function signatures on this page are also more precise and will display names when applicable
- Happy Valentine's day (even to those spending it releasing updates & bug fixes) 💝

## [1.3.3] - 2022-02-05
### Changed
- Wording on onboarding modal, to make the process clearer, especially around logging in client side.
- Moving around external links (doc, Discord)

### Added
- Feedback box on the top, maybe this'll work better than Product Road?

## [1.3.2] - 2022-02-03
### Fixed
- RPC server & chain were not displayed properly
- Small race condition where button loading would change state before request is finished
- Not all chains were properly on workspace creation

### Removed
- Obsolete frontend Stripe library

## [1.3.1] - 2022-02-01
### Added
- Avalanche support: contracts metadata can be imported from Snowtrace & the currency is set to Avax when selecting the chain

### Changed
- Technical refactor around multiple chain (only one source of available chains in the frontend now)

## [1.3.0] - 2022-01-31
### Removed
- Trial period: it made sense to have a trial when the transaction tracing feature was only included in the Premium plan, but now that it is available in the free plan as well, it doesn't anymore. The only difference between free/premium is now the 10 contracts/1 workspace limitation. And it doesn't make sense to have a trial for that (the free plan IS the trial already).

### Added
- Custom pricing column in the Billing section

### Changed
- Only include relevant info in the plan explanation in Billing section

## [1.2.10] - 2022-01-30
### Added
- Method name in transactions lists. Hovering it will display a tooltip with the decoded arguments. Updating the ABI updates this in real time. If the method name is not available, the function signature will be displayed instead.

## [1.2.9] - 2022-01-14
### Added
- Link to Product Road board to collect feature requests, you can ask for (almost) anything & I'll build it!!

## [1.2.8] - 2022-01-11
### Added
- It's now possible to edit a workspace server url

## [1.2.7] - 2022-01-07
### Added
- Mixpanel tracking for workspace creation (for better onboarding analytics)

### Fixed
- An analytics helper function wasn't working properly

### Changed
- Wording on the onboarding modal (clearer for Hardhat users)

## [1.2.6] - 2022-01-06
### Changed
- Artifacts stored in rtdb (ast) are deleted after 1 week of not being updated, for free users only. It's only useful for reading storage, and takes up a lot of space, increasing the bill.

## [1.2.5] - 2021-12-24
### Fixed
- Error handling when some write methods are failing
- Merry Christmas 🎅!

## [1.2.4] - 2021-12-21
### Changed
- Prevents from restarting Stripe subscription portal while the subscription webhook is still being processed, better messaging too.

### Removed
- RPC requests sent from the server. All is sent from the browser now. Might need some remote chains to be configured to accept app.tryethernal.com as a domain name but sending requests from Firebase Functions was really buggy

## [1.2.3] - 2021-12-21
### Fixed
- Bumped ethers.js to 5.5.0, fixing bug happening when a Solidity function has the same name than a javascript function (???? see https://github.com/ethers-io/ethers.js/issues/1432)

## [1.2.2] - 2021-12-20
### Added
- Data URI for application/json is parsed and formatted when returned by methods

## [1.2.1] - 2021-12-20
### Added
- Backend tracking to Mixpanel: an event is sent when the following actions happen: block sync, trace sync, artifact sync, contract imported, contract removed, signup, plan change. No blockchain data is sent, only user id, current plan, stripe subscription status, trial date.

### Changed
- Values emitted by events and returned by methods are now automatically parsed and formatted depending on their type. It's possible to switch between parsed/raw data

### Fixed
- Wording related to transaction tracing

## [1.2.0] - 2021-12-14
### Added
- Token balances changes on transaction page (between previous/current block)
- Token transfers on transaction page (based on Transfer event)
- Contracts are automatically tagged with "erc20" and "proxy" tags in the "Contracts" page
- New tokens pages that lists all ERC20 tokens
- On an address page that is a token, there is a new tab that shows the token balance in the latest block for all tracked addresses (addresses in the "Accounts" page)
- On transaction page, uint256 values are easily convertible to int by clicking on the button next to it

### Changed
- Transaction tracing is now included in the free plan
- Contract matching with local or mainnet is done asynchronously. A process in the frontend is monitoring new contracts on Firebase and triggers the matching process (this is done in the frontend so requests can be sent to the chain)
- Contract names are now displayed instead of addresses when applicable
- Function calls and events are now properly decoded with proxy contracts

### Fixed
- Properly set email in Logrocket analytics for premium accounts

## [1.1.4] - 2021-11-18
### Added
- Possibility to import unverified contracts

### Removed
- Open source banner

## [1.1.3] - 2021-10-28
### Changed
- Analytics are only loaded if ENABLE_ANALYTICS env variable is present
- Logrocket id is an env variable
- Logrocket users are tagged with their plan

## [1.1.2] - 2021-10-27
### Fixed
- Loader for contract deletion modal
- Unlocked accounts were showing up twice

### Changed
- Wording for transaction tracing section in transaction page, for free users

## [1.1.1] - 2021-10-26
### Fixed
- Wording for import contract modal (now depends on the chain setting)

## [1.1.0] - 2021-10-26
### Added
- Better support for BSC & Matic: native currencies, contract import, contract matching for tracing
- Technical improvement in how workspaces are created

### Fixed
- Handling of array of addresses for contract methods
- Handling of method responses that are not arrays

## [1.0.1] - 2021-10-25
### Fixed
- Handling of array parameters for contract methods
- Error message was not properly handled and not displayed in some scenario when interacting with contract methods (when gas limit was wrong for example)

## [1.0.0] - 2021-10-18
### Changed
- Ethernal is now open source 🥳 (see [https://blog.tryethernal.com/ethernal-is-going-open-source/](https://blog.tryethernal.com/ethernal-is-going-open-source/))
- Contracts list is now ordered by deploy time, which is displayed
- All writes action are now done on the backend, firestore/rtdb rules are now forbidding any direct write

### Added
- Premium plan 🤑
- Possiblity to remove contracts
- BSL license for Ethernal

### Fixed
- Github Action for backend tests (it wasn't running)

## [0.3.3] - 2021-10-18
### Fixed
- Solidity 'pure' functions are now properly showing under "Read Methods" in the contract's UI page.

## [0.3.2] - 2021-10-16
### Fixed
- Error handling on write functions

## [0.3.1] - 2021-09-16
### Fixed
- Ethernal now decodes & displays custom Solidity exceptions when thrown

### Added
- Unit tests that were missing for a frontend library

## [0.3.0] - 2021-09-03
### Changed
- Events emitted by contracts called internally in a transaction are now properly decoded
- Transaction tracing now handles proxy contracts

## [0.2.1] - 2021-07-31
### Fixed
- UI bug with the display of Alchemy integration enabled/disabled status.

### Added
- Storage API, see: https://doc.tryethernal.com/integrations/api.
- Copy to clipboard shortcut on hashes & addresses.

## [0.2.0] - 2021-07-29
### Changed
- Various internals (moved some stuff from frontend to backend).
- All account addresses are lowercased.

### Added
- Unit tests for all Vue components, frontend libraries, backend libraries and cloud functions.

### Fixed
- Addresses should all be lowercased now.
- When a write tx fails, the receipt will stop loading and it will show on the UI.
- When selecting a tx for the first time on the storage page, storage is automatically displayed after being decoded.

## [0.1.3] - 2021-06-27
### Changed
- Etherscan contract import is now done server side.
- Some actions are now done server side: workspace creation/switching, balance syncing and settings update.
- Code factorization between workspace creation in onboarding modal/workspace creation modal.
- Some components have been refactored for easier integration: event/functions display, transaction picker.
- All UI components are now unit tested!
- Github Actions workflow has been changed to do the following: test on all push/pr, deploy saas & sh on a new tag on master only if test pass.

### Fixed
- Function signature generation when syncing transaction.
- Some server side error logging.
- ABI import from a file.

## [0.1.2] - 2021-06-02
### Changed
- Allow contract dependencies to be updated one by one (if all are updated at once, we are more likely to hit the 10mb payload limit from Firebase).

## [0.1.1] - 2021-05-21
### Added
- Changelog file that will be updated at each release.

### Changed
- Firebase variables need to be set manually in app.js.
