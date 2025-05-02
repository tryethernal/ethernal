# Docker Deployment Plan for Ethernal

This document outlines a step-by-step approach to containerize and deploy the Ethernal application using Docker, making it easy to configure through environment variables.

## Project Structure Overview

- **Frontend**: Located in the `src/` directory
- **Backend**: Located in the `run/` directory
- **Configuration**: Environment variables in `.env` files

## Step 1: Environment Configuration

### 1.1 Create Standard Environment Files

1. Create `.env.example` for the frontend with all required variables:
   ```
   # Frontend Environment Variables
   VITE_VERSION=
   VITE_API_ROOT=https://api.example.com
   VITE_MAIN_DOMAIN=example.com
   VITE_PUSHER_KEY=your-pusher-key
   VITE_SOKETI_HOST=
   VITE_SOKETI_PORT=
   VITE_SOKETI_FORCE_TLS=
   VITE_POSTHOG_API_KEY=
   VITE_POSTHOG_API_HOST=
   VITE_ENABLE_ANALYTICS=false
   VITE_ENABLE_DEMO=false
   VITE_ENABLE_BILLING=false
   VITE_ENABLE_MARKETING=false
   VITE_SENTRY_DSN_SECRET=
   VITE_SENTRY_DSN_PROJECT_ID=
   VITE_FEEDBACK_FIN_ENDPOINT=
   ```

2. Create `run/.env.example` for the backend with all required variables:
   ```
   # Backend Environment Variables
   ENCRYPTION_KEY=
   ENCRYPTION_JWT_SECRET=
   APP_URL=
   PUSHER_APP_ID=
   PUSHER_KEY=
   PUSHER_SECRET=
   REDIS_HOST=redis
   REDIS_PORT=6379
   DB_HOST=postgres
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   DB_NAME=ethernal
   DB_PORT=5432
   BULLBOARD_USERNAME=ethernal
   BULLBOARD_PASSWORD=ethernal
   SECRET=secret
   PORT=8888
   NODE_ENV=production
   CORS_DOMAIN=*
   # Add all other backend-specific variables
   ```

3. Document all environment variables in the README with descriptions of each variable's purpose.

### 1.2 Implement Environment Variable Handling

1. Ensure frontend code correctly loads variables from `.env` files through Vite/Vue configuration
2. Ensure backend code properly loads variables from `.env` files

## Step 2: Optimize Dockerfiles

### 2.1 Create Frontend Dockerfile

Create an optimized `Dockerfile.frontend`:

```dockerfile
FROM node:18 AS build

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copy source files
COPY public/ ./public/
COPY src/ ./src/
COPY index.html vite.config.js babel.config.js .firebaserc _redirects _headers ads.txt ./

# Build the application
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN yarn build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Support runtime environment configuration
COPY docker/env.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/env.sh

EXPOSE 80
```

### 2.2 Create Backend Dockerfile

Create an optimized `Dockerfile.backend`:

```dockerfile
FROM node:18 AS base

WORKDIR /app

# Copy package files first for better caching
COPY run/package*.json ./
RUN npm ci

# Copy source files
COPY run/api ./api
COPY run/config ./config
COPY run/jobs ./jobs
COPY run/lib ./lib
COPY run/middlewares ./middlewares
COPY run/models ./models
COPY run/webhooks ./webhooks
COPY run/workers ./workers
COPY run/app.js run/index.js run/queues.js run/scheduler.js run/instrument.js ./
COPY run/.sequelizerc ./
COPY run/migrations ./migrations

# Development stage
FROM base AS development
RUN npm install -g nodemon
CMD ["nodemon", "index.js"]

# Production stage
FROM base AS production
ENV NODE_ENV=production
CMD ["node", "index.js"]
```

### 2.3 Create Worker Dockerfile

For background processing workers:

```dockerfile
FROM node:18

WORKDIR /app

# Copy package files first for better caching
COPY run/package*.json ./
RUN npm ci --only=production

# Copy source files
COPY run/api ./api
COPY run/config ./config
COPY run/jobs ./jobs
COPY run/lib ./lib
COPY run/middlewares ./middlewares
COPY run/models ./models
COPY run/webhooks ./webhooks
COPY run/workers ./workers
COPY run/app.js run/queues.js run/scheduler.js run/instrument.js ./

# Worker types will be defined with different entry points
CMD ["node", "workers/mediumPriority.js"]
```

## Step 3: Create Docker Compose Files

### 3.1 Development Docker Compose

Create `docker-compose.dev.yml`:

