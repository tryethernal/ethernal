#!/usr/bin/env bash

set -e

command -v openssl >/dev/null 2>&1 || { echo >&2 "openssl is required but not installed."; exit 1; }

# Helper functions for random values
gen_hex() { openssl rand -hex "$1"; }
gen_str() { openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"; }

# Parse arguments
dry_run=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    dry_run=true
  fi
done

# Pre-generate all needed random values
ENCRYPTION_KEY=$(gen_hex 16) # 32 hex chars
ENCRYPTION_JWT_SECRET=$(gen_hex 32) # 64 hex chars
BACKEND_SECRET=$(gen_str 32)
SOKETI_SECRET=$(gen_str 32)
BULLBOARD_PASSWORD=$(gen_str 16)
PM2_SECRET=$(gen_str 32)
FIREBASE_SIGNER_KEY=$(openssl rand -base64 64 | sed 's/"/\\"/g')
FIREBASE_SALT_SEPARATOR=$(openssl rand -base64 16 | sed 's/"/\\"/g')
POSTGRES_HOST="postgres"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB="ethernal"

# Generate md5-hashed password for PgBouncer (md5 + md5(PASSWORD + USERNAME))
HASH_INPUT="${POSTGRES_PASSWORD}${POSTGRES_USER}"
HASHED_PASS="md5$(echo -n "$HASH_INPUT" | md5sum | awk '{print $1}')"

# Prompt for values
read -p "Enter value for APP_URL: " APP_URL
# Strip http:// or https:// from APP_URL if present
APP_URL=${APP_URL#http://}
APP_URL=${APP_URL#https://}
read -p "Enter value for EXPOSED_PORT [80]: " EXPOSED_PORT
EXPOSED_PORT="${EXPOSED_PORT:-80}"

# Set ETHERNAL_HOST based on EXPOSED_PORT
if [ "$EXPOSED_PORT" = "80" ]; then
  ETHERNAL_HOST="$APP_URL"
else
  ETHERNAL_HOST="$APP_URL:$EXPOSED_PORT"
fi

# Compose env file contents
BACKEND_ENV_CONTENT="ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_JWT_SECRET=$ENCRYPTION_JWT_SECRET
SECRET=$BACKEND_SECRET
CORS_DOMAIN=*
NODE_ENV=production
REDIS_URL=redis://redis:6379
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD
DB_NAME=$POSTGRES_DB
DB_HOST=pgbouncer
DB_PORT=5433
SOKETI_DEFAULT_APP_ID=default-app
SOKETI_DEFAULT_APP_KEY=app-key
SOKETI_DEFAULT_APP_SECRET=$SOKETI_SECRET
SOKETI_HOST=soketi
SOKETI_PORT=6001
PM2_HOST=pm2:9090
PM2_SECRET=$PM2_SECRET
BULLBOARD_USERNAME=ethernal
BULLBOARD_PASSWORD=$BULLBOARD_PASSWORD
APP_DOMAIN=$ETHERNAL_HOST
FIREBASE_SIGNER_KEY="\"$FIREBASE_SIGNER_KEY\""
FIREBASE_SALT_SEPARATOR="\"$FIREBASE_SALT_SEPARATOR\""
FIREBASE_ROUNDS=8
FIREBASE_MEM_COST=14
APP_URL=$APP_URL
SELF_HOSTED=true
PORT=8888
DEFAULT_PLAN_SLUG=self-hosted"

PM2_ENV_CONTENT="SECRET=$PM2_SECRET
ETHERNAL_SECRET=$BACKEND_SECRET
PORT=9090
ETHERNAL_REDIS_URL=redis://redis:6379/0
ETHERNAL_HOST=backend:8888"

POSTGRES_ENV_CONTENT="POSTGRES_HOST=postgres
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB
POSTGRES_PORT=5432"

PGBOUNCER_ENV_CONTENT="PGBOUNCER_USER=$POSTGRES_USER
PGBOUNCER_PASSWORD=$POSTGRES_PASSWORD"

PGBOUNCER_USERLIST_CONTENT="\"${POSTGRES_USER}\" \"${HASHED_PASS}\""

PGBOUNCER_INIT_CONTENT="[databases]
${POSTGRES_DB} = host=postgres port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}
postgres = host=postgres port=5432 dbname=postgres user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5433
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = ${POSTGRES_USER}
pool_mode = session"

append_to_gitignore() {
  local paths=(
    "run/.env.prod"
    "pm2-server/.env.prod"
    ".env.docker-compose.prod"
    ".env.postgres.prod"
    "pgbouncer/.env.pgbouncer.prod"
    "pgbouncer/userlist.txt"
    "pgbouncer/pgbouncer.ini"
  )
  for path in "${paths[@]}"; do
    grep -qxF "$path" .gitignore 2>/dev/null || echo "$path" >> .gitignore
  done
  echo "Updated .gitignore with env/config files."
}

# Output functions
output_backend_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- run/.env.prod ---\n'
    printf "%s\n" "$BACKEND_ENV_CONTENT"
    echo "Printed run/.env.prod (dry run)"
  else
    mkdir -p run
    printf "%s\n" "$BACKEND_ENV_CONTENT" > run/.env.prod
    echo "Wrote run/.env.prod"
  fi
}

output_pm2_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pm2-server/.env.prod ---\n'
    printf "%s\n" "$PM2_ENV_CONTENT"
    echo "Printed pm2-server/.env.prod (dry run)"
  else
    mkdir -p pm2-server
    printf "%s\n" "$PM2_ENV_CONTENT" > pm2-server/.env.prod
    echo "Wrote pm2-server/.env.prod"
  fi
}

