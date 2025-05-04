#!/bin/bash

set -e

# Helper functions for random values
gen_hex() { openssl rand -hex "$1"; }
gen_str() { openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"; }

# Pre-generate all needed random values
ENCRYPTION_KEY=$(gen_hex 16) # 32 hex chars
ENCRYPTION_JWT_SECRET=$(gen_hex 32) # 64 hex chars
BACKEND_SECRET=$(gen_str 32)
SOKETI_APP_ID=$(gen_str 12)
SOKETI_KEY=$(gen_str 24)
SOKETI_SECRET=$(gen_str 32)
BULLBOARD_PASSWORD=$(gen_str 16)
PM2_SECRET=$(gen_str 32)
FIREBASE_SIGNER_KEY=$(openssl rand -base64 64)
FIREBASE_SALT_SEPARATOR=$(openssl rand -base64 16)

# Prompt for values
read -p "Enter value for APP_URL: " APP_URL
read -p "Enter value for EXPOSED_PORT [80]: " EXPOSED_PORT
EXPOSED_PORT="${EXPOSED_PORT:-80}"

# Set ETHERNAL_HOST and VITE_MAIN_DOMAIN based on EXPOSED_PORT
if [ "$EXPOSED_PORT" = "80" ]; then
  ETHERNAL_HOST="$APP_URL"
else
  ETHERNAL_HOST="$APP_URL:$EXPOSED_PORT"
fi

# Output backend.env run/.env.prod
BACKEND_ENV_CONTENT="ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_JWT_SECRET=$ENCRYPTION_JWT_SECRET
SECRET=$BACKEND_SECRET
CORS_DOMAIN=*
NODE_ENV=production
REDIS_URL=redis://redis:6379
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ethernal
DB_PORT=5432
SOKETI_DEFAULT_APP_ID=default-app
SOKETI_DEFAULT_APP_KEY=$SOKETI_KEY
SOKETI_DEFAULT_APP_SECRET=$SOKETI_SECRET
SOKETI_HOST=soketi
SOKETI_PORT=6001
BULLBOARD_USERNAME=ethernal
BULLBOARD_PASSWORD=$BULLBOARD_PASSWORD
APP_DOMAIN=$ETHERNAL_HOST
FIREBASE_SIGNER_KEY="$FIREBASE_SIGNER_KEY"
FIREBASE_SALT_SEPARATOR="$FIREBASE_SALT_SEPARATOR"
FIREBASE_ROUNDS=8
FIREBASE_MEM_COST=14
APP_URL=$APP_URL
PORT=8888"

# Write backend env to run/.env.prod
printf "%s\n" "$BACKEND_ENV_CONTENT" > run/.env.prod

mkdir -p run pm2-server
# Output pm2.env to pm2-server/.env.prod
PM2_ENV_CONTENT="SECRET=$PM2_SECRET
ETHERNAL_SECRET=$BACKEND_SECRET
ETHERNAL_REDIS_URL=redis://redis:6379/0
ETHERNAL_HOST=$ETHERNAL_HOST"
printf "%s\n" "$PM2_ENV_CONTENT" > pm2-server/.env.prod

# Output nginx env to .env.nginx.prod
printf "EXPOSED_PORT=%s\n" "$EXPOSED_PORT" > .env.nginx.prod

# Output postgres env to .env.postgres.prod
POSTGRES_ENV_CONTENT="POSTGRES_HOST=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ethernal
POSTGRES_PORT=5432"
printf "%s\n" "$POSTGRES_ENV_CONTENT" > .env.postgres.prod