```yaml
version: "3.9"

volumes:
  postgres-data:
  redis-data:

services:
  postgres:
    image: timescale/timescaledb-ha:pg14
    volumes:
      - postgres-data:/home/postgres/pgdata/data
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_DB=${DB_NAME:-ethernal}
    ports:
      - "${DB_PORT:-5432}:5432"

  redis:
    image: redis:6.2-alpine
    volumes:
      - redis-data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: development
    volumes:
      - ./run:/app
      - /app/node_modules
    env_file: run/.env
    ports:
      - "${PORT:-8888}:8888"
    depends_on:
      - postgres
      - redis

  high_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: development
    volumes:
      - ./run:/app
      - /app/node_modules
    env_file: run/.env
    command: nodemon workers/highPriority.js
    depends_on:
      - postgres
      - redis

  medium_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: development
    volumes:
      - ./run:/app
      - /app/node_modules
    env_file: run/.env
    command: nodemon workers/mediumPriority.js
    depends_on:
      - postgres
      - redis

  low_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: development
    volumes:
      - ./run:/app
      - /app/node_modules
    env_file: run/.env
    command: nodemon workers/lowPriority.js
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      target: build
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - ./index.html:/app/index.html
      - /app/node_modules
    env_file: .env
    ports:
      - "8080:8080"
    command: yarn serve
    depends_on:
      - backend

  soketi:
    image: quay.io/soketi/soketi:1.6.1-16-debian
    ports:
      - "6001:6001"
    env_file: run/.env
```

### 3.2 Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.9"

volumes:
  postgres-data:
  redis-data:

services:
  postgres:
    image: timescale/timescaledb-ha:pg14
    volumes:
      - postgres-data:/home/postgres/pgdata/data
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_DB=${DB_NAME}
    restart: always

  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - AUTH_TYPE=scram-sha-256
      - POOL_MODE=transaction
      - ADMIN_USERS=${POSTGRES_USER},admin
      - MAX_CLIENT_CONN=1000
    ports:
      - "5433:5432"
    depends_on:
      - postgres
    restart: always

  redis:
    image: redis:6.2-alpine
    volumes:
      - redis-data:/data
    restart: always

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: production
    env_file: .env.prod
    ports:
      - "${PORT:-8888}:8888"
    depends_on:
      - pgbouncer
      - redis
    restart: always

  high_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: production
    env_file: .env.prod
    command: node workers/highPriority.js
    depends_on:
      - pgbouncer
      - redis
    restart: always

  medium_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: production
    env_file: .env.prod
    command: node workers/mediumPriority.js
    depends_on:
      - pgbouncer
      - redis
    restart: always

  low_priority_worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: production
    env_file: .env.prod
    command: node workers/lowPriority.js
    depends_on:
      - pgbouncer
      - redis
    restart: always

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      target: production
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  soketi:
    image: quay.io/soketi/soketi:1.6.1-16-debian
    env_file: .env.prod
    restart: always
```

## Step 5: Nginx Configuration for Frontend

Create an nginx configuration file for the frontend:

```nginx
# docker/nginx.conf
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Load environment variables first
    location = /env-config.js {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Add any other needed configurations
    # (caching, compression, etc.)
}
```

## Step 6: Database Migrations and Initialization

Create a script to handle database migrations on container startup:

```bash
#!/bin/sh
# docker/wait-for-db.sh

set -e

until npm run db:migrate; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

