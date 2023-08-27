# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