output_docker_compose_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- .env.docker-compose.prod ---\n'
    printf "EXPOSED_PORT=%s\n" "$EXPOSED_PORT"
    echo "Printed .env.docker-compose.prod (dry run)"
  else
    printf "EXPOSED_PORT=%s\n" "$EXPOSED_PORT" > .env.docker-compose.prod
    echo "Wrote .env.docker-compose.prod"
  fi
}

output_postgres_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- .env.postgres.prod ---\n'
    printf "%s\n" "$POSTGRES_ENV_CONTENT"
    echo "Printed .env.postgres.prod (dry run)"
  else
    printf "%s\n" "$POSTGRES_ENV_CONTENT" > .env.postgres.prod
    echo "Wrote .env.postgres.prod"
  fi
}

output_pgbouncer_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/.env.pgbouncer.prod ---\n'
    printf "%s\n" "$PGBOUNCER_ENV_CONTENT"
    echo "Printed pgbouncer/.env.pgbouncer.prod (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_ENV_CONTENT" > pgbouncer/.env.pgbouncer.prod
    echo "Wrote pgbouncer/.env.pgbouncer.prod"
  fi
}

output_pgbouncer_userlist() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/userlist.txt ---\n'
    printf "%s\n" "$PGBOUNCER_USERLIST_CONTENT"
    echo "Printed pgbouncer/userlist.txt (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_USERLIST_CONTENT" > pgbouncer/userlist.txt
    echo "Wrote pgbouncer/userlist.txt"
  fi
}

output_pgbouncer_ini() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/pgbouncer.ini ---\n'
    printf "%s\n" "$PGBOUNCER_INIT_CONTENT"
    echo "Printed pgbouncer/pgbouncer.ini (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_INIT_CONTENT" > pgbouncer/pgbouncer.ini
    echo "Wrote pgbouncer/pgbouncer.ini"
  fi
}

# Main output
output_backend_env
output_pm2_env
output_docker_compose_env
output_postgres_env
output_pgbouncer_env
output_pgbouncer_userlist
output_pgbouncer_ini

if [ "$dry_run" = false ]; then
  append_to_gitignore
fi