>&2 echo "Postgres is up - executing command"
exec "$@"
```

Update the backend Dockerfile to use this script.

## Step 7: Configure Optional Features for Self-Hosted Deployments

Some features that are essential for the SaaS version of Ethernal may not be necessary or appropriate for self-hosted deployments. These features should be made optional and easily configurable through environment variables.

### 7.1 Leverage Existing Environment Variable Handling

The project already has robust environment variable handling through dedicated files:

1. Backend: `run/lib/env.js` provides getter methods for environment variables:
   ```javascript
   // Sample of existing env.js structure
   module.exports = {
       getStripeSecretKey: () => process.env.STRIPE_SECRET_KEY,
       getStripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET,
       getPostHogApiKey: () => process.env.POST_HOG_API_KEY,
       getDemoUserId: () => process.env.DEMO_USER_ID,
       // ...other getters
   };
   ```

2. Frontend: `src/stores/env.js` uses Pinia state management with environment variables:
   ```javascript
   // Sample of existing store structure
   export const useEnvStore = defineStore('env', {
       state: () => ({
           hasAnalyticsEnabled: !!import.meta.env.VITE_ENABLE_ANALYTICS,
           hasDemoEnabled: !!import.meta.env.VITE_ENABLE_DEMO,
           isBillingEnabled: !!import.meta.env.VITE_ENABLE_BILLING,
           isMarketingEnabled: !!import.meta.env.VITE_ENABLE_MARKETING,
           // ...other state properties
       }),
   });
   ```

3. Use these existing patterns for all optional features, ensuring consistent handling of environment variables.

### 7.2 Payment Processing (Stripe)

1. The backend already has `getStripeSecretKey()` and `getStripeWebhookSecret()` methods in env.js, and the frontend has `isBillingEnabled` flag.

2. Ensure documentation includes all required Stripe environment variables:
   ```
   # Backend Environment Variables
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   STRIPE_PRICE_ID_PRO=
   STRIPE_PRICE_ID_TEAM=
   
   # Frontend Environment Variables
   VITE_ENABLE_BILLING=true/false
   ```

3. Update backend code to check for Stripe configuration:
   ```javascript
   // Example implementation in a service
   const env = require('../lib/env');
   
   // Use this in route handlers
   if (env.getStripeSecretKey() && env.getStripeWebhookSecret()) {
       // Initialize Stripe and register webhook routes
   }
   ```

4. In the Docker Compose file, make Stripe service conditional based on environment:
   ```yaml
   services:
     # ... other services
     
     # This service should only be included when STRIPE_SECRET_KEY is provided
     stripe:
       image: stripe/stripe-cli
       command: listen --forward-to http://web:8888/webhooks/stripe
       env_file: .env.stripe
       profiles:
         - billing
   ```

   Then use `docker-compose --profile billing up` when Stripe is needed.

### 7.3 Demo Features

1. The frontend already has `hasDemoEnabled` flag and the backend has `getDemoUserId()` and `getDemoTrialSlug()` getters:

2. Document all required demo-related environment variables:
   ```
   # Backend Environment Variables
   DEMO_USER_ID=
   DEMO_TRIAL_SLUG=
   WHITELISTED_NETWORK_IDS_FOR_DEMO=
   MAX_DEMO_EXPLORERS_FOR_NETWORK=3
   
   # Frontend Environment Variables
   VITE_ENABLE_DEMO=true/false
   ```

3. Create helper function in backend to check demo status:
   ```javascript
   // Example implementation
   const env = require('../lib/env');
   
   // Use in routes
   if (!!env.getDemoUserId() && !!env.getDemoTrialSlug()) {
       // Register demo routes
       app.use('/api/demo', demoRoutes);
   }
   ```

### 7.4 Marketing and Analytics Tools

1. The project already has getters for analytics tools in backend env.js and flags in frontend store:
   - Backend: `getPostHogApiKey()`, `getMixpanelApiToken()`
   - Frontend: `hasAnalyticsEnabled`, `isMarketingEnabled`

2. Document all required analytics-related environment variables:
   ```
   # Backend Environment Variables
   POST_HOG_API_KEY=
   POST_HOG_API_HOST=
   MIXPANEL_API_TOKEN=
   
   # Frontend Environment Variables
   VITE_ENABLE_ANALYTICS=true/false
   VITE_ENABLE_MARKETING=true/false
   VITE_POSTHOG_API_KEY=
   VITE_POSTHOG_API_HOST=
   ```

3. No additional code changes needed as the conditional initialization is likely already implemented.

### 7.5 Add New Feature Flags (If Needed)

For any features not already covered by existing environment variables:

1. Backend: Add new getter methods to `run/lib/env.js`:
   ```javascript
   module.exports = {
       // Existing getters
       // ...
       
       // New getters
       getFeatureXEnabled: () => !!process.env.FEATURE_X_ENABLED,
   };
   ```

2. Frontend: Add new state properties to `src/stores/env.js`:
   ```javascript
   state: () => ({
       // Existing properties
       // ...
       
       // New properties
       hasFeatureXEnabled: !!import.meta.env.VITE_FEATURE_X_ENABLED,
   }),
   ```

### 7.6 Environment Variable Documentation

Create comprehensive documentation of all environment variables:

1. Create `.env.example` files for both frontend and backend with:
   - All required variables
   - Sensible defaults for optional features
   - Clear comments explaining each variable's purpose and effect

2. In the README, create a "Configuration" section that explains:
   - Core required variables that must be set
   - Optional feature flags and their implications
   - Variables that should be kept in sync between frontend and backend

## Step 8: Documentation

### 8.1 Create a Comprehensive README

Update the README.md with detailed information about:
- System requirements
- Environment variable configuration
- Build and deployment instructions
- Development workflow

### 8.2 Create a Deployment Guide

Create a DEPLOYMENT.md document with:
- Step-by-step instructions for different deployment scenarios
- Configuration examples for various environments
- Troubleshooting tips

## Step 9: Implementation Plan

1. Implement all Dockerfiles and test individually
2. Implement Docker Compose files and test locally
3. Create CI/CD pipelines for automated building and testing
4. Test deployment workflows in staging environment
5. Document production deployment process

## Step 10: Security Considerations

1. Ensure secrets are never baked into Docker images
2. Use environment variables for all sensitive information
3. Implement proper validation for environment variables
4. Set up secure defaults where possible
5. Use Docker secrets or external secret management systems for production

## Step 11: Monitoring and Maintenance

1. Integrate logging solution (e.g., fluentd, ELK stack)
2. Set up health checks for all containers
3. Create backup and recovery processes
4. Document maintenance procedures

## Next Steps

- Implement the above plan
- Test thoroughly in a development environment
- Refine the approach based on testing feedback
- Deploy to staging and production environments 