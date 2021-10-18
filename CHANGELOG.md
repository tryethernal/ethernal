# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
