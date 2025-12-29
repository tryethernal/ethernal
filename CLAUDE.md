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

**Against Docker database (local development):**
```bash
docker-compose -f docker-compose.dev.yml exec backend npx sequelize db:migrate
docker-compose -f docker-compose.dev.yml exec backend npx sequelize db:seed:all
```

**Against local PostgreSQL (non-Docker):**
```bash
cd run
npx sequelize db:migrate     # Run migrations
npx sequelize db:seed:all    # Run all seeders
```

**Important:** Always use sequelize migrations, never run raw SQL for schema changes. This ensures migrations are properly tracked and stay in sync with production.

### Docker Local Development
```bash
docker-compose -f docker-compose.dev.yml up -d    # Start full dev stack
docker-compose -f docker-compose.dev.yml down     # Stop dev stack
docker-compose -f docker-compose.dev.yml logs -f  # View logs
```

### Docker Self-Hosted Production
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

## Local Development Setup

### Using Docker Compose (Recommended)

The `docker-compose.dev.yml` provides a complete local development environment:

**Services Started:**
| Service | Port | Description |
|---------|------|-------------|
| frontend | 8080 | Vue dev server (hot reload) |
| backend | 8888 | Express API server |
| workers | - | High/medium/low priority job workers |
| postgres | 5432 | TimescaleDB database |
| redis | 6379 | Job queue storage |
| soketi | 6001 | WebSocket server (Pusher-compatible) |
| pgbouncer | 6432 | Connection pooler |
| stripe-cli | - | Stripe webhook forwarding |

**Steps:**
```bash
# 1. Copy environment file
cp run/.env.example run/.env

# 2. Edit run/.env with your settings (see Environment Variables below)

# 3. Start the stack
docker-compose -f docker-compose.dev.yml up -d

# 4. Run database migrations (first time only)
docker-compose -f docker-compose.dev.yml exec backend npx sequelize db:migrate

# 5. Access the app
# Frontend: http://localhost:8080
# Backend API: http://localhost:8888
```

**Volumes:**
- Source code is mounted for hot reload
- Database data persists in `db-data` volume

### Without Docker

If running services individually:

```bash
# 1. Start PostgreSQL (TimescaleDB) and Redis locally

# 2. Configure run/.env with local database credentials

# 3. Install dependencies
yarn install        # Frontend
cd run && npm install  # Backend

# 4. Run migrations
cd run && npx sequelize db:migrate

# 5. Start services in separate terminals
yarn dev                    # Frontend (terminal 1)
cd run && npm start         # Backend (terminal 2)
cd run && npm run worker:high    # Worker (terminal 3)
```

### Environment Variables

Key variables in `run/.env`:

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/ethernal
ENCRYPTION_KEY=<32-char-secret>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Soketi (WebSockets)
SOKETI_HOST=localhost
SOKETI_PORT=6001
SOKETI_APP_ID=ethernal
SOKETI_APP_KEY=ethernal
SOKETI_APP_SECRET=ethernal

# Optional: Stripe (for billing features)
STRIPE_WEBHOOK_SECRET=<from-stripe-cli>
```

## Self-Hosted Production Setup

### Using Docker Compose + Makefile

The `docker-compose.prod.yml` and `Makefile` provide production deployment:

**First-Time Setup:**
```bash
# 1. Run make start (generates env files interactively)
make start

# This will:
# - Generate .env.prod, .env.postgres.prod, .env.soketi.prod
# - Prompt you for required values
# - Start all containers
# - Run database migrations
```

**Generated Environment Files:**
| File | Purpose |
|------|---------|
| `.env.prod` | Main app config (encryption key, Stripe keys, etc.) |
| `.env.postgres.prod` | Database credentials |
| `.env.soketi.prod` | WebSocket server config |

**Production Services:**
| Service | Description |
|---------|-------------|
| frontend | Pre-built Vue app (antoinedc44/ethernal-frontend) |
| backend | Express API (antoinedc44/ethernal-backend) |
| workers | Job processors (high/medium/low) |
| postgres | TimescaleDB with persistence |
| redis | Job queue storage |
| soketi | WebSocket server |
| pm2 | Process manager for background jobs |
| caddy | Reverse proxy with automatic SSL |

**Management Commands:**
```bash
make start   # Start/restart stack
make stop    # Stop all containers
make update  # Pull latest images, recreate, migrate
make nuke    # Delete everything including data volumes
```

### CI/CD Pipeline

GitHub Actions (`.github/workflows/test_and_deploy.yml`) handles:

**On Every Push/PR:**
- Backend tests (`npm test` in run/)
- Frontend tests (`yarn test`)

**On Version Tags (v*):**
- Build multi-arch Docker images (amd64, arm64)
- Push to Docker Hub
- Deploy frontend to Netlify
- Deploy backend/pm2/soketi to Fly.io

## Testing OP Stack Integration

### Prerequisites

To test OP Stack features, you need:
1. An L2 workspace (your OP Stack chain)
2. An L1 parent workspace (Ethereum mainnet or testnet)
3. OP Stack contract addresses

### Setup Steps

```bash
# 1. Start local environment
docker-compose -f docker-compose.dev.yml up -d

# 2. Create an explorer for your L2 chain via the UI

# 3. Configure OP Stack settings via ExplorerOpSettings:
#    - Portal Address (OptimismPortal)
#    - Batch Inbox Address (typically 0xff00...chainId)
#    - L2 Output Oracle (legacy) or Dispute Game Factory (modern)
#    - Parent Chain ID and Workspace

# 4. The integration will automatically:
#    - Detect batches submitted to the batch inbox
#    - Track deposits (L1→L2) via TransactionDeposited events
#    - Track withdrawals (L2→L1) via MessagePassed events
#    - Track state outputs/proposals
```

### OP Stack Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/op/batches` | OpBatches | Transaction batches list |
| `/op/batches/:index` | OpBatchDetail | Batch details + L2 txs |
| `/op/outputs` | OpOutputs | State output proposals |
| `/op/outputs/:index` | OpOutputDetail | Output details |
| `/op/deposits` | OpDeposits | L1→L2 deposits |
| `/op/withdrawals` | OpWithdrawals | L2→L1 withdrawals |

### Running Tests

```bash
# Backend OP Stack tests
cd run && npm test -- tests/api/opBatches.test.js
cd run && npm test -- tests/api/opOutputs.test.js
cd run && npm test -- tests/api/opDeposits.test.js
cd run && npm test -- tests/api/opWithdrawals.test.js
cd run && npm test -- tests/lib/opBatches.test.js

# Frontend OP Stack tests
yarn test -- OpBatches
yarn test -- OpOutputs
```
