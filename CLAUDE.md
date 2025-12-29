# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ethernal is an open-source block explorer for EVM-based chains. It consists of a Vue 3 frontend and a Node.js/Express backend with PostgreSQL database.

## Common Commands

### Frontend (root directory)
```bash
yarn dev          # Start dev server with Vite
yarn build        # Production build
yarn test         # Run Vitest tests
yarn test:update  # Update test snapshots
yarn lint         # ESLint with auto-fix
```

### Backend (run/ directory)
```bash
cd run
npm start                    # Start server with nodemon
npm test                     # Run Jest tests
npm run test:update          # Update snapshots
npm run worker:high          # Start high priority worker
npm run worker:medium        # Start medium priority worker
npm run worker:low           # Start low priority worker
```

### Database Migrations
```bash
cd run
npx sequelize db:migrate     # Run migrations
npx sequelize db:seed:all    # Run all seeders
```

### Docker (self-hosted production)
```bash
make start   # Start production stack (generates env files on first run)
make stop    # Stop all containers
make update  # Pull latest images and run migrations
make nuke    # Remove everything including volumes
```

## Architecture

### Frontend (`src/`)
- **Vue 3** with Vuetify 3 for UI components
- **Pinia** stores in `src/stores/` for state management
- **Vite** for build tooling, Vitest for testing
- Components in `src/components/` - major ones include Block, Transaction, Address, Contract views
- Router in `src/plugins/router.js` - includes Etherscan-compatible routes

### Backend (`run/`)
- **Express** server with Sequelize ORM
- **BullMQ** for job queues with Redis
- **Soketi** (Pusher-compatible) for real-time updates
- API routes in `run/api/` - RESTful endpoints for blocks, transactions, contracts, explorers
- Sequelize models in `run/models/`
- Background jobs in `run/jobs/` - block syncing, contract processing, token transfers
- Workers in `run/workers/` - high/medium/low priority queues

### Job Queue System
Jobs are prioritized into three queues (high, medium, low) plus a dedicated `processHistoricalBlocks` queue. Workers process jobs like `blockSync`, `processContract`, `processTokenTransfer`.

### Key Models
- `Explorer` - represents a blockchain explorer instance
- `Block`, `Transaction`, `Contract` - core blockchain data
- `TokenTransfer`, `ERC721Token` - token-related data
- `User`, `Workspace` - user and workspace management

## Testing

Frontend tests: `tests/unit/` directory, uses Vitest with Vue Test Utils
Backend tests: `run/tests/` directory, uses Jest with supertest

Run a single frontend test:
```bash
yarn test -- path/to/test.spec.js
```

Run a single backend test:
```bash
cd run && npm test -- path/to/test.spec.js
```

## Code Style

- Preserve existing code comments unless completely irrelevant after changes
- Fix Vue console warnings (`[Vue warn]`)
- Use `@/` alias for imports from `src/` in frontend code
