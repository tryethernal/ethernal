# Docker Development Commands

All local development runs through Docker Compose. Never run app services directly via bare `npm`/`yarn` commands outside Docker.

## Docker Local Development
```bash
docker compose -f docker-compose.dev.yml up -d              # Start full dev stack
docker compose -f docker-compose.dev.yml down                # Stop dev stack
docker compose -f docker-compose.dev.yml logs -f             # View logs
docker compose -f docker-compose.dev.yml up -d backend       # Start single service
docker compose -f docker-compose.dev.yml restart backend     # Restart a service
```

## Frontend
```bash
docker compose -f docker-compose.dev.yml exec frontend yarn test             # Run Vitest tests
docker compose -f docker-compose.dev.yml exec frontend yarn test:update      # Update test snapshots
docker compose -f docker-compose.dev.yml exec frontend yarn lint             # ESLint with auto-fix
docker compose -f docker-compose.dev.yml exec frontend yarn build            # Production build
```

## Backend
```bash
docker compose -f docker-compose.dev.yml exec backend npm test                              # Run Jest tests
docker compose -f docker-compose.dev.yml exec backend npm run test:update                   # Update snapshots
docker compose -f docker-compose.dev.yml exec backend npm test -- tests/api/faucets.test.js # Single test file
docker compose -f docker-compose.dev.yml exec backend npm test -- --testPathPattern=faucets # Pattern matching
```

## Database Migrations
```bash
docker compose -f docker-compose.dev.yml exec backend npx sequelize db:migrate
docker compose -f docker-compose.dev.yml exec backend npx sequelize db:seed:all
```

Always use sequelize migrations, never run raw SQL for schema changes.

## Landing Site
```bash
docker compose -f docker-compose.dev.yml up -d landing       # Start (port 8174)
docker compose -f docker-compose.dev.yml exec landing npm run build  # Production build
```

## Sentry Dashboard
```bash
docker compose -f docker-compose.dev.yml up -d sentry-dashboard       # Start (port 8175)
docker compose -f docker-compose.dev.yml exec sentry-dashboard npm run build  # Production build
```

## Docker Self-Hosted Production
```bash
make start   # Start production stack (generates env files on first run)
make stop    # Stop all containers
make update  # Pull latest images and run migrations
make nuke    # Remove everything including volumes
```
